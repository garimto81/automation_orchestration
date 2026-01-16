import { create } from 'zustand'

export type ViewMode = 'modules' | 'layers' | 'combined'

interface UIState {
  // 뷰 모드 (modules: 기존 6개 노드, layers: 5계층 노드, combined: 둘 다)
  viewMode: ViewMode
  setViewMode: (mode: ViewMode) => void

  // 노드 선택
  selectedProjectId: string | null
  setSelectedProject: (id: string | null) => void

  // 사이드바 토글
  isSidebarOpen: boolean
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void

  // 상세 패널 토글
  isDetailPanelOpen: boolean
  toggleDetailPanel: () => void
  setDetailPanelOpen: (open: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  // 뷰 모드 - 기본은 모듈 뷰 (기존 호환성)
  viewMode: 'modules',
  setViewMode: (mode) => set({ viewMode: mode }),

  // 노드 선택 - 초기값 null (기존 'ae'는 존재하지 않는 ID였음)
  selectedProjectId: null,
  setSelectedProject: (id) => set({ selectedProjectId: id }),

  // 사이드바 - 기본 열림
  isSidebarOpen: true,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),

  // 상세 패널 - 기본 닫힘 (노드 선택 시 열림)
  isDetailPanelOpen: false,
  toggleDetailPanel: () => set((state) => ({ isDetailPanelOpen: !state.isDetailPanelOpen })),
  setDetailPanelOpen: (open) => set({ isDetailPanelOpen: open }),
}))
