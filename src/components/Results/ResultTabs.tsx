import React from 'react'
import { Table, Network, ScatterChart, Terminal } from 'lucide-react'
import { useUIStore, ResultTabType } from '../../store/uiStore'
import { useDbStore } from '../../store/dbStore'
import { Badge } from '../UI/Badge'

export const ResultTabs: React.FC = () => {
  const { activeResultTab, setActiveResultTab } = useUIStore()
  const { activeResult, activeExplain, logs } = useDbStore()

  const hasVectors = !!activeResult?.hasVectorColumn
  const rowCount = activeResult?.rowCount ?? 0
  const hasExplain = !!activeExplain

  return (
    <div className="h-9 bg-slate-950 border-b border-slate-800/80 px-3 flex items-center justify-between shrink-0 select-none">
      <div className="flex items-center gap-1">
        {/* Table View */}
        <button
          onClick={() => setActiveResultTab('table')}
          className={`h-7 px-3 flex items-center gap-1.5 rounded-t-md text-xs cursor-pointer border-t-2 transition-all ${
            activeResultTab === 'table'
              ? 'bg-slate-900 text-slate-100 border-cyan-400 font-medium'
              : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/60'
          }`}
        >
          <Table size={13} className={activeResultTab === 'table' ? 'text-cyan-400' : 'text-slate-500'} />
          <span>Data Grid</span>
          {activeResult && (
            <Badge variant="slate" size="xs">
              {rowCount}
            </Badge>
          )}
        </button>

        {/* Visual Explain Plan */}
        <button
          onClick={() => setActiveResultTab('explain')}
          className={`h-7 px-3 flex items-center gap-1.5 rounded-t-md text-xs cursor-pointer border-t-2 transition-all ${
            activeResultTab === 'explain'
              ? 'bg-slate-900 text-slate-100 border-indigo-400 font-medium'
              : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/60'
          }`}
        >
          <Network
            size={13}
            className={activeResultTab === 'explain' ? 'text-indigo-400' : 'text-slate-500'}
          />
          <span>Visual EXPLAIN</span>
          {hasExplain && (
            <Badge variant="indigo" size="xs">
              DAG
            </Badge>
          )}
        </button>

        {/* Vector Embedding Visualizer */}
        <button
          onClick={() => setActiveResultTab('vector')}
          className={`h-7 px-3 flex items-center gap-1.5 rounded-t-md text-xs cursor-pointer border-t-2 transition-all ${
            activeResultTab === 'vector'
              ? 'bg-slate-900 text-slate-100 border-cyan-400 font-medium'
              : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/60'
          }`}
        >
          <ScatterChart
            size={13}
            className={activeResultTab === 'vector' ? 'text-cyan-400' : 'text-slate-500'}
          />
          <span>2D/3D Vector Scatter</span>
          {hasVectors && (
            <Badge variant="cyan" size="xs">
              PCA
            </Badge>
          )}
        </button>

        {/* Messages / Console Logs */}
        <button
          onClick={() => setActiveResultTab('messages')}
          className={`h-7 px-3 flex items-center gap-1.5 rounded-t-md text-xs cursor-pointer border-t-2 transition-all ${
            activeResultTab === 'messages'
              ? 'bg-slate-900 text-slate-100 border-amber-400 font-medium'
              : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/60'
          }`}
        >
          <Terminal
            size={13}
            className={activeResultTab === 'messages' ? 'text-amber-400' : 'text-slate-500'}
          />
          <span>Messages</span>
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
