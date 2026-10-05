import { create } from 'zustand'
import { Branch, DatabaseCatalog, QueryResult } from '../types/database'
import { PostgresExplainOutput } from '../types/explain'
import { pgliteClient } from '../engine/client'

export interface LogMessage {
  id: string
  text: string
  time: string
  type: 'info' | 'notice' | 'error' | 'success'
}

interface DbState {
  status: 'loading' | 'ready' | 'running' | 'error'
  errorMessage: string | null
  activeBranch: string
  branches: Branch[]
  storageType: 'idb' | 'memory'
  catalog: DatabaseCatalog | null
  activeResult: QueryResult | null
  activeExplain: { planOutput: PostgresExplainOutput; executionTimeMs: number } | null
  logs: LogMessage[]
  lastExecutionMs: number | null

  // Actions
  init: (branchId?: string, storageType?: 'idb' | 'memory') => Promise<void>
  runQuery: (sql: string) => Promise<QueryResult>
  runExplain: (sql: string) => Promise<void>
  refreshCatalog: () => Promise<void>
  switchBranch: (branchId: string) => Promise<void>
  createBranch: (name: string) => Promise<void>
  deleteBranch: (branchId: string) => Promise<void>
  cancelQuery: () => void
  addLog: (text: string, type?: LogMessage['type']) => void
  clearLogs: () => void
}

const DEFAULT_BRANCH: Branch = {
  id: 'main',
  name: 'main',
  createdAt: Date.now(),
  isCurrent: true,
  databaseName: 'pglite-studio-main',
}

export const useDbStore = create<DbState>((set, get) => ({
  status: 'loading',
  errorMessage: null,
  activeBranch: 'main',
  branches: [DEFAULT_BRANCH],
  storageType: 'idb',
  catalog: null,
  activeResult: null,
  activeExplain: null,
  logs: [],
  lastExecutionMs: null,

  init: async (branchId = 'main', storageType = 'idb') => {
    set({ status: 'loading', errorMessage: null, activeBranch: branchId, storageType })
    get().addLog(`Starting PostgreSQL 16 WASM engine on branch '${branchId}'...`, 'info')

    try {
      pgliteClient.onNotice((msg, sev) => {
        get().addLog(`[Postgres ${sev || 'NOTICE'}] ${msg}`, 'notice')
      })

      await pgliteClient.init(branchId, storageType)
      set({ status: 'ready' })
      get().addLog(`PostgreSQL 16 ready. pgvector extension active.`, 'success')

      await get().refreshCatalog()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      set({ status: 'error', errorMessage: msg })
      get().addLog(`Initialization error: ${msg}`, 'error')
    }
  },

  runQuery: async (sql: string) => {
    const trimmed = sql.trim()
    if (!trimmed) throw new Error('Query cannot be empty')

    set({ status: 'running', errorMessage: null })
    const startTime = Date.now()

    try {
      const result = await pgliteClient.query(trimmed)
      const duration = Date.now() - startTime

      set({
        status: 'ready',
        activeResult: result,
        lastExecutionMs: result.executionTimeMs,
      })

      get().addLog(
        `Executed query in ${result.executionTimeMs}ms (${result.rowCount} rows returned)`,
        'success'
      )

      // Refresh catalog if DDL command
      if (/^\s*(CREATE|ALTER|DROP|TRUNCATE)/i.test(trimmed)) {
        await get().refreshCatalog()
      }

      return result
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      set({ status: 'ready', errorMessage: msg })
      get().addLog(`Query error: ${msg}`, 'error')
      throw err
    }
  },

  runExplain: async (sql: string) => {
    const trimmed = sql.trim()
    if (!trimmed) throw new Error('Query cannot be empty')

    set({ status: 'running', errorMessage: null })

    try {
      const explainRes = await pgliteClient.explain(trimmed)
      set({
        status: 'ready',
        activeExplain: explainRes,
        lastExecutionMs: explainRes.executionTimeMs,
      })
      get().addLog(`Generated EXPLAIN plan in ${explainRes.executionTimeMs}ms`, 'success')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      set({ status: 'ready', errorMessage: msg })
      get().addLog(`EXPLAIN error: ${msg}`, 'error')
      throw err
    }
  },

  refreshCatalog: async () => {
    try {
      const catalog = await pgliteClient.fetchCatalog()
      set({ catalog })
    } catch (err) {
      console.error('Failed to fetch catalog:', err)
    }
  },

  switchBranch: async (branchId: string) => {
    const branches = get().branches.map((b) => ({
      ...b,
      isCurrent: b.id === branchId,
    }))
    set({ branches, activeBranch: branchId })
    await get().init(branchId, get().storageType)
  },

  createBranch: async (name: string) => {
    const id = name.toLowerCase().replace(/[^a-z0-9_-]/g, '_')
    const newBranch: Branch = {
      id,
      name,
      createdAt: Date.now(),
      isCurrent: true,
      databaseName: `pglite-studio-${id}`,
    }

    const branches = get().branches.map((b) => ({ ...b, isCurrent: false })).concat(newBranch)
    set({ branches, activeBranch: id })
    get().addLog(`Created database branch '${name}'`, 'info')
    await get().init(id, get().storageType)
  },

  deleteBranch: async (branchId: string) => {
    if (branchId === 'main') {
      get().addLog(`Cannot delete 'main' branch`, 'error')
      return
    }
    const filtered = get().branches.filter((b) => b.id !== branchId)
    set({ branches: filtered })
    if (get().activeBranch === branchId) {
      await get().switchBranch('main')
    }
  },

  cancelQuery: () => {
    pgliteClient.cancelRunningQuery()
    set({ status: 'ready' })
    get().addLog(`Query execution was cancelled`, 'notice')
  },

  addLog: (text: string, type: LogMessage['type'] = 'info') => {
    const time = new Date().toLocaleTimeString()
    const msg: LogMessage = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      text,
      time,
      type,
    }
    set((state) => ({ logs: [...state.logs.slice(-200), msg] }))
  },

  clearLogs: () => set({ logs: [] }),
}))
