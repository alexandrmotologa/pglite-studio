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
import { ERDiagramView } from './components/Results/ERDiagramView'
import { BranchModal } from './components/Modals/BranchModal'
import { MockGeneratorModal } from './components/Modals/MockGeneratorModal'
import { ExportModal } from './components/Modals/ExportModal'
import { SampleQueriesModal } from './components/Modals/SampleQueriesModal'
import { HistoryModal } from './components/Modals/HistoryModal'
import { JsonInspectorModal } from './components/Modals/JsonInspectorModal'
import { ImportDataModal } from './components/Modals/ImportDataModal'
import { VectorAssistantModal } from './components/Modals/VectorAssistantModal'
import { useDbStore } from './store/dbStore'
import { useEditorStore } from './store/editorStore'
import { useUIStore } from './store/uiStore'
import { formatSql } from './utils/sqlFormatter'
import LZString from 'lz-string'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'

export const App: React.FC = () => {
  const { init, runQuery, runExplain, activeResult } = useDbStore()
  const { getActiveTab, updateSql, addToHistory, getExecutableSql, addTab } = useEditorStore()
  const {
    activeResultTab,
    setActiveResultTab,
    isSidebarOpen,
    toggleSidebar,
    mobileView,
    setMobileView,
  } = useUIStore()

  const [editorHeight, setEditorHeight] = useState<number>(45) // percentage on desktop
  const [isMobile, setIsMobile] = useState<boolean>(
    () => typeof window !== 'undefined' && window.innerWidth < 768
  )

  useEffect(() => {
    // Initialize PostgreSQL engine on mount
    init('main', 'idb')

    // Handle viewport resize for mobile breakpoint
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', handleResize)

    // Check for shared SQL fiddle in URL hash
    if (window.location.hash.startsWith('#fiddle=')) {
      try {
        const raw = window.location.hash.slice(8)
        const decompressed = LZString.decompressFromEncodedURIComponent(raw)
        if (decompressed) {
          const payload = JSON.parse(decompressed)
          if (payload && payload.sql) {
            addTab(payload.title || 'Shared Query.sql', payload.sql)
          }
        }
      } catch (err) {
        console.warn('Failed to parse URL fiddle:', err)
      }
    }

    return () => window.removeEventListener('resize', handleResize)
  }, [init, addTab])

  const handleRunQuery = async () => {
    const sql = getExecutableSql().trim()
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
        setActiveResultTab('table')
      } else if (activeResultTab === 'explain') {
        setActiveResultTab('table')
      }
      // On mobile, auto-switch to results so user sees data
      if (isMobile) {
        setMobileView('results')
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
      if (isMobile) {
        setMobileView('results')
      }
    }
  }

  const handleExplain = async () => {
    const sql = getExecutableSql().trim()
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
      if (isMobile) {
        setMobileView('results')
      }
    } catch (err: unknown) {
      const duration = performance.now() - start
      addToHistory({
        sql: `EXPLAIN ${sql}`,
        durationMs: duration,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      })
      setActiveResultTab('messages')
      if (isMobile) {
        setMobileView('results')
      }
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
        {/* Mobile Backdrop Overlay for Sidebar Drawer */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 md:hidden"
            onClick={toggleSidebar}
          />
        )}

        {/* Schema Catalog Sidebar */}
        {isSidebarOpen && <Sidebar />}

        {/* Desktop Sidebar Toggle Floating Button */}
        <button
          onClick={toggleSidebar}
          className="hidden md:flex absolute z-30 top-2.5 p-1 bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-100 rounded shadow-md opacity-80 hover:opacity-100 transition-opacity"
          title={isSidebarOpen ? 'Collapse Sidebar' : 'Expand Sidebar'}
          style={{ left: isSidebarOpen ? '17.2rem' : '0.5rem' }}
        >
          {isSidebarOpen ? <PanelLeftClose size={13} /> : <PanelLeftOpen size={13} />}
        </button>

        {/* Center Panel (Split view on desktop, Tab-switched view on mobile) */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile View Switcher Segmented Control (< md) */}
          {isMobile && (
            <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 shrink-0">
              <div className="flex bg-slate-950 p-0.5 rounded-lg border border-slate-800 text-xs w-full">
                <button
                  onClick={() => setMobileView('editor')}
                  className={`flex-1 py-1 text-center font-medium rounded-md transition-all ${
                    mobileView === 'editor'
                      ? 'bg-cyan-500 text-slate-950 shadow font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  SQL Editor
                </button>
                <button
                  onClick={() => setMobileView('results')}
                  className={`flex-1 py-1 text-center font-medium rounded-md transition-all flex items-center justify-center gap-1.5 ${
                    mobileView === 'results'
                      ? 'bg-cyan-500 text-slate-950 shadow font-semibold'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span>Results Workbench</span>
                  {activeResult && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                        mobileView === 'results'
                          ? 'bg-slate-950 text-cyan-300 font-bold'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {activeResult.rowCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Desktop Dual-Pane / Mobile Single-Pane Layout */}
          {isMobile ? (
            /* Mobile Single Pane Mode */
            mobileView === 'editor' ? (
              <div className="flex-1 flex flex-col overflow-hidden">
                <EditorTabs />
                <QueryToolbar
                  onRun={handleRunQuery}
                  onExplain={handleExplain}
                  onFormat={handleFormat}
                />
                <div className="flex-1 overflow-hidden">
                  <SqlEditor
                    onRun={handleRunQuery}
                    onExplain={handleExplain}
                    onFormat={handleFormat}
                  />
                </div>
              </div>
            ) : (
              <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
                <ResultTabs />
                <div className="flex-1 overflow-hidden relative">
                  {activeResultTab === 'table' && <DataGrid />}
                  {activeResultTab === 'explain' && <ExplainPlanView />}
                  {activeResultTab === 'vector' && <VectorScatterView />}
                  {activeResultTab === 'erd' && <ERDiagramView />}
                  {activeResultTab === 'messages' && <MessagesLog />}
                </div>
              </div>
            )
          ) : (
            /* Desktop Split Pane Mode */
            <>
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
                  <SqlEditor
                    onRun={handleRunQuery}
                    onExplain={handleExplain}
                    onFormat={handleFormat}
                  />
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
                  {activeResultTab === 'erd' && <ERDiagramView />}
                  {activeResultTab === 'messages' && <MessagesLog />}
                </div>
              </div>
            </>
          )}
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
      <JsonInspectorModal />
      <ImportDataModal />
      <VectorAssistantModal />
    </div>
  )
}

export default App
