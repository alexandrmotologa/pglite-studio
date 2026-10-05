import { create } from 'zustand'

export type ResultTabType = 'table' | 'explain' | 'vector' | 'erd' | 'messages'

export interface JsonInspectorData {
  title: string
  json: unknown
}

interface UIState {
  activeResultTab: ResultTabType
  isSidebarOpen: boolean
  selectedTable: string | null
  searchCatalog: string

  // Modals
  branchModalOpen: boolean
  mockModalOpen: boolean
  mockModalTable: string | null
  exportModalOpen: boolean
  samplesModalOpen: boolean
  historyModalOpen: boolean
  importModalOpen: boolean
  jsonInspectorOpen: boolean
  jsonInspectorData: JsonInspectorData | null
  vectorAssistantModalOpen: boolean

  // Actions
  setActiveResultTab: (tab: ResultTabType) => void
  toggleSidebar: () => void
  setSelectedTable: (table: string | null) => void
  setSearchCatalog: (query: string) => void
  setBranchModalOpen: (open: boolean) => void
  setMockModalOpen: (open: boolean, table?: string) => void
  setExportModalOpen: (open: boolean) => void
  setSamplesModalOpen: (open: boolean) => void
  setHistoryModalOpen: (open: boolean) => void
  setImportModalOpen: (open: boolean) => void
  setJsonInspector: (open: boolean, data?: JsonInspectorData) => void
  setVectorAssistantModalOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  activeResultTab: 'table',
  isSidebarOpen: true,
  selectedTable: null,
  searchCatalog: '',

  branchModalOpen: false,
  mockModalOpen: false,
  mockModalTable: null,
  exportModalOpen: false,
  samplesModalOpen: false,
  historyModalOpen: false,
  importModalOpen: false,
  jsonInspectorOpen: false,
  jsonInspectorData: null,
  vectorAssistantModalOpen: false,

  setActiveResultTab: (tab) => set({ activeResultTab: tab }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSelectedTable: (table) => set({ selectedTable: table }),
  setSearchCatalog: (query) => set({ searchCatalog: query }),
  setBranchModalOpen: (open) => set({ branchModalOpen: open }),
  setMockModalOpen: (open, table) =>
    set({ mockModalOpen: open, mockModalTable: table || null }),
  setExportModalOpen: (open) => set({ exportModalOpen: open }),
  setSamplesModalOpen: (open) => set({ samplesModalOpen: open }),
  setHistoryModalOpen: (open) => set({ historyModalOpen: open }),
  setImportModalOpen: (open) => set({ importModalOpen: open }),
  setJsonInspector: (open, data) =>
    set({ jsonInspectorOpen: open, jsonInspectorData: data || null }),
  setVectorAssistantModalOpen: (open) => set({ vectorAssistantModalOpen: open }),
}))
