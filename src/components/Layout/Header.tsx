import React from 'react'
import {
  Database,
  GitBranch,
  BookOpen,
  Download,
  Upload,
  History,
  RotateCcw,
  Sparkles,
  ChevronDown,
  Cpu,
} from 'lucide-react'
import { Button } from '../UI/Button'
import { Badge } from '../UI/Badge'
import { useDbStore } from '../../store/dbStore'
import { useUIStore } from '../../store/uiStore'

export const Header: React.FC = () => {
  const { activeBranch, branches, switchBranch, status, init, storageType } = useDbStore()
  const {
    setBranchModalOpen,
    setExportModalOpen,
    setSamplesModalOpen,
    setHistoryModalOpen,
  } = useUIStore()

  const handleReset = async () => {
    if (confirm(`Reset branch '${activeBranch}' to an empty database state?`)) {
      await init(activeBranch, storageType)
    }
  }

  return (
    <header className="h-13 bg-slate-950 border-b border-slate-800/80 px-4 flex items-center justify-between shrink-0 select-none">
      {/* Brand & Title */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner">
            <Cpu size={18} />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100 tracking-tight text-sm">PGLite Studio</span>
              <Badge variant="cyan" size="xs">pgvector 0.7+</Badge>
              <Badge variant="indigo" size="xs">WASM</Badge>
            </div>
            <span className="text-[11px] text-slate-500 leading-none">
              Client-Side PostgreSQL Workbench
            </span>
          </div>
        </div>

        <div className="h-5 w-px bg-slate-800 mx-1" />

        {/* Branch Selector */}
        <div className="flex items-center gap-1.5">
          <div className="relative flex items-center">
            <GitBranch size={13} className="absolute left-2.5 text-cyan-400 pointer-events-none" />
            <select
              value={activeBranch}
              onChange={(e) => {
                if (e.target.value === '__manage__') {
                  setBranchModalOpen(true)
                } else {
                  switchBranch(e.target.value)
                }
              }}
              className="pl-7 pr-7 py-1 text-xs bg-slate-900 border border-slate-700/80 text-slate-200 rounded-md focus:outline-none focus:border-cyan-500 appearance-none cursor-pointer"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.id === 'main' ? '(default)' : ''}
                </option>
              ))}
              <option value="__manage__">+ Manage branches...</option>
            </select>
            <ChevronDown size={12} className="absolute right-2 text-slate-400 pointer-events-none" />
          </div>

          <Button
            data-action="snapshots"
            variant="ghost"
            size="xs"
            onClick={() => setBranchModalOpen(true)}
            title="Branch Manager"
          >
            Snapshots
          </Button>
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="flex items-center gap-2">
        <Button
          data-action="sample-demos"
          variant="secondary"
          size="xs"
          icon={<BookOpen size={13} className="text-cyan-400" />}
          onClick={() => setSamplesModalOpen(true)}
        >
          Sample Demos
        </Button>

        <Button
          data-action="history"
          variant="secondary"
          size="xs"
          icon={<History size={13} className="text-slate-400" />}
          onClick={() => setHistoryModalOpen(true)}
        >
          History
        </Button>

        <div className="h-4 w-px bg-slate-800" />

        <Button
          data-action="export-sql"
          variant="secondary"
          size="xs"
          icon={<Download size={13} className="text-slate-400" />}
          onClick={() => setExportModalOpen(true)}
        >
          Export SQL
        </Button>

        <Button
          data-action="reset-db"
          variant="ghost"
          size="xs"
          icon={<RotateCcw size={13} className="text-slate-400" />}
          onClick={handleReset}
          title="Reset database to fresh state"
        >
          Reset DB
        </Button>
      </div>
    </header>
  )
}
