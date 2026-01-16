import type { NodeTypes } from '@xyflow/react'
import { ProjectNode } from './ProjectNode'
import { LayerNode } from './LayerNode'

export const nodeTypes: NodeTypes = {
  project: ProjectNode,
  layer: LayerNode,
}

export { ProjectNode, LayerNode }
