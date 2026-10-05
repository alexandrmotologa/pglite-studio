import React from 'react'
import { Play, Network, StopCircle, AlignLeft, Trash2, Zap, CheckSquare, Dna, Eye } from 'lucide-react'
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
  const { status, cancelQuery, activeResult } = useDbStore()
  const { updateSql, selectedText } = useEditorStore()
  const { setVectorAssistantModalOpen, setMobileView } = useUIStore()
  const isRunning = status === 'running'
  const hasSelection = selectedText.trim().length > 0

  return (
    <div className="h-10 bg-slate-900 border-b border-slate-800/80 px-2 sm:px-3 flex items-center justify-between shrink-0 select-none overflow-x-auto no-scrollbar gap-2">
      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {isRunning ? (
          <Button
            variant="danger"
            size="xs"
            icon={<StopCircle size={13} />}
            onClick={cancelQuery}
          >
            Cancel
          </Button>
        ) : (
          <Button
            variant="primary"
            size="xs"
            icon={
              hasSelection ? (
                <CheckSquare size={13} className="text-slate-950" />
              ) : (
                <Play size={13} className="fill-slate-950" />
              )
            }
            onClick={onRun}
            title={
              hasSelection
                ? 'Execute Selected SQL (Ctrl+Enter)'
                : 'Execute SQL Query (Ctrl+Enter)'
            }
          >
            {hasSelection ? (
              <>
                <span className="hidden sm:inline">Run Selection</span>
                <span className="sm:hidden">Selection</span>
              </>
            ) : (
              'Run'
            )}
          </Button>
        )}

        <Button
          variant="secondary"
          size="xs"
          icon={<Network size={13} className="text-cyan-400" />}
          onClick={onExplain}
          disabled={isRunning}
          title={
            hasSelection
              ? 'Analyze Execution Plan of Selection (Ctrl+E)'
              : 'Analyze Execution Plan (Ctrl+E)'
          }
        >
          <span className="hidden sm:inline">
            {hasSelection ? 'Explain Selection' : 'Explain Plan'}
          </span>
          <span className="sm:hidden">Explain</span>
        </Button>

        <Button
          variant="secondary"
          size="xs"
          icon={<Dna size={13} className="text-cyan-400" />}
          onClick={() => setVectorAssistantModalOpen(true)}
          title="pgvector AI Assistant & Geometric Calculator"
        >
          <span className="hidden sm:inline">Vector AI</span>
          <span className="sm:hidden">AI</span>
        </Button>

        <div className="h-4 w-px bg-slate-800 mx-0.5 sm:mx-1" />

        <Button
          variant="ghost"
          size="xs"
          icon={<AlignLeft size={13} />}
          onClick={onFormat}
          title="Format SQL (Ctrl+Shift+F)"
        >
          <span className="hidden md:inline">Format</span>
        </Button>

        <Button
          variant="ghost"
          size="xs"
          icon={<Trash2 size={13} />}
          onClick={() => updateSql('')}
          title="Clear Editor"
        >
          <span className="hidden md:inline">Clear</span>
        </Button>

        {hasSelection && (
          <span className="text-[11px] bg-cyan-950/80 text-cyan-400 px-1.5 sm:px-2 py-0.5 rounded border border-cyan-800/60 font-mono truncate max-w-28 sm:max-w-none">
            {selectedText.trim().split('\n').length} line(s)
          </span>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Jump to results button on mobile */}
        {activeResult && (
          <Button
            variant="ghost"
            size="xs"
            icon={<Eye size={12} className="text-cyan-400" />}
            onClick={() => setMobileView('results')}
            className="md:hidden text-cyan-400"
            title="View query results"
          >
            Results ({activeResult.rowCount})
          </Button>
        )}

        <div className="hidden lg:flex items-center gap-2 text-xs text-slate-400">
          <span className="flex items-center gap-1 text-[11px] text-slate-500">
            <Zap size={11} className="text-cyan-400" />
            Zero Docker • 100% Client-Side
          </span>
        </div>
      </div>
    </div>
  )
}

export default QueryToolbar
