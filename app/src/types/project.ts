export type ProjectStatus = 'active' | 'inactive' | 'development' | 'docs-only'

export interface PRDProgress {
  id: string
  title: string
  totalItems: number
  completedItems: number
  progress: number
}

export type DifficultyLevel = 'low' | 'medium' | 'high' | 'unknown'

export interface GitHubStats {
  recentCommits: number
  openPRs: number
  openIssues: number
  lastCommitDate?: string
  lastCommitMessage?: string
  totalCommits?: number
  totalIssues?: number
  lastIssueTitle?: string
  difficulty?: DifficultyLevel
}

export interface ServiceStatus {
  name: string
  status: 'healthy' | 'unhealthy' | 'unknown'
  responseTime?: number
}

export interface HealthEndpoint {
  url: string
  path: string  // /health, /health/ready 등
}

export interface HealthCheckResult {
  projectId: string
  status: 'online' | 'offline' | 'unknown'
  checkedAt: string
  responseTime?: number
  details?: {
    status?: string
    version?: string
    uptime?: number
    components?: Record<string, string>
  }
  error?: string
}

export interface Project {
  id: string
  name: string
  displayName: string
  description: string
  path: string
  status: ProjectStatus
  techStack: string[]
  prds: PRDProgress[]
  overallProgress: number
  services: ServiceStatus[]
  github: GitHubStats
  githubUrl?: string
  healthEndpoint?: HealthEndpoint
  dependencies: {
    incoming: string[]
    outgoing: string[]
  }
}

export interface ProjectSummary {
  totalProjects: number
  activeProjects: number
  developmentProjects: number
  docsOnlyProjects: number
  overallProgress: number
  healthyServices: number
  totalServices: number
}
