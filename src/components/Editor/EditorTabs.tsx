import React from 'react'
import { Plus, X, FileCode } from 'lucide-react'
import { useEditorStore } from '../../store/editorStore'

export const EditorTabs: React.FC = () => {
  const { tabs, activeTabId, setActiveTab, addTab, closeTab } = useEditorStore()

  return (
    <div className="h-9 bg-slate-950 border-b border-slate-800/80 flex items-center px-2 gap-1 overflow-x-auto select-none">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId
        return (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`group h-7 px-2.5 flex items-center gap-1.5 rounded-t-md text-xs cursor-pointer border-t-2 transition-all ${
              isActive
                ? 'bg-slate-900 text-slate-100 border-cyan-400 font-medium'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/60'
            }`}
          >
            <FileCode
              size={13}
              className={isActive ? 'text-cyan-400 shrink-0' : 'text-slate-500 shrink-0'}
            />
            <span className="truncate max-w-36">{tab.title}</span>
            {tabs.length > 1 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  closeTab(tab.id)
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-500 hover:text-slate-200 rounded transition-opacity"
              >
                <X size={11} />
              </button>
            )}
          </div>
        )
      })}

      <button
        onClick={() => addTab()}
        className="p-1 text-slate-500 hover:text-slate-200 hover:bg-slate-900 rounded transition-colors ml-1"
        title="New Query Tab"
      >
        <Plus size={14} />
      </button>
    </div>
  )
}
