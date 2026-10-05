import React, { useRef } from 'react'
import Editor, { OnMount } from '@monaco-editor/react'
import type * as Monaco from 'monaco-editor'
import { useEditorStore } from '../../store/editorStore'

interface SqlEditorProps {
  onRun: () => void
  onExplain: () => void
}

export const SqlEditor: React.FC<SqlEditorProps> = ({ onRun, onExplain }) => {
  const { getActiveTab, updateSql } = useEditorStore()
  const activeTab = getActiveTab()
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null)

  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor

    // Keyboard shortcut: Ctrl+Enter / Cmd+Enter => Run Query
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onRun()
    })

    // Keyboard shortcut: Ctrl+E / Cmd+E => Explain Plan
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyE, () => {
      onExplain()
    })

    // Register PostgreSQL & pgvector keywords completion
    monaco.languages.registerCompletionItemProvider('sql', {
      provideCompletionItems: (model: Monaco.editor.ITextModel, position: Monaco.Position) => {
        const word = model.getWordUntilPosition(position)
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        }

        const pgKeywords = [
          'CREATE EXTENSION IF NOT EXISTS vector;',
          'vector',
          'hnsw',
          'ivfflat',
          'cosine_similarity',
          'vector_l2_ops',
          'vector_cosine_ops',
          'vector_ip_ops',
          'EXPLAIN (ANALYZE, COSTS, VERBOSE, BUFFERS, FORMAT JSON)',
          'SELECT',
          'INSERT INTO',
          'CREATE TABLE',
          'CREATE INDEX',
          'ALTER TABLE',
          'DROP TABLE',
          'ORDER BY',
          'LIMIT',
          'WHERE',
          'GROUP BY',
          'HAVING',
          'JOIN',
          'LEFT JOIN',
          'CROSS JOIN',
        ]

        const suggestions = pgKeywords.map((k) => ({
          label: k,
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: k,
          range,
        }))

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
          padding: { top: 8, bottom: 8 },
        }}
      />
    </div>
  )
}
