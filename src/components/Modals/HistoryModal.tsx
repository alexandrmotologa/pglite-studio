import React from 'react'
import { Play, CheckCircle2, AlertCircle } from 'lucide-react'
import { Modal } from '../UI/Modal'
import { Button } from '../UI/Button'
import { Badge } from '../UI/Badge'
import { useEditorStore } from '../../store/editorStore'
import { useUIStore } from '../../store/uiStore'

export const HistoryModal: React.FC = () => {
  const { history, addTab } = useEditorStore()
  const { historyModalOpen, setHistoryModalOpen } = useUIStore()

  const handleLoad = (sql: string) => {
    addTab(`history_${Date.now().toString(36).substring(4)}.sql`, sql)
    setHistoryModalOpen(false)
  }

  return (
    <Modal
      isOpen={historyModalOpen}
      onClose={() => setHistoryModalOpen(false)}
      title="Query Execution History"
      subtitle="Previously executed queries during this session"
      maxWidth="lg"
    >
      <div className="space-y-2">
        {history.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-500">
            No queries have been executed yet in this session.
          </div>
        ) : (
          history.map((item) => (
            <div
              key={item.id}
              className="p-3 bg-slate-950 rounded-lg border border-slate-800 hover:border-slate-700 transition-colors flex items-start justify-between gap-3"
            >
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center gap-2 mb-1.5">
                  {item.success ? (
                    <Badge variant="emerald" size="xs">
                      <CheckCircle2 size={10} className="mr-0.5" />
                      Success
                    </Badge>
                  ) : (
                    <Badge variant="rose" size="xs">
                      <AlertCircle size={10} className="mr-0.5" />
                      Failed
                    </Badge>
                  )}
                  <span className="text-[11px] text-slate-400 font-mono">
                    {item.durationMs.toFixed(1)}ms
                  </span>
                  {item.rowCount !== undefined && (
                    <span className="text-[11px] text-slate-500">
                      • {item.rowCount} rows
                    </span>
                  )}
                  <span className="text-[11px] text-slate-500">
                    • {new Date(item.timestamp).toLocaleTimeString()}
                  </span>
                </div>

                <pre className="font-mono text-xs text-slate-300 bg-slate-900/80 p-2 rounded border border-slate-800/80 overflow-x-auto max-h-24">
                  {item.sql}
                </pre>

                {item.error && (
                  <p className="text-[11px] text-rose-400 mt-1 font-mono">{item.error}</p>
                )}
              </div>

              <Button
                variant="secondary"
                size="xs"
                icon={<Play size={11} />}
                onClick={() => handleLoad(item.sql)}
                title="Load into new tab"
              >
                Load
              </Button>
            </div>
          ))
        )}
      </div>
    </Modal>
  )
}
