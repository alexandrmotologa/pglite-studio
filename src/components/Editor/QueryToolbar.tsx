import React from 'react'
import { Play, Network, StopCircle, AlignLeft, Trash2, Zap } from 'lucide-react'
import { Button } from '../UI/Button'
import { useDbStore } from '../../store/dbStore'
import { useEditorStore } from '../../store/editorStore'
import { useUIStore } from '../../store/uiStore'

interface QueryToolbarProps {
  onRun: () => void
  onExplain: () => void
  onFormat: () => void
}

export const QueryToolbar: React.FC<QueryToolbarProps> = ({ onRun, onExplain, onFormat }) => {
  const { status, cancelQuery } = useDbStore()
  const { updateSql } = useEditorStore()
  const isRunning = status === 'running'

  return (
    <div className="h-10 bg-slate-900 border-b border-slate-800/80 px-3 flex items-center justify-between shrink-0 select-none">
      <div className="flex items-center gap-2">
        {isRunning ? (
          <Button
            variant="danger"
            size="xs"
            icon={<StopCircle size={13} />}
            onClick={cancelQuery}
          >
            Cancel Query
          </Button>
        ) : (
          <Button
            variant="primary"
            size="xs"
            icon={<Play size={13} className="fill-slate-950" />}
            onClick={onRun}
            title="Execute SQL (Ctrl+Enter)"
          >
            Run
          </Button>
        )}

        <Button
          variant="secondary"
          size="xs"
          icon={<Network size={13} className="text-cyan-400" />}
          onClick={onExplain}
          disabled={isRunning}
          title="Analyze Execution Plan (Ctrl+E)"
        >
          Explain Plan
        </Button>

        <div className="h-4 w-px bg-slate-800 mx-1" />

        <Button
          variant="ghost"
          size="xs"
          icon={<AlignLeft size={13} />}
          onClick={onFormat}
          title="Format SQL"
        >
          Format
        </Button>

        <Button
          variant="ghost"
          size="xs"
          icon={<Trash2 size={13} />}
          onClick={() => updateSql('')}
          title="Clear Editor"
        >
          Clear
        </Button>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-400">
        <span className="flex items-center gap-1 text-[11px] text-slate-500">
          <Zap size={11} className="text-cyan-400" />
          Zero Docker • 100% Client-Side
        </span>
      </div>
    </div>
  )
}
