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
  Copy,
  Check,
  Search,
  ChevronLeft,
  ChevronRight,
  Database,
  FileSpreadsheet,
} from 'lucide-react'
import { useDbStore } from '../../store/dbStore'
import { Button } from '../UI/Button'

export const DataGrid: React.FC = () => {
  const { activeResult, lastExecutionMs } = useDbStore()
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [copiedCell, setCopiedCell] = useState<string | null>(null)

  const columns = useMemo<ColumnDef<Record<string, unknown>>[]>(() => {
    if (!activeResult || activeResult.columns.length === 0) return []
    return activeResult.columns.map((colName) => ({
      accessorKey: colName,
      header: colName,
      cell: (info) => {
        const val = info.getValue()
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
        if (typeof val === 'object') {
          return <span className="font-mono text-xs text-amber-300">{JSON.stringify(val)}</span>
        }
        return <span className="font-mono text-xs text-slate-200">{String(val)}</span>
      },
    }))
  }, [activeResult])

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

  if (!activeResult) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2 p-4 select-none">
        <Database size={32} className="text-slate-600" />
        <p className="text-sm">No query results yet</p>
        <p className="text-xs text-slate-600">
          Write a SQL query in the editor and click <span className="text-cyan-400 font-mono">Run</span> or press <kbd className="px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-slate-400">Ctrl+Enter</kbd>
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
                        <span className="truncate">{flexRender(header.column.columnDef.header, header.getContext())}</span>
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
              <tr
                key={row.id}
                className="hover:bg-slate-900/50 transition-colors group"
              >
                <td className="px-2 py-1 text-[11px] font-mono text-slate-600 border-r border-slate-800/60 text-center select-none">
                  {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + rowIdx + 1}
                </td>
                {row.getVisibleCells().map((cell) => {
                  const cellId = `${row.id}_${cell.column.id}`
                  const isCopied = copiedCell === cellId
                  return (
                    <td
                      key={cell.id}
                      onClick={() => handleCopyCell(cell.getValue(), cellId)}
                      className="px-3 py-1 text-xs border-r border-slate-800/60 truncate max-w-xs cursor-pointer hover:bg-slate-800/70 relative transition-colors"
                      title="Click to copy cell value"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate">{flexRender(cell.column.columnDef.cell, cell.getContext())}</div>
                        {isCopied && (
                          <span className="text-[10px] text-cyan-400 font-sans flex items-center gap-0.5 shrink-0 bg-slate-900 px-1 rounded shadow">
                            <Check size={10} /> Copied
                          </span>
                        )}
                      </div>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
