import React, { useState } from 'react'
import {
  Table2,
  Key,
  Link2,
  Search,
  RefreshCw,
  PlusCircle,
  Play,
  Trash2,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Layers,
  Box,
  Binary,
  X,
} from 'lucide-react'
import { useDbStore } from '../../store/dbStore'
import { useEditorStore } from '../../store/editorStore'
import { useUIStore } from '../../store/uiStore'
import { TableSchema, ColumnMeta } from '../../types/database'
import { Badge } from '../UI/Badge'

export const Sidebar: React.FC = () => {
  const { catalog, refreshCatalog, runQuery } = useDbStore()
  const { addTab } = useEditorStore()
  const { setMockModalOpen, toggleSidebar } = useUIStore()

  const [search, setSearch] = useState('')
  const [expandedTables, setExpandedTables] = useState<Record<string, boolean>>({})
  const [isRefreshing, setIsRefreshing] = useState(false)

  const toggleTable = (tableName: string) => {
    setExpandedTables((prev) => ({ ...prev, [tableName]: !prev[tableName] }))
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refreshCatalog()
    setIsRefreshing(false)
  }

  const handleSelectTable = (table: TableSchema) => {
    const sql = `SELECT * FROM "${table.name}" LIMIT 50;`
    addTab(`${table.name}.sql`, sql)
    if (window.innerWidth < 768) {
      toggleSidebar()
    }
  }

  const handleInsertTemplate = (table: TableSchema) => {
    const cols = table.columns.filter((c) => !c.isPrimaryKey || !c.dataType.includes('serial'))
    const colNames = cols.map((c) => `"${c.name}"`).join(', ')
    const placeholders = cols
      .map((c) => (c.isVector ? `'[0.1, 0.2, 0.3]'` : `'value'`))
      .join(', ')
    const sql = `INSERT INTO "${table.name}" (${colNames})\nVALUES (${placeholders});`
    addTab(`insert_${table.name}.sql`, sql)
    if (window.innerWidth < 768) {
      toggleSidebar()
    }
  }

  const handleDropTable = async (table: TableSchema) => {
    if (confirm(`Are you sure you want to drop table "${table.name}"?`)) {
      await runQuery(`DROP TABLE "${table.name}" CASCADE;`)
    }
  }

  const filteredTables = (catalog?.tables || []).filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.columns.some((c) => c.name.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <aside className="fixed md:static inset-y-0 left-0 z-40 w-72 md:w-68 max-w-[85vw] h-full bg-slate-950/98 md:bg-slate-950 backdrop-blur-md md:backdrop-blur-none border-r border-slate-800/80 flex flex-col shrink-0 overflow-hidden select-none shadow-2xl md:shadow-none animate-in slide-in-from-left duration-150 md:animate-none">
      {/* Search & Refresh bar + Mobile Close button */}
      <div className="p-2.5 border-b border-slate-800/80 flex items-center gap-1.5 bg-slate-950">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-2.5 top-2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter tables & columns..."
            className="w-full pl-7 pr-2 py-1 text-xs bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 rounded focus:outline-none focus:border-cyan-500"
          />
        </div>
        <button
          onClick={handleRefresh}
          className={`p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-900 rounded transition-colors ${
            isRefreshing ? 'animate-spin text-cyan-400' : ''
          }`}
          title="Refresh schema catalog"
        >
          <RefreshCw size={13} />
        </button>
        <button
          onClick={toggleSidebar}
          className="md:hidden p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-900 rounded transition-colors"
          title="Close schema sidebar"
        >
          <X size={14} />
        </button>
      </div>

      {/* Schema / Tables Section */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <Layers size={12} className="text-cyan-500" />
            <span>Tables ({filteredTables.length})</span>
          </div>
        </div>

        {filteredTables.length === 0 ? (
          <div className="px-3 py-6 text-center text-xs text-slate-500">
            {search ? 'No matching tables' : 'No user tables created yet.'}
          </div>
        ) : (
          filteredTables.map((table) => {
            const isExpanded = !!expandedTables[table.name]
            const hasVector = table.columns.some((c) => c.isVector)

            return (
              <div
                key={table.name}
                className="rounded-md border border-slate-800/40 bg-slate-900/40 overflow-hidden"
              >
                {/* Table Header Row */}
                <div
                  className="flex items-center justify-between px-2 py-1.5 hover:bg-slate-800/60 cursor-pointer group transition-colors"
                  onClick={() => toggleTable(table.name)}
                >
                  <div className="flex items-center gap-1.5 truncate">
                    {isExpanded ? (
                      <ChevronDown size={13} className="text-slate-500 shrink-0" />
                    ) : (
                      <ChevronRight size={13} className="text-slate-500 shrink-0" />
                    )}
                    <Table2
                      size={13}
                      className={hasVector ? 'text-cyan-400 shrink-0' : 'text-slate-400 shrink-0'}
                    />
                    <span className="text-xs font-medium text-slate-200 truncate">{table.name}</span>
                  </div>

                  {/* Actions on hover */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleSelectTable(table)
                      }}
                      title="SELECT * (Limit 50)"
                      className="p-1 text-slate-400 hover:text-cyan-400 hover:bg-slate-700/60 rounded"
                    >
                      <Play size={11} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setMockModalOpen(true, table.name)
                      }}
                      title="Generate Synthetic Rows"
                      className="p-1 text-slate-400 hover:text-emerald-400 hover:bg-slate-700/60 rounded"
                    >
                      <Sparkles size={11} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDropTable(table)
                      }}
                      title="Drop Table"
                      className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 rounded"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>

                {/* Columns & Indexes List */}
                {isExpanded && (
                  <div className="px-2.5 py-1.5 bg-slate-950/70 border-t border-slate-800/60 space-y-1">
                    {table.columns.map((col) => (
                      <div
                        key={col.name}
                        className="flex items-center justify-between text-[11px] py-0.5 text-slate-300"
                      >
                        <div className="flex items-center gap-1.5 truncate">
                          {col.isPrimaryKey ? (
                            <Key size={11} className="text-amber-400 shrink-0" />
                          ) : col.isForeignKey ? (
                            <Link2 size={11} className="text-indigo-400 shrink-0" />
                          ) : col.isVector ? (
                            <Binary size={11} className="text-cyan-400 shrink-0" />
                          ) : (
                            <div className="w-2.5 h-2.5 rounded-full bg-slate-700/60 shrink-0" />
                          )}
                          <span className="truncate">{col.name}</span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500 shrink-0">
                          {col.dataType}
                        </span>
                      </div>
                    ))}

                    {/* Indexes */}
                    {table.indexes.length > 0 && (
                      <div className="pt-1 border-t border-slate-800/50">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wide">
                          Indexes:
                        </span>
                        {table.indexes.map((idx) => (
                          <div
                            key={idx.name}
                            className="flex items-center justify-between text-[10px] py-0.5 text-slate-400"
                          >
                            <span className="truncate">{idx.name}</span>
                            <Badge variant={idx.indexType === 'hnsw' ? 'cyan' : 'slate'} size="xs">
                              {idx.indexType.toUpperCase()}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Quick generation links */}
                    <div className="pt-1.5 flex items-center gap-1.5 border-t border-slate-800/50 text-[10px]">
                      <button
                        onClick={() => handleInsertTemplate(table)}
                        className="text-cyan-400 hover:underline"
                      >
                        + Insert Template
                      </button>
                      <span className="text-slate-600">|</span>
                      <button
                        onClick={() => setMockModalOpen(true, table.name)}
                        className="text-emerald-400 hover:underline"
                      >
                        Mock Rows
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })
        )}

        {/* Extensions Installed Section */}
        {catalog?.extensions && (
          <div className="pt-3">
            <div className="px-2 py-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <Box size={12} className="text-indigo-400" />
              <span>Extensions</span>
            </div>
            <div className="space-y-1 mt-1">
              {catalog.extensions
                .filter((e) => e.installed)
                .map((ext) => (
                  <div
                    key={ext.name}
                    className="flex items-center justify-between px-2 py-1 text-xs text-slate-300 rounded hover:bg-slate-900"
                  >
                    <span>{ext.name}</span>
                    <Badge variant="cyan" size="xs">
                      v{ext.version}
                    </Badge>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
