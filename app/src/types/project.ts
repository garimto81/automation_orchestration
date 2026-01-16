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
