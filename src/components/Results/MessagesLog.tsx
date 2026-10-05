import React from 'react'
import { Terminal, Copy, Trash2, CheckCircle2, AlertCircle, Info, Bell } from 'lucide-react'
import { useDbStore } from '../../store/dbStore'
import { Button } from '../UI/Button'

export const MessagesLog: React.FC = () => {
  const { logs, clearLogs } = useDbStore()

  const copyLogs = () => {
    const text = logs.map((l) => `[${l.time}] [${l.type.toUpperCase()}] ${l.text}`).join('\n')
    navigator.clipboard.writeText(text)
  }

  const getLogIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={13} className="text-emerald-400 shrink-0 mt-0.5" />
      case 'error':
        return <AlertCircle size={13} className="text-rose-400 shrink-0 mt-0.5" />
      case 'notice':
        return <Bell size={13} className="text-amber-400 shrink-0 mt-0.5" />
      default:
        return <Info size={13} className="text-cyan-400 shrink-0 mt-0.5" />
    }
  }

  return (
    <div className="h-full flex flex-col bg-slate-950 font-mono text-xs select-none">
      {/* Log Header */}
      <div className="h-9 px-3 border-b border-slate-800/80 bg-slate-900/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-slate-400">
          <Terminal size={13} className="text-slate-500" />
          <span>Execution Console & PostgreSQL Notices ({logs.length})</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button variant="ghost" size="xs" icon={<Copy size={12} />} onClick={copyLogs}>
            Copy
          </Button>
          <Button variant="ghost" size="xs" icon={<Trash2 size={12} />} onClick={clearLogs}>
            Clear
          </Button>
        </div>
      </div>

      {/* Log Entries */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5 select-text">
        {logs.length === 0 ? (
          <div className="text-slate-600 text-center py-8">No messages or errors logged.</div>
        ) : (
          logs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-2 py-0.5 px-1.5 rounded hover:bg-slate-900/50 transition-colors"
            >
              {getLogIcon(log.type)}
              <span className="text-slate-500 text-[11px] shrink-0">[{log.time}]</span>
              <span
                className={`break-all ${
                  log.type === 'error'
                    ? 'text-rose-300'
                    : log.type === 'success'
                    ? 'text-emerald-300'
                    : log.type === 'notice'
                    ? 'text-amber-300'
                    : 'text-slate-300'
                }`}
              >
                {log.text}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
