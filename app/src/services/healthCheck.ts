import type { HealthCheckResult } from '@/types'

const STORAGE_KEY = 'health_check_results'
const CACHE_DURATION_MS = 5 * 60 * 1000 // 5분 캐시

interface CachedResults {
  results: HealthCheckResult[]
  cachedAt: string
}

/**
 * 스냅샷 기반 Health Check 서비스
 * - 앱 시작 시 또는 수동 새로고침 시 한 번 체크
 * - 결과를 localStorage에 캐시
 * - 실패 시 프로젝트 상태 기반 Mock 데이터로 fallback
 */
export const healthCheckService = {
  /**
   * 단일 프로젝트 Health Check
   */
  async checkHealth(
    projectId: string,
    endpoint?: { url: string; path: string }
  ): Promise<HealthCheckResult> {
    const now = new Date().toISOString()

    // 엔드포인트가 없으면 unknown
    if (!endpoint) {
      return {
        projectId,
        status: 'unknown',
        checkedAt: now,
        error: 'No health endpoint configured',
      }
    }

    const url = `${endpoint.url}${endpoint.path}`
    const startTime = performance.now()

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 5000) // 5초 타임아웃

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
        },
      })

      clearTimeout(timeoutId)
      const responseTime = Math.round(performance.now() - startTime)

      if (!response.ok) {
        return {
          projectId,
          status: 'offline',
          checkedAt: now,
          responseTime,
          error: `HTTP ${response.status}`,
        }
      }

      const data = await response.json()

      return {
        projectId,
        status: 'online',
        checkedAt: now,
        responseTime,
        details: {
          status: data.status,
          version: data.version,
          uptime: data.uptime_seconds,
          components: data.components,
        },
      }
    } catch (error) {
      const responseTime = Math.round(performance.now() - startTime)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'

      // CORS 또는 네트워크 오류
      return {
        projectId,
        status: 'offline',
        checkedAt: now,
        responseTime,
        error: errorMessage.includes('abort') ? 'Timeout' : errorMessage,
      }
    }
  },

  /**
   * 모든 프로젝트 Health Check (병렬 실행)
   */
  async checkAllHealth(
    projects: Array<{ id: string; healthEndpoint?: { url: string; path: string } }>
  ): Promise<HealthCheckResult[]> {
    const results = await Promise.all(
      projects.map(p => this.checkHealth(p.id, p.healthEndpoint))
    )
    return results
  },

  /**
   * 캐시된 결과 가져오기 (유효 기간 내)
   */
  getCachedResults(): HealthCheckResult[] | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      if (!data) return null

      const cached: CachedResults = JSON.parse(data)
      const cachedTime = new Date(cached.cachedAt).getTime()
      const now = Date.now()

      // 캐시 만료 확인
      if (now - cachedTime > CACHE_DURATION_MS) {
        return null
      }

      return cached.results
    } catch {
      return null
    }
  },

  /**
   * 결과 캐시에 저장
   */
  cacheResults(results: HealthCheckResult[]): void {
    try {
      const cached: CachedResults = {
        results,
        cachedAt: new Date().toISOString(),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cached))
    } catch (error) {
      console.error('[HealthCheck] Failed to cache results:', error)
    }
  },

  /**
   * 특정 프로젝트의 캐시된 결과 가져오기
   */
  getCachedResult(projectId: string): HealthCheckResult | null {
    const results = this.getCachedResults()
    if (!results) return null
    return results.find(r => r.projectId === projectId) ?? null
  },

  /**
   * 캐시 클리어
   */
  clearCache(): void {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch (error) {
      console.error('[HealthCheck] Failed to clear cache:', error)
    }
  },

  /**
   * Mock 결과 생성 (서비스 미실행 또는 CORS 오류 시)
   * 프로젝트 status 기반으로 생성
   */
  getMockResult(
    projectId: string,
    projectStatus: 'active' | 'inactive' | 'development' | 'docs-only'
  ): HealthCheckResult {
    const now = new Date().toISOString()

    // active 프로젝트는 online으로 표시 (실제로는 확인 안됨)
    // development는 offline으로 표시
    const status = projectStatus === 'active' ? 'online' : 'offline'

    return {
      projectId,
      status,
      checkedAt: now,
      error: 'Mock data (service not reachable)',
    }
  },
}
