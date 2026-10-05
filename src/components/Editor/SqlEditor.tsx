import React, { useRef, useEffect } from 'react'
import Editor, { OnMount } from '@monaco-editor/react'
import type * as Monaco from 'monaco-editor'
import { useEditorStore } from '../../store/editorStore'
import { useDbStore } from '../../store/dbStore'

interface SqlEditorProps {
  onRun: () => void
  onExplain: () => void
  onFormat: () => void
}

export const SqlEditor: React.FC<SqlEditorProps> = ({ onRun, onExplain, onFormat }) => {
  const { getActiveTab, updateSql, setSelectedText } = useEditorStore()
  const { catalog } = useDbStore()
  const activeTab = getActiveTab()

  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)
  const catalogRef = useRef(catalog)

  // Keep catalogRef synchronized with current database schema
  useEffect(() => {
    catalogRef.current = catalog
  }, [catalog])

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor

    // Track active text selection
    editor.onDidChangeCursorSelection((e) => {
      const model = editor.getModel()
      if (!model) return
      const selection = e.selection
      if (selection.isEmpty()) {
        setSelectedText('')
      } else {
        const text = model.getValueInRange(selection)
        setSelectedText(text)
      }
    })

    // Keyboard shortcut: Ctrl+Enter / Cmd+Enter => Run Query (or Selection)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onRun()
    })

    // Keyboard shortcut: Ctrl+E / Cmd+E => Explain Plan
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyE, () => {
      onExplain()
    })

    // Keyboard shortcut: Ctrl+Shift+F / Cmd+Shift+F => Format SQL
    editor.addCommand(
      monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyF,
      () => {
        onFormat()
      }
    )

    // Register Dynamic Schema-Aware & pgvector completion provider
    monaco.languages.registerCompletionItemProvider('sql', {
      triggerCharacters: ['.', ' '],
      provideCompletionItems: (model: Monaco.editor.ITextModel, position: Monaco.Position) => {
        const word = model.getWordUntilPosition(position)
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        }

        const lineUntilPosition = model.getLineContent(position.lineNumber).slice(0, position.column - 1)
        const currentCatalog = catalogRef.current

        // Check if user is typing `tableName.` or `alias.`
        const dotMatch = lineUntilPosition.match(/([a-zA-Z0-9_]+)\.$/)
        if (dotMatch) {
          const matchedTarget = dotMatch[1].toLowerCase()
          const matchedTable = currentCatalog?.tables.find(
            (t) => t.name.toLowerCase() === matchedTarget
          )

          if (matchedTable) {
            const columnSuggestions = matchedTable.columns.map((c) => ({
              label: c.name,
              kind: monaco.languages.CompletionItemKind.Field,
              detail: `${c.dataType}${c.isPrimaryKey ? ' [PK]' : ''}${c.isVector ? ' [vector]' : ''}`,
              insertText: c.name,
              range,
            }))
            return { suggestions: columnSuggestions }
          }
        }

        const suggestions: Monaco.languages.CompletionItem[] = []

        // 1. Suggest all tables from live catalog
        if (currentCatalog?.tables) {
          for (const tbl of currentCatalog.tables) {
            suggestions.push({
              label: tbl.name,
              kind: monaco.languages.CompletionItemKind.Class,
              detail: `Table (${tbl.columns.length} columns, ~${tbl.rowEstimate} rows)`,
              insertText: tbl.name,
              sortText: '0_' + tbl.name,
              range,
            })

            // Also add all columns globally with table qualification context
            for (const col of tbl.columns) {
              suggestions.push({
                label: col.name,
                kind: monaco.languages.CompletionItemKind.Field,
                detail: `${tbl.name}.${col.name} (${col.dataType})`,
                insertText: col.name,
                sortText: '1_' + col.name,
                range,
              })
            }
          }
        }

        // 2. pgvector specific functions, operators & snippets
        const vectorItems: Monaco.languages.CompletionItem[] = [
          {
            label: 'vector(dim)',
            kind: monaco.languages.CompletionItemKind.TypeParameter,
            detail: 'pgvector column type definition',
            insertText: 'vector(1536)',
            sortText: '2_vector',
            range,
          },
          {
            label: 'hnsw index snippet',
            kind: monaco.languages.CompletionItemKind.Snippet,
            detail: 'Create HNSW index on vector column',
            insertText: 'CREATE INDEX ON ${1:table} USING hnsw (${2:embedding} vector_cosine_ops) WITH (m = 16, ef_construction = 64);',
            insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
            sortText: '2_hnsw',
            range,
          },
          {
            label: 'cosine distance (<=>)',
            kind: monaco.languages.CompletionItemKind.Operator,
            detail: 'Calculate cosine distance between vectors',
            insertText: '<=>',
            sortText: '2_cosine_op',
            range,
          },
          {
            label: 'L2 distance (<->)',
            kind: monaco.languages.CompletionItemKind.Operator,
            detail: 'Calculate Euclidean L2 distance between vectors',
            insertText: '<->',
            sortText: '2_l2_op',
            range,
          },
          {
            label: 'inner product (<#>)',
            kind: monaco.languages.CompletionItemKind.Operator,
            detail: 'Calculate negative inner product between vectors',
            insertText: '<#>',
            sortText: '2_ip_op',
            range,
          },
          {
            label: 'EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS, FORMAT JSON)',
            kind: monaco.languages.CompletionItemKind.Snippet,
            detail: 'Full PostgreSQL execution plan with JSON output',
            insertText: 'EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS, FORMAT JSON)\n',
            sortText: '2_explain_json',
            range,
          },
        ]
        suggestions.push(...vectorItems)

        // 3. PostgreSQL core keywords
        const coreKeywords = [
          'SELECT', 'FROM', 'WHERE', 'AND', 'OR', 'INSERT INTO', 'VALUES',
          'UPDATE', 'SET', 'DELETE FROM', 'CREATE TABLE', 'DROP TABLE',
          'ALTER TABLE', 'CREATE INDEX', 'ORDER BY', 'GROUP BY', 'HAVING',
          'LIMIT', 'OFFSET', 'JOIN', 'LEFT JOIN', 'RIGHT JOIN', 'CROSS JOIN',
          'ON', 'WITH', 'UNION', 'UNION ALL', 'DISTINCT', 'RETURNING',
        ]

        for (const kw of coreKeywords) {
          suggestions.push({
            label: kw,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: kw,
            sortText: '3_' + kw,
            range,
          })
        }

        return { suggestions }
      },
    })
  }

  return (
    <div className="w-full h-full bg-[#1e1e1e] overflow-hidden">
      <Editor
        height="100%"
        language="sql"
        theme="vs-dark"
        value={activeTab.sql}
        onChange={(val) => updateSql(val || '')}
        onMount={handleEditorMount}
        options={{
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'on',
          lineDecorationsWidth: 4,
          fontFamily: "'Fira Code', 'Cascadia Code', Consolas, monospace",
          fontLigatures: true,
          renderLineHighlight: 'all',
          cursorBlinking: 'smooth',
          cursorSmoothCaretAnimation: 'on',
          smoothScrolling: true,
          suggestOnTriggerCharacters: true,
          quickSuggestions: { other: true, comments: false, strings: false },
          scrollbar: {
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
        }}
      />
    </div>
  )
}
