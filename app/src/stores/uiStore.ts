import { create } from 'zustand'

interface UIState {
  selectedProjectId: string | null
  setSelectedProject: (id: string | null) => void
}

export const useUIStore = create<UIState>((set) => ({
  selectedProjectId: 'ae', // Default selected
  setSelectedProject: (id) => set({ selectedProjectId: id }),
}))
