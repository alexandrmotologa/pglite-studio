import { create } from 'zustand'

export type ResultTabType = 'table' | 'explain' | 'vector' | 'messages'

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
}))
