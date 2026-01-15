import type { Node } from '@xyflow/react'
import type { Project } from './project'

export interface ProjectNodeData extends Project {
  isSelected?: boolean
}

export type ProjectNode = Node<ProjectNodeData, 'project'>

export interface ServiceNodeData {
  name: string
  project: string
  serviceType: 'api' | 'database' | 'worker' | 'frontend'
  status: 'healthy' | 'unhealthy' | 'unknown'
  port?: number
  responseTime?: number
}

export type ServiceNode = Node<ServiceNodeData, 'service'>

export type AppNode = ProjectNode | ServiceNode
