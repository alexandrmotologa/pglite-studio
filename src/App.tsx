import React, { useEffect, useState } from 'react'
import { Header } from './components/Layout/Header'
import { Sidebar } from './components/Layout/Sidebar'
import { StatusBar } from './components/Layout/StatusBar'
import { EditorTabs } from './components/Editor/EditorTabs'
import { QueryToolbar } from './components/Editor/QueryToolbar'
import { SqlEditor } from './components/Editor/SqlEditor'
import { ResultTabs } from './components/Results/ResultTabs'
import { DataGrid } from './components/Results/DataGrid'
import { ExplainPlanView } from './components/Results/ExplainPlanView'
import { VectorScatterView } from './components/Results/VectorScatterView'
import { MessagesLog } from './components/Results/MessagesLog'
import { BranchModal } from './components/Modals/BranchModal'
import { MockGeneratorModal } from './components/Modals/MockGeneratorModal'
import { ExportModal } from './components/Modals/ExportModal'
import { SampleQueriesModal } from './components/Modals/SampleQueriesModal'
import { HistoryModal } from './components/Modals/HistoryModal'
import { useDbStore } from './store/dbStore'
import { useEditorStore } from './store/editorStore'
import { useUIStore } from './store/uiStore'
import { formatSql } from './utils/sqlFormatter'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'

export const App: React.FC = () => {
  const { init, runQuery, runExplain, status } = useDbStore()
  const { getActiveTab, updateSql, addToHistory } = useEditorStore()
  const { activeResultTab, setActiveResultTab, isSidebarOpen, toggleSidebar } = useUIStore()

  const [editorHeight, setEditorHeight] = useState<number>(45) // percentage

  useEffect(() => {
    // Initialize PostgreSQL engine on mount
    init('main', 'idb')
  }, [init])

  const handleRunQuery = async () => {
    const activeTab = getActiveTab()
    const sql = activeTab.sql.trim()
    if (!sql) return

    const start = performance.now()
    try {
      const res = await runQuery(sql)
      const duration = performance.now() - start
      addToHistory({
        sql,
        durationMs: duration,
        success: true,
        rowCount: res.rowCount,
      })

      // If user queried vectors, switch to vector tab or keep table
      if (res.hasVectorColumn && activeResultTab !== 'vector') {
        // Can either keep table or switch
        setActiveResultTab('table')
      } else if (activeResultTab === 'explain') {
        setActiveResultTab('table')
      }
    } catch (err: unknown) {
      const duration = performance.now() - start
      addToHistory({
        sql,
        durationMs: duration,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      })
      setActiveResultTab('messages')
    }
  }

  const handleExplain = async () => {
    const activeTab = getActiveTab()
    const sql = activeTab.sql.trim()
    if (!sql) return

    const start = performance.now()
    try {
      await runExplain(sql)
      const duration = performance.now() - start
      addToHistory({
        sql: `EXPLAIN ${sql}`,
        durationMs: duration,
        success: true,
      })
      setActiveResultTab('explain')
    } catch (err: unknown) {
      const duration = performance.now() - start
      addToHistory({
        sql: `EXPLAIN ${sql}`,
        durationMs: duration,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      })
      setActiveResultTab('messages')
    }
  }

  const handleFormat = () => {
    const activeTab = getActiveTab()
    const formatted = formatSql(activeTab.sql)
    updateSql(formatted)
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 text-slate-100 overflow-hidden font-sans select-none">
      {/* Top Application Header */}
      <Header />

      {/* Main Workspace Body */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Schema Catalog Sidebar */}
        {isSidebarOpen && <Sidebar />}

        {/* Sidebar Toggle Floating Button */}
        <button
          onClick={toggleSidebar}
          className="absolute z-30 top-2.5 left-2.5 p-1 bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-100 rounded shadow-md opacity-80 hover:opacity-100 transition-opacity"
          title={isSidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
          style={{ left: isSidebarOpen ? '17.2rem' : '0.5rem' }}
        >
          {isSidebarOpen ? <PanelLeftClose size={13} /> : <PanelLeftOpen size={13} />}
        </button>

        {/* Center Panel (Editor + Results split) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Half: SQL Editor Pane */}
          <div
            className="flex flex-col border-b border-slate-800/80 overflow-hidden"
            style={{ height: `${editorHeight}%` }}
          >
            <EditorTabs />
            <QueryToolbar
              onRun={handleRunQuery}
              onExplain={handleExplain}
              onFormat={handleFormat}
            />
            <div className="flex-1 overflow-hidden">
              <SqlEditor onRun={handleRunQuery} onExplain={handleExplain} />
            </div>
          </div>

          {/* Draggable Divider */}
          <div
            className="h-1 bg-slate-900 hover:bg-cyan-500/60 cursor-row-resize transition-colors flex items-center justify-center shrink-0"
            onMouseDown={(e) => {
              const startY = e.clientY
              const startH = editorHeight
              const onMove = (moveEvt: MouseEvent) => {
                const dy = moveEvt.clientY - startY
                const totalH = window.innerHeight - 80
                const newPercent = Math.min(80, Math.max(20, startH + (dy / totalH) * 100))
                setEditorHeight(newPercent)
              }
              const onUp = () => {
                window.removeEventListener('mousemove', onMove)
                window.removeEventListener('mouseup', onUp)
              }
              window.addEventListener('mousemove', onMove)
              window.addEventListener('mouseup', onUp)
            }}
          />

          {/* Bottom Half: Workbench Results Viewport */}
          <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
            <ResultTabs />
            <div className="flex-1 overflow-hidden relative">
              {activeResultTab === 'table' && <DataGrid />}
              {activeResultTab === 'explain' && <ExplainPlanView />}
              {activeResultTab === 'vector' && <VectorScatterView />}
              {activeResultTab === 'messages' && <MessagesLog />}
            </div>
          </div>
        </div>
      </div>

      {/* Global Status Footer */}
      <StatusBar />

      {/* Modals */}
      <BranchModal />
      <MockGeneratorModal />
      <ExportModal />
      <SampleQueriesModal />
      <HistoryModal />
    </div>
  )
}

export default App
