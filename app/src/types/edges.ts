import type { Edge } from '@xyflow/react'

export type DependencyType = 'code' | 'data' | 'service'
export type FlowType = 'input' | 'output' | 'bidirectional'
export type DataFormat = 'json' | 'sql' | 'api'

export interface DependencyEdgeData {
  dependencyType: DependencyType
  description?: string
}

export interface DataFlowEdgeData {
  flowType: FlowType
  dataFormat: DataFormat
  animated?: boolean
}

export type DependencyEdge = Edge<DependencyEdgeData>
export type DataFlowEdge = Edge<DataFlowEdgeData>

export type AppEdge = DependencyEdge | DataFlowEdge
