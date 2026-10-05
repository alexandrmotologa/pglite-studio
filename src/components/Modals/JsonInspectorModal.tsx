import React, { useState } from 'react'
import { Modal } from '../UI/Modal'
import { useUIStore } from '../../store/uiStore'
import { Copy, Check, Search, FileJson } from 'lucide-react'
import { Button } from '../UI/Button'

export const JsonInspectorModal: React.FC = () => {
  const { jsonInspectorOpen, jsonInspectorData, setJsonInspector } = useUIStore()
  const [copied, setCopied] = useState(false)
  const [filterQuery, setFilterQuery] = useState('')

  if (!jsonInspectorOpen || !jsonInspectorData) return null

  const jsonString = JSON.stringify(jsonInspectorData.json, null, 2)

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  // Simple filtering highlight
  const filteredLines = jsonString.split('\n').filter((line) => {
    if (!filterQuery.trim()) return true
    return line.toLowerCase().includes(filterQuery.toLowerCase())
  })

  return (
    <Modal
      isOpen={jsonInspectorOpen}
      onClose={() => setJsonInspector(false)}
      title={`JSON Inspector — ${jsonInspectorData.title}`}
      icon={<FileJson size={18} className="text-amber-400" />}
      maxWidth="2xl"
    >
      <div className="flex flex-col gap-3">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3 bg-slate-900 p-2 rounded border border-slate-800">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search keys or values in JSON..."
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              className="w-full bg-slate-950 text-slate-100 pl-8 pr-3 py-1.5 text-xs rounded border border-slate-800 focus:border-amber-500 outline-none"
            />
          </div>

          <Button
            variant="secondary"
            size="xs"
            icon={copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
            onClick={handleCopy}
          >
            {copied ? 'Copied' : 'Copy JSON'}
          </Button>
        </div>

        {/* JSON Content Viewer */}
        <div className="bg-slate-950 border border-slate-800 rounded p-3 max-h-[60vh] overflow-y-auto font-mono text-xs">
          <pre className="text-slate-200 whitespace-pre-wrap break-all select-text">
            {filterQuery ? filteredLines.join('\n') : jsonString}
          </pre>
        </div>

        <div className="flex justify-between items-center text-xs text-slate-400 pt-1">
          <span>
            {Array.isArray(jsonInspectorData.json)
              ? `${jsonInspectorData.json.length} array items`
              : typeof jsonInspectorData.json === 'object' && jsonInspectorData.json !== null
              ? `${Object.keys(jsonInspectorData.json).length} object keys`
              : 'Scalar value'}
          </span>
          <Button variant="ghost" size="xs" onClick={() => setJsonInspector(false)}>
            Close
          </Button>
        </div>
      </div>
    </Modal>
  )
}
