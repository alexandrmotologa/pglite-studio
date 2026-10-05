import React, { useState, useRef } from 'react'
import Papa from 'papaparse'
import { Modal } from '../UI/Modal'
import { useUIStore } from '../../store/uiStore'
import { useDbStore } from '../../store/dbStore'
import { UploadCloud, FileSpreadsheet, Check, AlertCircle } from 'lucide-react'
import { Button } from '../UI/Button'

interface InferredColumn {
  name: string
  type: string
}

export const ImportDataModal: React.FC = () => {
  const { importModalOpen, setImportModalOpen } = useUIStore()
  const { runQuery, refreshCatalog } = useDbStore()

  const [tableName, setTableName] = useState('')
  const [addPrimaryKey, setAddPrimaryKey] = useState(true)
  const [columns, setColumns] = useState<InferredColumn[]>([])
  const [previewRows, setPreviewRows] = useState<Record<string, unknown>[]>([])
  const [allRows, setAllRows] = useState<Record<string, unknown>[]>([])
  const [fileName, setFileName] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  if (!importModalOpen) return null

  const inferType = (values: unknown[]): string => {
    const valid = values.filter((v) => v !== null && v !== undefined && String(v).trim() !== '')
    if (valid.length === 0) return 'TEXT'

    // Check vector format: "[0.12, 0.44, ...]"
    const allVectors = valid.every((v) => {
      const s = String(v).trim()
      if (s.startsWith('[') && s.endsWith(']')) {
        const parts = s.slice(1, -1).split(',')
        return parts.length > 0 && parts.every((p) => !isNaN(Number(p.trim())))
      }
      return false
    })
    if (allVectors) {
      const firstParts = String(valid[0]).trim().slice(1, -1).split(',')
      return `vector(${firstParts.length})`
    }

    // Check integer
    const allInts = valid.every((v) => /^-?\d+$/.test(String(v).trim()))
    if (allInts) return 'INTEGER'

    // Check float
    const allFloats = valid.every((v) => !isNaN(Number(v)) && !isNaN(parseFloat(String(v))))
    if (allFloats) return 'DOUBLE PRECISION'

    // Check boolean
    const allBools = valid.every((v) => {
      const s = String(v).trim().toLowerCase()
      return s === 'true' || s === 'false' || s === 't' || s === 'f'
    })
    if (allBools) return 'BOOLEAN'

    // Check timestamp / date
    const allDates = valid.every((v) => !isNaN(Date.parse(String(v))) && String(v).length > 8)
    if (allDates) return 'TIMESTAMP'

    return 'TEXT'
  }

  const processData = (rawRows: Record<string, unknown>[], name: string) => {
    if (rawRows.length === 0) {
      setErrorMsg('File appears to be empty.')
      return
    }

    const rawCols = Object.keys(rawRows[0])
    const inferred: InferredColumn[] = rawCols.map((colName) => {
      const sampleVals = rawRows.slice(0, 50).map((r) => r[colName])
      return {
        name: colName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase(),
        type: inferType(sampleVals),
      }
    })

    const cleanTableName = name
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9_]/g, '_')
      .toLowerCase()

    setTableName(cleanTableName || 'imported_data')
    setColumns(inferred)
    setAllRows(rawRows)
    setPreviewRows(rawRows.slice(0, 5))
    setErrorMsg(null)
  }

  const handleFileChange = (file: File) => {
    setFileName(file.name)
    setErrorMsg(null)
    setSuccessMsg(null)

    if (file.name.endsWith('.json')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target?.result as string)
          const rows = Array.isArray(parsed) ? parsed : [parsed]
          processData(rows, file.name)
        } catch (err) {
          setErrorMsg(`Invalid JSON file: ${err instanceof Error ? err.message : String(err)}`)
        }
      }
      reader.readAsText(file)
    } else {
      // Treat as CSV / TSV
      Papa.parse(file, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        complete: (results) => {
          processData(results.data as Record<string, unknown>[], file.name)
        },
        error: (err) => {
          setErrorMsg(`Failed to parse CSV: ${err.message}`)
        },
      })
    }
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0])
    }
  }

  const handleExecuteImport = async () => {
    if (!tableName.trim() || columns.length === 0 || allRows.length === 0) return
    setIsImporting(true)
    setErrorMsg(null)

    try {
      // 1. Build CREATE TABLE SQL
      const colDefs = columns.map((c) => `  "${c.name}" ${c.type}`)
      if (addPrimaryKey) {
        colDefs.unshift('  id SERIAL PRIMARY KEY')
      }

      const createSql = `CREATE TABLE IF NOT EXISTS "${tableName}" (\n${colDefs.join(',\n')}\n);`

      // 2. Build INSERT batches (e.g. 100 rows per batch)
      const colNames = columns.map((c) => `"${c.name}"`).join(', ')
      const insertStatements: string[] = []
      const batchSize = 100

      for (let i = 0; i < allRows.length; i += batchSize) {
        const batch = allRows.slice(i, i + batchSize)
        const valuesRows: string[] = []

        for (const row of batch) {
          const valTokens = columns.map((c) => {
            const rawVal = row[c.name] ?? row[Object.keys(row).find((k) => k.toLowerCase() === c.name) || '']
            if (rawVal === null || rawVal === undefined) return 'NULL'
            if (typeof rawVal === 'number' || typeof rawVal === 'boolean') return String(rawVal)
            return `'${String(rawVal).replace(/'/g, "''")}'`
          })
          valuesRows.push(`(${valTokens.join(', ')})`)
        }

        insertStatements.push(
          `INSERT INTO "${tableName}" (${colNames}) VALUES\n${valuesRows.join(',\n')};`
        )
      }

      // Execute in PGlite
      const fullSql = [createSql, ...insertStatements].join('\n\n')
      await runQuery(fullSql)
      await refreshCatalog()

      setSuccessMsg(
        `Successfully imported ${allRows.length} rows into table "${tableName}".`
      )
      setTimeout(() => {
        setImportModalOpen(false)
      }, 1500)
    } catch (err) {
      setErrorMsg(`Import failed: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setIsImporting(false)
    }
  }

  return (
    <Modal
      isOpen={importModalOpen}
      onClose={() => setImportModalOpen(false)}
      title="Import CSV or JSON Dataset"
      subtitle="Infer column types and ingest directly into in-browser PostgreSQL"
      icon={<FileSpreadsheet size={18} className="text-emerald-400" />}
      maxWidth="xl"
    >
      <div className="flex flex-col gap-4">
        {/* Dropzone */}
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-slate-700 hover:border-emerald-500/80 rounded-lg p-6 flex flex-col items-center justify-center gap-2 cursor-pointer bg-slate-950/60 hover:bg-slate-900/60 transition-all select-none"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.json,.tsv"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleFileChange(e.target.files[0])
              }
            }}
          />
          <UploadCloud size={32} className="text-emerald-400" />
          <p className="text-xs font-medium text-slate-200">
            {fileName ? fileName : 'Drag & drop CSV or JSON file here, or click to browse'}
          </p>
          <p className="text-[11px] text-slate-500">
            Supports comma/tab delimited files and standard JSON arrays
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-950/70 border border-rose-800/80 rounded text-xs text-rose-300 flex items-center gap-2">
            <AlertCircle size={14} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-950/70 border border-emerald-800/80 rounded text-xs text-emerald-300 flex items-center gap-2">
            <Check size={14} className="shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Configuration options when file loaded */}
        {columns.length > 0 && (
          <div className="flex flex-col gap-3 bg-slate-900/80 p-3 rounded border border-slate-800 text-xs">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="text-[11px] text-slate-400 block mb-1">
                  Destination Table Name
                </label>
                <input
                  type="text"
                  value={tableName}
                  onChange={(e) => setTableName(e.target.value)}
                  className="w-full bg-slate-950 text-slate-100 px-2.5 py-1 text-xs rounded border border-slate-700 focus:border-emerald-500 outline-none font-mono"
                />
              </div>

              <div className="flex items-center gap-2 pt-4">
                <input
                  type="checkbox"
                  id="chkPk"
                  checked={addPrimaryKey}
                  onChange={(e) => setAddPrimaryKey(e.target.checked)}
                  className="rounded accent-emerald-500"
                />
                <label htmlFor="chkPk" className="text-slate-300 cursor-pointer">
                  Auto-add <code className="text-amber-400">id SERIAL PRIMARY KEY</code>
                </label>
              </div>
            </div>

            {/* Inferred Schema Pill List */}
            <div>
              <p className="text-[11px] text-slate-400 mb-1.5">
                Inferred Columns ({columns.length} columns, {allRows.length} rows total):
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {columns.map((c) => (
                  <span
                    key={c.name}
                    className="px-2 py-0.5 bg-slate-950 border border-slate-800 rounded font-mono text-[11px] text-slate-300 flex items-center gap-1"
                  >
                    <span>{c.name}</span>
                    <span className="text-emerald-400 text-[10px]">({c.type})</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Preview table */}
            {previewRows.length > 0 && (
              <div>
                <p className="text-[11px] text-slate-400 mb-1">Preview (first 5 rows):</p>
                <div className="border border-slate-800 rounded overflow-x-auto max-h-32 bg-slate-950">
                  <table className="w-full text-[11px] font-mono text-left">
                    <thead className="bg-slate-900 border-b border-slate-800 text-slate-400">
                      <tr>
                        {columns.map((c) => (
                          <th key={c.name} className="px-2 py-1 truncate">
                            {c.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {previewRows.map((r, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/40">
                          {columns.map((c) => (
                            <td key={c.name} className="px-2 py-0.5 text-slate-300 truncate max-w-28">
                              {String(r[c.name] ?? '')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
          <Button variant="ghost" size="xs" onClick={() => setImportModalOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="xs"
            disabled={columns.length === 0 || isImporting}
            onClick={handleExecuteImport}
          >
            {isImporting ? 'Ingesting Data...' : `Import ${allRows.length || ''} Rows`}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
