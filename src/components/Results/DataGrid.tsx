import React, { useState, useMemo } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  ColumnDef,
  flexRender,
  SortingState,
} from '@tanstack/react-table'
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Download,
  Check,
  Search,
  ChevronLeft,
  ChevronRight,
  Database,
  FileSpreadsheet,
  FileJson,
  Undo2,
  Save,
} from 'lucide-react'
import { useDbStore } from '../../store/dbStore'
import { useUIStore } from '../../store/uiStore'
import { Button } from '../UI/Button'

interface StagedEdit {
  rowIdx: number
  rowIdVal: unknown
  col: string
  oldVal: unknown
  newVal: string
}

export const DataGrid: React.FC = () => {
  const { activeResult, lastExecutionMs, runQuery, refreshCatalog } = useDbStore()
  const { setJsonInspector } = useUIStore()

  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [copiedCell, setCopiedCell] = useState<string | null>(null)

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{
    rowIdx: number
    colName: string
    currentVal: string
  } | null>(null)
  const [stagedEdits, setStagedEdits] = useState<StagedEdit[]>([])
  const [isApplyingEdits, setIsApplyingEdits] = useState(false)

  // Helper to test if string is JSON
  const tryParseJson = (val: unknown): unknown | null => {
    if (typeof val === 'object' && val !== null) return val
    if (typeof val === 'string') {
      const trimmed = val.trim()
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          return JSON.parse(trimmed)
        } catch {
          return null
        }
      }
    }
    return null
  }

  const columns = useMemo<ColumnDef<Record<string, unknown>>[]>(() => {
    if (!activeResult || activeResult.columns.length === 0) return []
    return activeResult.columns.map((colName) => ({
      accessorKey: colName,
      header: colName,
      cell: (info) => {
        const val = info.getValue()
        const parsedJson = tryParseJson(val)

        if (parsedJson !== null) {
          return (
            <div className="flex items-center gap-1.5 min-w-0">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setJsonInspector(true, { title: colName, json: parsedJson })
                }}
                className="px-1.5 py-0.5 bg-amber-950/80 text-amber-300 hover:bg-amber-900 border border-amber-800/80 rounded text-[10px] font-mono flex items-center gap-1 shrink-0"
                title="Open interactive JSON Inspector"
              >
                <FileJson size={11} />
                JSON
              </button>
              <span className="font-mono text-xs text-amber-300/80 truncate">
                {typeof val === 'object' ? JSON.stringify(val) : String(val)}
              </span>
            </div>
          )
        }

        if (val === null || val === undefined) {
          return <span className="text-slate-500 italic font-mono text-xs">null</span>
        }
        if (typeof val === 'boolean') {
          return (
            <span
              className={`font-mono text-xs px-1.5 py-0.5 rounded ${
                val ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
              }`}
            >
              {String(val)}
            </span>
          )
        }
        return <span className="font-mono text-xs text-slate-200">{String(val)}</span>
      },
    }))
  }, [activeResult, setJsonInspector])

  const table = useReactTable({
    data: activeResult?.rows ?? [],
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    initialState: {
      pagination: {
        pageSize: 50,
      },
    },
  })

  const handleCopyCell = (val: unknown, cellId: string) => {
    const text = typeof val === 'object' ? JSON.stringify(val) : String(val ?? '')
    navigator.clipboard.writeText(text)
    setCopiedCell(cellId)
    setTimeout(() => setCopiedCell(null), 1500)
  }

  const exportCsv = () => {
    if (!activeResult || activeResult.rows.length === 0) return
    const headers = activeResult.columns.join(',')
    const rows = activeResult.rows.map((r) =>
      activeResult.columns
        .map((c) => {
          const val = r[c]
          if (val === null || val === undefined) return ''
          const str = typeof val === 'object' ? JSON.stringify(val) : String(val)
          return `"${str.replace(/"/g, '""')}"`
        })
        .join(',')
    )
    const csvContent = [headers, ...rows].join('\n')
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `query_result_${Date.now()}.csv`
    a.click()
  }

  const exportJson = () => {
    if (!activeResult || activeResult.rows.length === 0) return
    const blob = new Blob([JSON.stringify(activeResult.rows, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `query_result_${Date.now()}.json`
    a.click()
  }

  const handleCommitInlineEdit = () => {
    if (!editingCell || !activeResult) return
    const row = activeResult.rows[editingCell.rowIdx]
    const oldVal = row ? row[editingCell.colName] : null
    const rowIdVal = row ? (row['id'] ?? row['ID'] ?? row['_id']) : null

    if (String(oldVal ?? '') !== editingCell.currentVal) {
      setStagedEdits((prev) => [
        ...prev.filter(
          (e) => !(e.rowIdx === editingCell.rowIdx && e.col === editingCell.colName)
        ),
        {
          rowIdx: editingCell.rowIdx,
          rowIdVal,
          col: editingCell.colName,
          oldVal,
          newVal: editingCell.currentVal,
        },
      ])
    }
    setEditingCell(null)
  }

  const handleApplyStagedEdits = async () => {
    if (stagedEdits.length === 0 || !activeResult) return
    setIsApplyingEdits(true)

    try {
      // Find table name if possible from command or active table
      const statements: string[] = []
      for (const edit of stagedEdits) {
        if (edit.rowIdVal !== undefined && edit.rowIdVal !== null) {
          // If we have an id column, we can generate a safe UPDATE
          const valSql = isNaN(Number(edit.newVal))
            ? `'${edit.newVal.replace(/'/g, "''")}'`
            : edit.newVal

          statements.push(
            `-- Staged inline edit\nUPDATE documents SET "${edit.col}" = ${valSql} WHERE id = ${edit.rowIdVal};`
          )
        }
      }

      if (statements.length > 0) {
        await runQuery(statements.join('\n'))
        await refreshCatalog()
        setStagedEdits([])
      } else {
        alert('Inline UPDATE requires an identifiable primary key or "id" column in the query result.')
      }
    } catch (err) {
      alert(`Failed to apply staged updates: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsApplyingEdits(false)
    }
  }

  if (!activeResult) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2 p-4 select-none">
        <Database size={32} className="text-slate-600" />
        <p className="text-sm">No query results yet</p>
        <p className="text-xs text-slate-600">
          Write a SQL query in the editor and click <span className="text-cyan-400 font-mono">Run</span> or press{' '}
          <kbd className="px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-slate-400">Ctrl+Enter</kbd>
        </p>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden">
      {/* Table Toolbar */}
      <div className="h-9 px-3 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={12} className="absolute left-2.5 top-2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              value={globalFilter ?? ''}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Filter results..."
              className="pl-7 pr-2 py-0.5 text-xs bg-slate-950 border border-slate-800 text-slate-200 placeholder-slate-500 rounded focus:outline-none focus:border-cyan-500 w-44"
            />
          </div>
          <span className="text-xs text-slate-400">
            {activeResult.rowCount.toLocaleString()} {activeResult.rowCount === 1 ? 'row' : 'rows'}
            {lastExecutionMs !== null && (
              <span className="text-slate-500 ml-1">in {lastExecutionMs}ms</span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="xs"
            icon={<FileSpreadsheet size={12} />}
            onClick={exportCsv}
            title="Download CSV"
          >
            CSV
          </Button>
          <Button
            variant="ghost"
            size="xs"
            icon={<Download size={12} />}
            onClick={exportJson}
            title="Download JSON"
          >
            JSON
          </Button>
        </div>
      </div>

      {/* Virtual Table Scroll Area */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-900/90 sticky top-0 z-10 border-b border-slate-800">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                <th className="w-10 px-2 py-1.5 text-[11px] font-mono text-slate-500 border-r border-slate-800/80 text-center select-none">
                  #
                </th>
                {headerGroup.headers.map((header) => {
                  const isSorted = header.column.getIsSorted()
                  return (
                    <th
                      key={header.id}
                      onClick={header.column.getToggleSortingHandler()}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-300 border-r border-slate-800/80 cursor-pointer hover:bg-slate-800/80 select-none transition-colors"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate">
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </span>
                        <span className="text-slate-500 shrink-0">
                          {isSorted === 'asc' ? (
                            <ArrowUp size={12} className="text-cyan-400" />
                          ) : isSorted === 'desc' ? (
                            <ArrowDown size={12} className="text-cyan-400" />
                          ) : (
                            <ArrowUpDown size={11} className="opacity-40" />
                          )}
                        </span>
                      </div>
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {table.getRowModel().rows.map((row, rowIdx) => (
              <tr key={row.id} className="hover:bg-slate-900/50 transition-colors group">
                <td className="px-2 py-1 text-[11px] font-mono text-slate-600 border-r border-slate-800/60 text-center select-none">
                  {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + rowIdx + 1}
                </td>
                {row.getVisibleCells().map((cell) => {
                  const cellId = `${row.id}_${cell.column.id}`
                  const isCopied = copiedCell === cellId
                  const isEditing =
                    editingCell?.rowIdx === rowIdx && editingCell?.colName === cell.column.id

                  return (
                    <td
                      key={cell.id}
                      onClick={() => handleCopyCell(cell.getValue(), cellId)}
                      onDoubleClick={(e) => {
                        e.stopPropagation()
                        const rawVal = cell.getValue()
                        setEditingCell({
                          rowIdx,
                          colName: cell.column.id,
                          currentVal: String(rawVal ?? ''),
                        })
                      }}
                      className="px-3 py-1 text-xs border-r border-slate-800/60 truncate max-w-xs cursor-pointer hover:bg-slate-800/70 relative transition-colors"
                      title="Click to copy, double-click to edit"
                    >
                      {isEditing ? (
                        <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1">
                          <input
                            type="text"
                            autoFocus
                            value={editingCell.currentVal}
                            onChange={(e) =>
                              setEditingCell({
                                ...editingCell,
                                currentVal: e.target.value,
                              })
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCommitInlineEdit()
                              if (e.key === 'Escape') setEditingCell(null)
                            }}
                            onBlur={handleCommitInlineEdit}
                            className="w-full bg-slate-950 text-slate-100 px-1 py-0.5 text-xs rounded border border-cyan-400 outline-none font-mono"
                          />
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </div>
                          {isCopied && (
                            <span className="text-[10px] text-cyan-400 font-sans flex items-center gap-0.5 shrink-0 bg-slate-900 px-1 rounded shadow">
                              <Check size={10} /> Copied
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Staged Changes Action Bar */}
      {stagedEdits.length > 0 && (
        <div className="h-10 bg-cyan-950/90 border-t border-cyan-800/80 px-4 flex items-center justify-between shrink-0 select-none text-xs">
          <div className="flex items-center gap-2 text-cyan-300">
            <span className="font-semibold">{stagedEdits.length} staged change(s)</span>
            <span className="text-cyan-400/70">• Double-click cells to modify values</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="xs"
              icon={<Undo2 size={12} />}
              onClick={() => setStagedEdits([])}
              disabled={isApplyingEdits}
            >
              Discard
            </Button>
            <Button
              variant="primary"
              size="xs"
              icon={<Save size={12} />}
              onClick={handleApplyStagedEdits}
              disabled={isApplyingEdits}
            >
              {isApplyingEdits ? 'Applying...' : 'Apply Changes'}
            </Button>
          </div>
        </div>
      )}

      {/* Pagination Footer */}
      {table.getPageCount() > 1 && (
        <div className="h-9 px-3 border-t border-slate-800/80 bg-slate-900/80 flex items-center justify-between shrink-0 select-none text-xs text-slate-400">
          <div>
            Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="p-1 text-slate-400 hover:text-slate-100 disabled:opacity-30 disabled:pointer-events-none rounded hover:bg-slate-800"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="p-1 text-slate-400 hover:text-slate-100 disabled:opacity-30 disabled:pointer-events-none rounded hover:bg-slate-800"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
