import { useQuery } from '@tanstack/react-query'
import { fetchGitHubStats } from '@/services'
import type { GitHubStats } from '@/types'

interface UseGitHubStatsResult {
  data: GitHubStats | undefined
  isLoading: boolean
  isError: boolean
  error: Error | null
  refetch: () => void
}

/**
 * GitHub 저장소 통계를 가져오는 훅
 *
 * @param githubUrl - GitHub 저장소 URL (optional)
 * @returns GitHub 통계 데이터 및 로딩/에러 상태
 *
 * @example
 * ```tsx
 * const { data, isLoading } = useGitHubStats('https://github.com/owner/repo')
 * if (isLoading) return <Loading />
 * return <div>{data?.openIssues} open issues</div>
 * ```
 */
export function useGitHubStats(githubUrl: string | undefined): UseGitHubStatsResult {
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['github-stats', githubUrl],
    queryFn: () => fetchGitHubStats(githubUrl!),
    enabled: !!githubUrl,
    staleTime: 5 * 60 * 1000, // 5분 캐시
    gcTime: 10 * 60 * 1000, // 10분 후 GC
    retry: 1, // 1회 재시도
    retryDelay: 1000, // 1초 후 재시도
  })

  return {
    data,
    isLoading,
    isError,
    error: error as Error | null,
    refetch,
  }
}
