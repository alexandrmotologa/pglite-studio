import { create } from 'zustand'
import { QueryHistoryItem } from '../types/database'

export interface EditorTab {
  id: string
  title: string
  sql: string
}

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

interface EditorState {
  tabs: EditorTab[]
  activeTabId: string
  history: QueryHistoryItem[]

  // Actions
  setActiveTab: (id: string) => void
  addTab: (title?: string, sql?: string) => void
  closeTab: (id: string) => void
  updateSql: (sql: string) => void
  addToHistory: (item: Omit<QueryHistoryItem, 'id' | 'timestamp'>) => void
  getActiveTab: () => EditorTab
}

export const useEditorStore = create<EditorState>((set, get) => ({
  tabs: [
    {
      id: 'tab-1',
      title: 'Vector Sandbox.sql',
      sql: DEFAULT_SQL,
    },
  ],
  activeTabId: 'tab-1',
  history: [],

  setActiveTab: (id: string) => set({ activeTabId: id }),

  addTab: (title?: string, sql?: string) => {
    const count = get().tabs.length + 1
    const newId = `tab-${Date.now()}`
    const newTab: EditorTab = {
      id: newId,
      title: title || `Query ${count}.sql`,
      sql: sql || 'SELECT * FROM pg_catalog.pg_tables WHERE schemaname = \'public\';',
    }
    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newId,
    }))
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
  },

  updateSql: (sql: string) => {
    const { activeTabId, tabs } = get()
    set({
      tabs: tabs.map((t) => (t.id === activeTabId ? { ...t, sql } : t)),
    })
  },

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
}))
