import { create } from 'zustand'
import { QueryHistoryItem } from '../types/database'

export interface EditorTab {
  id: string
  title: string
  sql: string
}

const STORAGE_KEY_TABS = 'pglite_studio_tabs_v1'
const STORAGE_KEY_ACTIVE = 'pglite_studio_active_tab_v1'

const DEFAULT_SQL = `-- PGLite-Studio: In-Browser PostgreSQL 16 + pgvector Sandbox
CREATE EXTENSION IF NOT EXISTS vector;

-- 1. Create documents table with embeddings
CREATE TABLE IF NOT EXISTS documents (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  embedding vector(3)
);

-- 2. Insert sample vectors
INSERT INTO documents (title, category, embedding) VALUES
('PostgreSQL Architecture', 'database', '[0.92, 0.15, 0.35]'),
('Vector Search & HNSW', 'ai', '[0.88, 0.45, 0.12]'),
('IndexedDB & WebAssembly', 'frontend', '[0.14, 0.95, 0.28]'),
('Distributed Raft Protocol', 'distributed', '[0.35, 0.22, 0.91]'),
('Deep Learning Transformers', 'ai', '[0.82, 0.52, 0.21]'),
('Relational Calculus', 'database', '[0.90, 0.20, 0.30]'),
('Client-Side Storage', 'frontend', '[0.18, 0.92, 0.34]')
ON CONFLICT DO NOTHING;

-- 3. Nearest neighbor search using cosine distance (<=>)
SELECT
  id,
  title,
  category,
  embedding,
  ROUND((1 - (embedding <=> '[0.85, 0.40, 0.20]'))::numeric, 4) AS cosine_similarity
FROM documents
ORDER BY embedding <=> '[0.85, 0.40, 0.20]'
LIMIT 10;
`

function loadInitialTabs(): EditorTab[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_TABS)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch {
    // fallback
  }
  return [
    {
      id: 'tab-1',
      title: 'Vector Sandbox.sql',
      sql: DEFAULT_SQL,
    },
  ]
}

function loadInitialActiveTab(tabs: EditorTab[]): string {
  try {
    const active = localStorage.getItem(STORAGE_KEY_ACTIVE)
    if (active && tabs.some((t) => t.id === active)) {
      return active
    }
  } catch {
    // fallback
  }
  return tabs[0]?.id || 'tab-1'
}

function persistTabs(tabs: EditorTab[], activeTabId: string) {
  try {
    localStorage.setItem(STORAGE_KEY_TABS, JSON.stringify(tabs))
    localStorage.setItem(STORAGE_KEY_ACTIVE, activeTabId)
  } catch {
    // localStorage quota or disabled
  }
}

interface EditorState {
  tabs: EditorTab[]
  activeTabId: string
  selectedText: string
  history: QueryHistoryItem[]

  // Actions
  setActiveTab: (id: string) => void
  addTab: (title?: string, sql?: string) => void
  closeTab: (id: string) => void
  renameTab: (id: string, title: string) => void
  updateSql: (sql: string) => void
  setSelectedText: (text: string) => void
  addToHistory: (item: Omit<QueryHistoryItem, 'id' | 'timestamp'>) => void
  getActiveTab: () => EditorTab
  getExecutableSql: () => string
}

const initialTabs = loadInitialTabs()
const initialActive = loadInitialActiveTab(initialTabs)

export const useEditorStore = create<EditorState>((set, get) => ({
  tabs: initialTabs,
  activeTabId: initialActive,
  selectedText: '',
  history: [],

  setActiveTab: (id: string) => {
    set({ activeTabId: id })
    persistTabs(get().tabs, id)
  },

  addTab: (title?: string, sql?: string) => {
    const count = get().tabs.length + 1
    const newId = `tab-${Date.now()}`
    const newTab: EditorTab = {
      id: newId,
      title: title || `Query ${count}.sql`,
      sql: sql || 'SELECT * FROM pg_catalog.pg_tables WHERE schemaname = \'public\';',
    }
    const updated = [...get().tabs, newTab]
    set({
      tabs: updated,
      activeTabId: newId,
    })
    persistTabs(updated, newId)
  },

  closeTab: (id: string) => {
    const { tabs, activeTabId } = get()
    if (tabs.length <= 1) return // keep at least 1 tab
    const filtered = tabs.filter((t) => t.id !== id)
    let nextActive = activeTabId
    if (activeTabId === id) {
      nextActive = filtered[filtered.length - 1].id
    }
    set({ tabs: filtered, activeTabId: nextActive })
    persistTabs(filtered, nextActive)
  },

  renameTab: (id: string, title: string) => {
    const cleanTitle = title.trim() || 'Query.sql'
    const updated = get().tabs.map((t) => (t.id === id ? { ...t, title: cleanTitle } : t))
    set({ tabs: updated })
    persistTabs(updated, get().activeTabId)
  },

  updateSql: (sql: string) => {
    const { activeTabId, tabs } = get()
    const updated = tabs.map((t) => (t.id === activeTabId ? { ...t, sql } : t))
    set({ tabs: updated })
    persistTabs(updated, activeTabId)
  },

  setSelectedText: (text: string) => set({ selectedText: text }),

  addToHistory: (item) => {
    const historyItem: QueryHistoryItem = {
      ...item,
      id: `hist_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: Date.now(),
    }
    set((state) => ({
      history: [historyItem, ...state.history.slice(0, 49)],
    }))
  },

  getActiveTab: () => {
    const { tabs, activeTabId } = get()
    return tabs.find((t) => t.id === activeTabId) || tabs[0]
  },

  getExecutableSql: () => {
    const selected = get().selectedText.trim()
    if (selected.length > 0) {
      return selected
    }
    return get().getActiveTab().sql
  },
}))
