import type { AppEdge } from '@/types'

const STORAGE_KEY = 'dashboard_edges'

/**
 * localStorage 기반 Edge 저장소
 */
export const localStorageService = {
  /**
   * 모든 Edge 조회
   */
  getEdges(): AppEdge[] {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      if (!data) return []
      return JSON.parse(data) as AppEdge[]
    } catch (error) {
      console.error('[LocalStorage] Failed to get edges:', error)
      return []
    }
  },

  /**
   * 모든 Edge 저장
   */
  setEdges(edges: AppEdge[]): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(edges))
    } catch (error) {
      console.error('[LocalStorage] Failed to set edges:', error)
    }
  },

  /**
   * 단일 Edge 추가/수정
   */
  upsertEdge(edge: AppEdge): void {
    const edges = this.getEdges()
    const index = edges.findIndex(e => e.id === edge.id)

    if (index >= 0) {
      edges[index] = edge
    } else {
      edges.push(edge)
    }

    this.setEdges(edges)
  },

  /**
   * Edge 삭제
   */
  deleteEdge(edgeId: string): void {
    const edges = this.getEdges()
    const filtered = edges.filter(e => e.id !== edgeId)
    this.setEdges(filtered)
  },

  /**
   * 모든 Edge 삭제
   */
  clear(): void {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.error('[LocalStorage] Failed to clear edges:', error)
    }
  },
}
