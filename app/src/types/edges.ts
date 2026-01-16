import type { Edge } from '@xyflow/react'

export type DependencyType = 'code' | 'data' | 'service'
export type FlowType = 'input' | 'output' | 'bidirectional'
export type DataFormat = 'json' | 'sql' | 'api'

export interface DependencyEdgeData {
  dependencyType: DependencyType
  description?: string
  [key: string]: unknown
}

export interface DataFlowEdgeData {
  flowType: FlowType
  dataFormat: DataFormat
  animated?: boolean
  [key: string]: unknown
}

export type DependencyEdge = Edge<DependencyEdgeData>
export type DataFlowEdge = Edge<DataFlowEdgeData>

// 일반 Edge도 허용 (React Flow 기본 타입)
export type AppEdge = Edge
