import React, { useState, useRef, useEffect } from 'react'
import {
  GitBranch,
  BookOpen,
  Download,
  Upload,
  History,
  RotateCcw,
  ChevronDown,
  Cpu,
  Share2,
  Check,
  MoreVertical,
  PanelLeft,
} from 'lucide-react'
import LZString from 'lz-string'
import { Button } from '../UI/Button'
import { Badge } from '../UI/Badge'
import { useDbStore } from '../../store/dbStore'
import { useUIStore } from '../../store/uiStore'
import { useEditorStore } from '../../store/editorStore'

export const Header: React.FC = () => {
  const { activeBranch, branches, switchBranch, init, storageType } = useDbStore()
  const {
    setBranchModalOpen,
    setExportModalOpen,
    setSamplesModalOpen,
    setHistoryModalOpen,
    setImportModalOpen,
    toggleSidebar,
    isSidebarOpen,
  } = useUIStore()
  const { getActiveTab } = useEditorStore()

  const [copiedFiddle, setCopiedFiddle] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  const handleReset = async () => {
    if (confirm(`Reset branch '${activeBranch}' to an empty database state?`)) {
      await init(activeBranch, storageType)
    }
  }

  const handleShareFiddle = () => {
    const activeTab = getActiveTab()
    const payload = {
      title: activeTab.title,
      sql: activeTab.sql,
    }
    const compressed = LZString.compressToEncodedURIComponent(JSON.stringify(payload))
    const shareUrl = `${window.location.origin}${window.location.pathname}#fiddle=${compressed}`

    navigator.clipboard.writeText(shareUrl)
    setCopiedFiddle(true)
    setTimeout(() => setCopiedFiddle(false), 2000)
  }

  return (
    <header className="h-13 bg-slate-950 border-b border-slate-800/80 px-2.5 sm:px-4 flex items-center justify-between shrink-0 select-none relative z-30">
      {/* Brand & Title + Mobile Sidebar Toggle */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Sidebar Toggle Button */}
        <button
          onClick={toggleSidebar}
          className={`md:hidden p-1.5 rounded border transition-colors ${
            isSidebarOpen
              ? 'bg-cyan-950/80 border-cyan-700/80 text-cyan-400'
              : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-100'
          }`}
          title="Toggle Schema Catalog"
        >
          <PanelLeft size={16} />
        </button>

        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-indigo-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-inner shrink-0">
            <Cpu size={18} />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="font-bold text-slate-100 tracking-tight text-xs sm:text-sm truncate">
                PGLite Studio
              </span>
              <Badge variant="cyan" size="xs" className="hidden sm:inline-flex">
                pgvector 0.7+
              </Badge>
              <Badge variant="indigo" size="xs" className="hidden md:inline-flex">
                WASM
              </Badge>
            </div>
            <span className="text-[11px] text-slate-500 leading-none hidden md:block">
              Client-Side PostgreSQL Workbench
            </span>
          </div>
        </div>

        <div className="h-5 w-px bg-slate-800 mx-0.5 sm:mx-1 hidden sm:block" />

        {/* Branch Selector */}
        <div className="flex items-center gap-1">
          <div className="relative flex items-center">
            <GitBranch size={12} className="absolute left-2 text-cyan-400 pointer-events-none" />
            <select
              value={activeBranch}
              onChange={(e) => {
                if (e.target.value === '__manage__') {
                  setBranchModalOpen(true)
                } else {
                  switchBranch(e.target.value)
                }
              }}
              className="pl-6 pr-5 py-1 text-xs bg-slate-900 border border-slate-700/80 text-slate-200 rounded-md focus:outline-none focus:border-cyan-500 appearance-none cursor-pointer max-w-24 sm:max-w-32 md:max-w-none truncate"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.id === 'main' ? '(default)' : ''}
                </option>
              ))}
              <option value="__manage__">+ Manage branches...</option>
            </select>
            <ChevronDown size={11} className="absolute right-1.5 text-slate-400 pointer-events-none" />
          </div>

          <Button
            data-action="snapshots"
            variant="ghost"
            size="xs"
            onClick={() => setBranchModalOpen(true)}
            title="Branch Manager"
            className="hidden xl:inline-flex"
          >
            Snapshots
          </Button>
        </div>
      </div>

      {/* Desktop Action Toolbar (Large screens) */}
      <div className="hidden lg:flex items-center gap-2">
        <Button
          data-action="sample-demos"
          variant="secondary"
          size="xs"
          icon={<BookOpen size={13} className="text-cyan-400" />}
          onClick={() => setSamplesModalOpen(true)}
        >
          Sample Demos
        </Button>

        <Button
          data-action="import-data"
          variant="secondary"
          size="xs"
          icon={<Upload size={13} className="text-emerald-400" />}
          onClick={() => setImportModalOpen(true)}
          title="Import CSV or JSON Dataset"
        >
          Import Data
        </Button>

        <Button
          data-action="share-fiddle"
          variant="secondary"
          size="xs"
          icon={
            copiedFiddle ? (
              <Check size={13} className="text-emerald-400" />
            ) : (
              <Share2 size={13} className="text-cyan-400" />
            )
          }
          onClick={handleShareFiddle}
          title="Share SQL Fiddle URL via compressed hash"
        >
          {copiedFiddle ? 'Link Copied!' : 'Share Fiddle'}
        </Button>

        <Button
          data-action="history"
          variant="secondary"
          size="xs"
          icon={<History size={13} className="text-slate-400" />}
          onClick={() => setHistoryModalOpen(true)}
        >
          History
        </Button>

        <div className="h-4 w-px bg-slate-800" />

        <Button
          data-action="export-sql"
          variant="secondary"
          size="xs"
          icon={<Download size={13} className="text-slate-400" />}
          onClick={() => setExportModalOpen(true)}
        >
          Export SQL
        </Button>

        <Button
          data-action="reset-db"
          variant="ghost"
          size="xs"
          icon={<RotateCcw size={13} className="text-slate-400" />}
          onClick={handleReset}
          title="Reset database to fresh state"
        >
          Reset DB
        </Button>
      </div>

      {/* Mobile & Tablet Compact Action Toolbar (< lg screens) */}
      <div className="lg:hidden flex items-center gap-1.5" ref={menuRef}>
        <Button
          data-action="sample-demos-compact"
          variant="secondary"
          size="xs"
          icon={<BookOpen size={13} className="text-cyan-400" />}
          onClick={() => setSamplesModalOpen(true)}
          className="hidden sm:inline-flex"
        >
          Demos
        </Button>

        <Button
          data-action="share-fiddle-compact"
          variant="secondary"
          size="xs"
          icon={
            copiedFiddle ? (
              <Check size={13} className="text-emerald-400" />
            ) : (
              <Share2 size={13} className="text-cyan-400" />
            )
          }
          onClick={handleShareFiddle}
          title="Share SQL Fiddle URL"
        >
          <span className="hidden sm:inline">{copiedFiddle ? 'Copied' : 'Share'}</span>
        </Button>

        {/* More Menu Dropdown Toggle */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="p-1.5 text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-md transition-colors flex items-center justify-center"
            title="More Studio Actions"
          >
            <MoreVertical size={15} />
          </button>

          {/* Popover Dropdown */}
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1.5 w-48 bg-slate-900 border border-slate-800 rounded-lg shadow-2xl py-1 text-xs z-50 animate-in fade-in zoom-in-95 duration-100">
              <button
                onClick={() => {
                  setSamplesModalOpen(true)
                  setMenuOpen(false)
                }}
                className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-800 text-slate-200 transition-colors"
              >
                <BookOpen size={14} className="text-cyan-400" />
                <span>Sample Demos</span>
              </button>

              <button
                onClick={() => {
                  setImportModalOpen(true)
                  setMenuOpen(false)
                }}
                className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-800 text-slate-200 transition-colors"
              >
                <Upload size={14} className="text-emerald-400" />
                <span>Import CSV / JSON</span>
              </button>

              <button
                onClick={() => {
                  handleShareFiddle()
                  setMenuOpen(false)
                }}
                className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-800 text-slate-200 transition-colors"
              >
                <Share2 size={14} className="text-cyan-400" />
                <span>Share Fiddle URL</span>
              </button>

              <button
                onClick={() => {
                  setHistoryModalOpen(true)
                  setMenuOpen(false)
                }}
                className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-800 text-slate-200 transition-colors"
              >
                <History size={14} className="text-slate-400" />
                <span>Query History</span>
              </button>

              <div className="my-1 border-t border-slate-800" />

              <button
                onClick={() => {
                  setExportModalOpen(true)
                  setMenuOpen(false)
                }}
                className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-800 text-slate-200 transition-colors"
              >
                <Download size={14} className="text-slate-400" />
                <span>Export SQL Dump</span>
              </button>

              <button
                onClick={() => {
                  setBranchModalOpen(true)
                  setMenuOpen(false)
                }}
                className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-slate-800 text-slate-200 transition-colors"
              >
                <GitBranch size={14} className="text-indigo-400" />
                <span>Branch Snapshots</span>
              </button>

              <div className="my-1 border-t border-slate-800" />

              <button
                onClick={() => {
                  setMenuOpen(false)
                  handleReset()
                }}
                className="w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-rose-950/40 text-rose-400 transition-colors"
              >
                <RotateCcw size={14} />
                <span>Reset Database</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

export default Header
