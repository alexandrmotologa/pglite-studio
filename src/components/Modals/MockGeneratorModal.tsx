import React, { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Modal } from '../UI/Modal'
import { Button } from '../UI/Button'
import { useDbStore } from '../../store/dbStore'
import { useUIStore } from '../../store/uiStore'
import { generateInsertSql } from '../../engine/syntheticData'

export const MockGeneratorModal: React.FC = () => {
  const { catalog, runQuery } = useDbStore()
  const { mockModalOpen, mockModalTable, setMockModalOpen } = useUIStore()

  const [selectedTable, setSelectedTable] = useState<string>('')
  const [rowCount, setRowCount] = useState<number>(25)
  const [isGenerating, setIsGenerating] = useState(false)
  const [successCount, setSuccessCount] = useState<number | null>(null)

  const tables = catalog?.tables || []
  const activeTable = selectedTable || mockModalTable || tables[0]?.name || ''

  const handleGenerate = async () => {
    const tableObj = tables.find((t) => t.name === activeTable)
    if (!tableObj) return

    setIsGenerating(true)
    setSuccessCount(null)

    try {
      const sql = generateInsertSql(tableObj.name, tableObj.columns, rowCount)
      if (sql) {
        await runQuery(sql)
        setSuccessCount(rowCount)
        setTimeout(() => {
          setMockModalOpen(false)
          setSuccessCount(null)
        }, 1200)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Modal
      isOpen={mockModalOpen}
      onClose={() => setMockModalOpen(false)}
      title="Synthetic Mock Data Generator"
      subtitle="Populate PostgreSQL tables with realistic random data, names, and normalized embeddings"
      maxWidth="md"
    >
      <div className="space-y-4">
        {/* Table Selector */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-1">Target Table</label>
          <select
            value={activeTable}
            onChange={(e) => setSelectedTable(e.target.value)}
            className="w-full px-3 py-1.5 text-xs bg-slate-950 border border-slate-800 text-slate-200 rounded focus:outline-none focus:border-cyan-500"
          >
            {tables.map((t) => (
              <option key={t.name} value={t.name}>
                {t.name} ({t.columns.length} columns)
              </option>
            ))}
          </select>
        </div>

        {/* Row Count Selector */}
        <div>
          <div className="flex justify-between text-xs font-semibold text-slate-300 mb-1">
            <span>Number of Rows to Insert</span>
            <span className="font-mono text-cyan-400">{rowCount} rows</span>
          </div>
          <input
            type="range"
            min={5}
            max={500}
            step={5}
            value={rowCount}
            onChange={(e) => setRowCount(Number(e.target.value))}
            className="w-full accent-cyan-400 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>5 rows</span>
            <span>100 rows</span>
            <span>250 rows</span>
            <span>500 rows</span>
          </div>
        </div>

        {/* Feature Highlights */}
        <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 text-xs text-slate-400 space-y-1">
          <p className="font-medium text-slate-200">Constraint-Aware Generator:</p>
          <p>• Random unit-norm vector embeddings for <code className="text-cyan-300">vector(N)</code></p>
          <p>• Realistic emails, names, titles, and dates</p>
          <p>• Auto-increments handled without primary key conflicts</p>
        </div>

        {/* Footer Actions */}
        <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
          <Button variant="ghost" size="sm" onClick={() => setMockModalOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Sparkles size={14} />}
            onClick={handleGenerate}
            disabled={isGenerating || !activeTable}
          >
            {isGenerating
              ? 'Generating...'
              : successCount
              ? `Inserted ${successCount} Rows!`
              : `Generate ${rowCount} Rows`}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
