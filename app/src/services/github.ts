import type { GitHubStats, DifficultyLevel } from '@/types'

const GITHUB_API_BASE = 'https://api.github.com'

// Rate limit 관리를 위한 캐시
const cache = new Map<string, { data: GitHubStats; timestamp: number }>()
const CACHE_TTL = 5 * 60 * 1000 // 5분

/**
 * GitHub URL에서 owner/repo 추출
 */
function parseRepoUrl(url: string): [string, string] | null {
  const match = url.match(/github\.com\/([^/]+)\/([^/]+)/)
  if (!match) return null
  return [match[1], match[2].replace(/\.git$/, '')]
}

/**
 * 난이도 계산
 * - 이슈/커밋이 많으면 활발한 작업 중 (난이도 높음)
 * - 적으면 초기 단계 또는 안정화 (난이도 낮음)
 */
function calculateDifficulty(openIssues: number, recentCommits: number): DifficultyLevel {
  const score = openIssues * 2 + recentCommits
  if (score < 5) return 'low'
  if (score < 15) return 'medium'
  return 'high'
}

/**
 * GitHub API 헤더 생성
 */
function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    Accept: 'application/vnd.github.v3+json',
  }

  // 환경 변수에 토큰이 있으면 사용 (Rate Limit 증가)
  const token = import.meta.env.VITE_GITHUB_TOKEN
  if (token) {
    headers.Authorization = `token ${token}`
  }

  return headers
}

/**
 * GitHub 저장소 통계 조회
 */
export async function fetchGitHubStats(githubUrl: string): Promise<GitHubStats> {
  // 캐시 확인
  const cached = cache.get(githubUrl)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  const parsed = parseRepoUrl(githubUrl)
  if (!parsed) {
    return {
      recentCommits: 0,
      openPRs: 0,
      openIssues: 0,
      difficulty: 'unknown',
    }
  }

  const [owner, repo] = parsed
  const headers = getHeaders()

  try {
    // 병렬 API 호출
    const [repoResponse, commitsResponse, issuesResponse] = await Promise.all([
      fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}`, { headers }),
      fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/commits?per_page=30`, { headers }),
      fetch(`${GITHUB_API_BASE}/repos/${owner}/${repo}/issues?state=open&per_page=10`, { headers }),
    ])

    // Rate limit 체크
    if (repoResponse.status === 403) {
      console.warn('[GitHub] Rate limit exceeded')
      return {
        recentCommits: 0,
        openPRs: 0,
        openIssues: 0,
        difficulty: 'unknown',
      }
    }

    const repoData = await repoResponse.json()
    const commitsData = await commitsResponse.json()
    const issuesData = await issuesResponse.json()

    // 최근 7일 커밋 수 계산
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const recentCommits = Array.isArray(commitsData)
      ? commitsData.filter(
          (c: { commit?: { author?: { date?: string } } }) =>
            c.commit?.author?.date && new Date(c.commit.author.date) > weekAgo
        ).length
      : 0

    // 최신 커밋 정보
    const latestCommit = Array.isArray(commitsData) ? commitsData[0] : null
    const lastCommitMessage = latestCommit?.commit?.message?.split('\n')[0] || undefined
    const lastCommitDate = latestCommit?.commit?.author?.date || undefined

    // 최신 이슈 정보 (PR 제외)
    const issues = Array.isArray(issuesData)
      ? issuesData.filter((i: { pull_request?: unknown }) => !i.pull_request)
      : []
    const latestIssue = issues[0] as { title?: string } | undefined
    const lastIssueTitle = latestIssue?.title

    // Open PRs 계산 (issues API에서 PR도 포함됨)
    const openPRs = Array.isArray(issuesData)
      ? issuesData.filter((i: { pull_request?: unknown }) => i.pull_request).length
      : 0

    const openIssues = repoData.open_issues_count - openPRs

    const stats: GitHubStats = {
      recentCommits,
      openPRs,
      openIssues: Math.max(0, openIssues),
      lastCommitDate,
      lastCommitMessage,
      totalCommits: Array.isArray(commitsData) ? commitsData.length : 0,
      totalIssues: issues.length,
      lastIssueTitle,
      difficulty: calculateDifficulty(openIssues, recentCommits),
    }

    // 캐시 저장
    cache.set(githubUrl, { data: stats, timestamp: Date.now() })

    return stats
  } catch (error) {
    console.error('[GitHub] Failed to fetch stats:', error)
    return {
      recentCommits: 0,
      openPRs: 0,
      openIssues: 0,
      difficulty: 'unknown',
    }
  }
}

/**
 * 캐시 초기화
 */
export function clearGitHubCache(): void {
  cache.clear()
}

/**
 * 캐시에서 특정 URL 제거
 */
export function invalidateGitHubCache(githubUrl: string): void {
  cache.delete(githubUrl)
}
