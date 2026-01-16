import { useQuery, useQueryClient } from '@tanstack/react-query'
import { healthCheckService } from '@/services'
import type { HealthCheckResult, Project } from '@/types'

const QUERY_KEY = ['healthCheck']

interface UseHealthCheckOptions {
  enabled?: boolean
  staleTime?: number
}

/**
 * 단일 프로젝트 Health Check 훅
 */
export function useProjectHealthCheck(
  project: Project | null,
  options: UseHealthCheckOptions = {}
) {
  const { enabled = true, staleTime = 5 * 60 * 1000 } = options

  return useQuery({
    queryKey: [...QUERY_KEY, project?.id],
    queryFn: async (): Promise<HealthCheckResult | null> => {
      if (!project) return null

      // 캐시된 결과 확인
      const cached = healthCheckService.getCachedResult(project.id)
      if (cached) {
        return cached
      }

      // Health Check 실행
      const result = await healthCheckService.checkHealth(
        project.id,
        project.healthEndpoint
      )

      // 결과 캐시
      const allCached = healthCheckService.getCachedResults() ?? []
      const updated = allCached.filter(r => r.projectId !== project.id)
      updated.push(result)
      healthCheckService.cacheResults(updated)

      return result
    },
    enabled: enabled && !!project,
    staleTime,
    gcTime: staleTime * 2,
  })
}

/**
 * 모든 프로젝트 Health Check 훅
 */
export function useAllHealthCheck(
  projects: Project[],
  options: UseHealthCheckOptions = {}
) {
  const { enabled = true, staleTime = 5 * 60 * 1000 } = options

  return useQuery({
    queryKey: [...QUERY_KEY, 'all'],
    queryFn: async (): Promise<HealthCheckResult[]> => {
      // 캐시된 결과 확인
      const cached = healthCheckService.getCachedResults()
      if (cached && cached.length === projects.length) {
        return cached
      }

      // 전체 Health Check 실행
      const results = await healthCheckService.checkAllHealth(
        projects.map(p => ({
          id: p.id,
          healthEndpoint: p.healthEndpoint,
        }))
      )

      // 결과 캐시
      healthCheckService.cacheResults(results)

      return results
    },
    enabled: enabled && projects.length > 0,
    staleTime,
    gcTime: staleTime * 2,
  })
}

/**
 * Health Check 새로고침 함수
 */
export function useHealthCheckRefresh() {
  const queryClient = useQueryClient()

  return {
    /**
     * 특정 프로젝트 새로고침
     */
    refreshProject: (projectId: string) => {
      queryClient.invalidateQueries({
        queryKey: [...QUERY_KEY, projectId],
      })
    },

    /**
     * 전체 새로고침
     */
    refreshAll: () => {
      healthCheckService.clearCache()
      queryClient.invalidateQueries({
        queryKey: QUERY_KEY,
      })
    },
  }
}
