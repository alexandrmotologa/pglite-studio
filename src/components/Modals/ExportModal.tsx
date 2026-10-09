import React, { useState } from 'react'
import { Download, Upload, FileCode } from 'lucide-react'
import { Modal } from '../UI/Modal'
import { Button } from '../UI/Button'
import { useDbStore } from '../../store/dbStore'
import { useUIStore } from '../../store/uiStore'
import { pgliteClient } from '../../engine/client'

export const ExportModal: React.FC = () => {
  const { refreshCatalog } = useDbStore()
  const { exportModalOpen, setExportModalOpen } = useUIStore()

  const [importSql, setImportSql] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [statusMsg, setStatusMsg] = useState<string | null>(null)

  const handleExport = async () => {
    setIsExporting(true)
    try {
      const sqlDump = await pgliteClient.exportSql()
      const blob = new Blob([sqlDump], { type: 'application/sql;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `pglite_studio_dump_${Date.now()}.sql`
      a.click()
      setStatusMsg('Export completed successfully!')
    } catch (err: unknown) {
      setStatusMsg(`Export failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsExporting(false)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (evt) => {
      const text = evt.target?.result as string
      setImportSql(text)
    }
    reader.readAsText(file)
  }

  const handleImport = async () => {
    if (!importSql.trim()) return
    setIsImporting(true)
    try {
      await pgliteClient.importSql(importSql)
      await refreshCatalog()
      setStatusMsg('SQL Script executed successfully!')
      setImportSql('')
      setTimeout(() => {
        setExportModalOpen(false)
        setStatusMsg(null)
      }, 1200)
    } catch (err: unknown) {
      setStatusMsg(`Import failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Modal
      isOpen={exportModalOpen}
      onClose={() => setExportModalOpen(false)}
      title="SQL Import & Export"
      subtitle="Backup or populate client-side PostgreSQL database via standard SQL dumps"
      maxWidth="lg"
    >
      <div className="space-y-5">
        {/* Export section */}
        <div className="p-4 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-semibold text-slate-200">Export Database as .sql</h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Generates standard pg_dump compatible DDL and INSERT statements.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            icon={<Download size={14} />}
            onClick={handleExport}
            disabled={isExporting}
          >
            {isExporting ? 'Generating...' : 'Download .sql'}
          </Button>
        </div>

        {/* Import section */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-300">
              Import & Execute SQL Script
            </span>
            <label className="text-xs text-cyan-400 hover:underline cursor-pointer flex items-center gap-1">
              <Upload size={12} />
              <span>Choose .sql file</span>
              <input
                type="file"
                accept=".sql"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          <textarea
            value={importSql}
            onChange={(e) => setImportSql(e.target.value)}
            placeholder="Paste CREATE TABLE or INSERT statements here..."
            rows={8}
            className="w-full p-2.5 font-mono text-xs bg-slate-950 border border-slate-800 text-slate-200 rounded focus:outline-none focus:border-cyan-500 placeholder-slate-600"
          />

          <div className="flex items-center justify-between pt-1">
            <span className="text-xs text-emerald-400 font-medium">{statusMsg}</span>
            <Button
              variant="secondary"
              size="sm"
              icon={<FileCode size={14} />}
              onClick={handleImport}
              disabled={!importSql.trim() || isImporting}
            >
              {isImporting ? 'Executing...' : 'Run Import Script'}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  )
}
