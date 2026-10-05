import React, { useState, useRef, useEffect } from 'react'
import { Plus, X, FileCode, Check } from 'lucide-react'
import { useEditorStore } from '../../store/editorStore'

export const EditorTabs: React.FC = () => {
  const { tabs, activeTabId, setActiveTab, addTab, closeTab, renameTab } = useEditorStore()
  const [editingTabId, setEditingTabId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (editingTabId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingTabId])

  const startRename = (id: string, currentTitle: string) => {
    setEditingTabId(id)
    setEditingTitle(currentTitle)
  }

  const saveRename = () => {
    if (editingTabId && editingTitle.trim()) {
      renameTab(editingTabId, editingTitle.trim())
    }
    setEditingTabId(null)
  }

  return (
    <div className="h-9 bg-slate-950 border-b border-slate-800/80 flex items-center px-2 gap-1 overflow-x-auto select-none">
      {tabs.map((tab) => {
        const isActive = tab.id === activeTabId
        const isEditing = tab.id === editingTabId

        return (
          <div
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            onDoubleClick={() => startRename(tab.id, tab.title)}
            className={`group h-7 px-2.5 flex items-center gap-1.5 rounded-t-md text-xs cursor-pointer border-t-2 transition-all ${
              isActive
                ? 'bg-slate-900 text-slate-100 border-cyan-400 font-medium'
                : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-900/60'
            }`}
            title="Double-click to rename"
          >
            <FileCode
              size={13}
              className={isActive ? 'text-cyan-400 shrink-0' : 'text-slate-500 shrink-0'}
            />

            {isEditing ? (
              <div
                className="flex items-center gap-1"
                onClick={(e) => e.stopPropagation()}
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={editingTitle}
                  onChange={(e) => setEditingTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveRename()
                    if (e.key === 'Escape') setEditingTabId(null)
                  }}
                  onBlur={saveRename}
                  className="bg-slate-800 text-slate-100 px-1 py-0 text-xs rounded border border-cyan-500 outline-none w-28"
                />
                <button
                  onClick={saveRename}
                  className="text-cyan-400 hover:text-cyan-300"
                >
                  <Check size={12} />
                </button>
              </div>
            ) : (
              <span className="truncate max-w-36">{tab.title}</span>
            )}

            {tabs.length > 1 && !isEditing && (
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
