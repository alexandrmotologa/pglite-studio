import { Database, Zap, HardDrive, GitBranch } from 'lucide-react'
import { useDbStore } from '../../store/dbStore'

export const StatusBar: React.FC = () => {
  const { status, activeBranch, storageType, lastExecutionMs, activeResult, catalog } =
    useDbStore()

  const tableCount = catalog?.tables.length ?? 0

  return (
    <footer className="h-7 bg-slate-950 border-t border-slate-800/80 px-3 flex items-center justify-between text-xs text-slate-400 select-none shrink-0">
      <div className="flex items-center gap-4">
        {/* Engine status indicator */}
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              status === 'ready'
                ? 'bg-emerald-400 animate-pulse'
                : status === 'running'
                ? 'bg-amber-400 animate-spin'
                : status === 'loading'
                ? 'bg-cyan-400 animate-pulse'
                : 'bg-rose-500'
            }`}
          />
          <span className="font-medium text-slate-300">
            {status === 'ready'
              ? 'PostgreSQL 16.2 (WASM)'
              : status === 'running'
              ? 'Executing Query...'
              : status === 'loading'
              ? 'Starting Engine...'
              : 'Engine Error'}
          </span>
        </div>

        {/* Storage backend */}
        <div className="flex items-center gap-1 text-slate-400">
          <HardDrive size={13} className="text-slate-500" />
          <span>{storageType === 'idb' ? 'IndexedDB (Persistent)' : 'Memory (Ephemeral)'}</span>
        </div>

        {/* Active branch */}
        <div className="flex items-center gap-1 text-slate-400">
          <GitBranch size={13} className="text-cyan-500" />
          <span className="font-mono text-cyan-300">{activeBranch}</span>
        </div>

        {/* Table count */}
        <div className="flex items-center gap-1 text-slate-400">
          <Database size={13} className="text-slate-500" />
          <span>{tableCount} tables</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Last latency & rows */}
        {lastExecutionMs !== null && (
          <div className="flex items-center gap-1 text-slate-300">
            <Zap size={13} className="text-amber-400" />
            <span className="font-mono">{lastExecutionMs}ms</span>
            {activeResult && (
              <span className="text-slate-500">
                ({activeResult.rowCount} {activeResult.rowCount === 1 ? 'row' : 'rows'})
              </span>
            )}
          </div>
        )}

        {/* Shortcuts */}
        <div className="hidden md:flex items-center gap-2 text-slate-500">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 text-[10px] bg-slate-900 border border-slate-700 rounded text-slate-400">
              Ctrl+Enter
            </kbd>
            <span>Run</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.5 text-[10px] bg-slate-900 border border-slate-700 rounded text-slate-400">
              Ctrl+E
            </kbd>
            <span>Explain</span>
          </span>
        </div>

        {/* GitHub link */}
        <a
          href="https://github.com/alexandrmotologa/pglite-studio"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 text-slate-400 hover:text-cyan-400 transition-colors"
        >
          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
          <span>alexandrmotologa/pglite-studio</span>
        </a>
      </div>
    </footer>
  )
}
