import type { Node } from '@xyflow/react'
import type { Project } from './project'

// ===== 기존 노드 타입 =====

export interface ProjectNodeData extends Project {
  isSelected?: boolean
  [key: string]: unknown
}

export type ProjectNode = Node<ProjectNodeData, 'project'>

export interface ServiceNodeData {
  name: string
  project: string
  serviceType: 'api' | 'database' | 'worker' | 'frontend'
  status: 'healthy' | 'unhealthy' | 'unknown'
  port?: number
  responseTime?: number
  [key: string]: unknown
}

export type ServiceNode = Node<ServiceNodeData, 'service'>

// ===== 계층적 노드 타입 (방안 C: 하이브리드) =====

/**
 * 5계층 아키텍처 Layer 타입
 * INPUT → STORAGE → ORCHESTRATION → DASHBOARD → OUTPUT
 */
export type LayerType = 'input' | 'storage' | 'orchestration' | 'dashboard' | 'output'

export interface LayerNodeData {
  layerType: LayerType
  label: string
  description: string
  color: string
  moduleIds: string[]  // 해당 Layer에 속한 Module ID 목록
  isExpanded?: boolean
  [key: string]: unknown
}

export type LayerNode = Node<LayerNodeData, 'layer'>

/**
 * Schema 노드 (DB 스키마)
 */
export interface SchemaNodeData {
  schemaName: string  // json, wsop_plus, manual, ae
  displayName: string
  description: string
  tableCount: number
  tables: TableInfo[]
  moduleId: string  // 소속 모듈 ID
  [key: string]: unknown
}

export interface TableInfo {
  name: string
  rowCount?: number
  description?: string
}

export type SchemaNode = Node<SchemaNodeData, 'schema'>

/**
 * Endpoint 노드 (API 엔드포인트)
 */
export interface EndpointNodeData {
  path: string  // /health, /api/v1/renders
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  description: string
  serviceId: string  // 소속 서비스 ID
  status?: 'healthy' | 'unhealthy' | 'unknown'
  responseTime?: number
  [key: string]: unknown
}

export type EndpointNode = Node<EndpointNodeData, 'endpoint'>

/**
 * 드릴다운용 상세 정보 타입
 */
export interface NodeDetail {
  id: string
  type: 'schema' | 'table' | 'service' | 'endpoint'
  data: SchemaNodeData | TableInfo | ServiceNodeData | EndpointNodeData
}

/**
 * 프로젝트 확장 데이터 (드릴다운 정보 포함)
 */
export interface ExtendedProjectNodeData extends ProjectNodeData {
  layerType: LayerType
  schemas?: SchemaNodeData[]
  endpoints?: EndpointNodeData[]
  isDetailVisible?: boolean
}

export type ExtendedProjectNode = Node<ExtendedProjectNodeData, 'project'>

// ===== 통합 노드 타입 =====

export type AppNode = ProjectNode | ServiceNode | LayerNode | SchemaNode | EndpointNode | ExtendedProjectNode
