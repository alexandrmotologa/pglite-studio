import React from 'react'
import { Table, Network, ScatterChart, Terminal, GitFork } from 'lucide-react'
import { useUIStore } from '../../store/uiStore'
import { useDbStore } from '../../store/dbStore'
import { Badge } from '../UI/Badge'

export const ResultTabs: React.FC = () => {
  const { activeResultTab, setActiveResultTab } = useUIStore()
  const { activeResult, activeExplain, logs, catalog } = useDbStore()

  const hasVectors = !!activeResult?.hasVectorColumn
  const rowCount = activeResult?.rowCount ?? 0
  const hasExplain = !!activeExplain
  const tableCount = catalog?.tables.length ?? 0

  return (
    <div className="h-9 bg-slate-950 border-b border-slate-800/80 px-2 sm:px-3 flex items-center justify-between shrink-0 select-none overflow-x-auto no-scrollbar">
      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
        {/* Table View */}
        <button
          data-tab="table"
          onClick={() => setActiveResultTab('table')}
          className={`h-7 px-2 sm:px-3 flex items-center gap-1 sm:gap-1.5 rounded-t-md text-xs cursor-pointer border-t-2 transition-all shrink-0 ${
            activeResultTab === 'table'
              ? 'bg-slate-900 text-slate-100 border-cyan-400 font-medium'
              : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/60'
          }`}
        >
          <Table size={13} className={activeResultTab === 'table' ? 'text-cyan-400' : 'text-slate-500'} />
          <span className="hidden sm:inline">Data Grid</span>
          <span className="sm:hidden">Grid</span>
          {activeResult && (
            <Badge variant="slate" size="xs">
              {rowCount}
            </Badge>
          )}
        </button>

        {/* Visual Explain Plan */}
        <button
          data-tab="explain"
          onClick={() => setActiveResultTab('explain')}
          className={`h-7 px-2 sm:px-3 flex items-center gap-1 sm:gap-1.5 rounded-t-md text-xs cursor-pointer border-t-2 transition-all shrink-0 ${
            activeResultTab === 'explain'
              ? 'bg-slate-900 text-slate-100 border-indigo-400 font-medium'
              : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/60'
          }`}
        >
          <Network
            size={13}
            className={activeResultTab === 'explain' ? 'text-indigo-400' : 'text-slate-500'}
          />
          <span className="hidden sm:inline">Visual EXPLAIN</span>
          <span className="sm:hidden">Plan</span>
          {hasExplain && (
            <Badge variant="indigo" size="xs">
              DAG
            </Badge>
          )}
        </button>

        {/* Vector Embedding Visualizer */}
        <button
          data-tab="vector"
          onClick={() => setActiveResultTab('vector')}
          className={`h-7 px-2 sm:px-3 flex items-center gap-1 sm:gap-1.5 rounded-t-md text-xs cursor-pointer border-t-2 transition-all shrink-0 ${
            activeResultTab === 'vector'
              ? 'bg-slate-900 text-slate-100 border-cyan-400 font-medium'
              : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/60'
          }`}
        >
          <ScatterChart
            size={13}
            className={activeResultTab === 'vector' ? 'text-cyan-400' : 'text-slate-500'}
          />
          <span className="hidden sm:inline">2D/3D Vector Scatter</span>
          <span className="sm:hidden">Vectors</span>
          {hasVectors && (
            <Badge variant="cyan" size="xs">
              PCA
            </Badge>
          )}
        </button>

        {/* Entity Relationship Diagram */}
        <button
          data-tab="erd"
          onClick={() => setActiveResultTab('erd')}
          className={`h-7 px-2 sm:px-3 flex items-center gap-1 sm:gap-1.5 rounded-t-md text-xs cursor-pointer border-t-2 transition-all shrink-0 ${
            activeResultTab === 'erd'
              ? 'bg-slate-900 text-slate-100 border-emerald-400 font-medium'
              : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/60'
          }`}
        >
          <GitFork
            size={13}
            className={activeResultTab === 'erd' ? 'text-emerald-400' : 'text-slate-500'}
          />
          <span className="hidden sm:inline">ER Diagram</span>
          <span className="sm:hidden">ERD</span>
          {tableCount > 0 && (
            <Badge variant="emerald" size="xs">
              {tableCount}
            </Badge>
          )}
        </button>

        {/* Messages / Console Logs */}
        <button
          data-tab="messages"
          onClick={() => setActiveResultTab('messages')}
          className={`h-7 px-2 sm:px-3 flex items-center gap-1 sm:gap-1.5 rounded-t-md text-xs cursor-pointer border-t-2 transition-all shrink-0 ${
            activeResultTab === 'messages'
              ? 'bg-slate-900 text-slate-100 border-amber-400 font-medium'
              : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/60'
          }`}
        >
          <Terminal
            size={13}
            className={activeResultTab === 'messages' ? 'text-amber-400' : 'text-slate-500'}
          />
          <span className="hidden sm:inline">Messages</span>
          <span className="sm:hidden">Logs</span>
          {logs.length > 0 && (
            <Badge variant="slate" size="xs">
              {logs.length}
            </Badge>
          )}
        </button>
      </div>
    </div>
  )
}

export default ResultTabs
