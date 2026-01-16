import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { edgeService } from '@/services'
import type { AppEdge } from '@/types'

interface UseEdgesResult {
  edges: AppEdge[] | undefined
  isLoading: boolean
  isError: boolean
  isMockMode: boolean
  saveEdge: (edge: AppEdge) => void
  deleteEdge: (edgeId: string) => void
  syncEdges: (edges: AppEdge[]) => void
  isSaving: boolean
  isDeleting: boolean
  isSyncing: boolean
}

/**
 * Supabase Edge CRUD 훅
 *
 * @returns Edge 데이터 및 CRUD 함수
 *
 * @example
 * ```tsx
 * const { edges, saveEdge, deleteEdge } = useEdges()
 *
 * // 새 Edge 저장
 * saveEdge({ id: 'edge-1', source: 'node-1', target: 'node-2' })
 *
 * // Edge 삭제
 * deleteEdge('edge-1')
 * ```
 */
export function useEdges(): UseEdgesResult {
  const queryClient = useQueryClient()
  const isMockMode = edgeService.isMockMode()

  // Edge 목록 조회
  const { data: edges, isLoading, isError } = useQuery({
    queryKey: ['edges'],
    queryFn: edgeService.fetchEdges,
    enabled: !isMockMode,
    staleTime: 30 * 1000, // 30초 캐시
  })

  // Edge 저장
  const saveMutation = useMutation({
    mutationFn: edgeService.saveEdge,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['edges'] })
    },
    onError: (error) => {
      console.error('[useEdges] Failed to save edge:', error)
    },
  })

  // Edge 삭제
  const deleteMutation = useMutation({
    mutationFn: edgeService.deleteEdge,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['edges'] })
    },
    onError: (error) => {
      console.error('[useEdges] Failed to delete edge:', error)
    },
  })

  // 전체 Edge 동기화
  const syncMutation = useMutation({
    mutationFn: edgeService.syncEdges,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['edges'] })
    },
    onError: (error) => {
      console.error('[useEdges] Failed to sync edges:', error)
    },
  })

  return {
    edges,
    isLoading,
    isError,
    isMockMode,
    saveEdge: saveMutation.mutate,
    deleteEdge: deleteMutation.mutate,
    syncEdges: syncMutation.mutate,
    isSaving: saveMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isSyncing: syncMutation.isPending,
  }
}
