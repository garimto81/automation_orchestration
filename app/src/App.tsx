import { useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type OnNodeClick,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { Header, Sidebar, DetailPanel } from '@/components/layout'
import { nodeTypes } from '@/components/nodes'
import { projects, getProjectSummary, initialNodes, initialEdges } from '@/data'
import { useUIStore } from '@/stores'

export default function App() {
  const { selectedProjectId, setSelectedProject } = useUIStore()
  const summary = useMemo(() => getProjectSummary(), [])
  const selectedProject = useMemo(
    () => projects.find(p => p.id === selectedProjectId) ?? null,
    [selectedProjectId]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, , onEdgesChange] = useEdgesState(initialEdges)

  // Update node selection state
  const nodesWithSelection = useMemo(
    () => nodes.map(node => ({
      ...node,
      data: { ...node.data, isSelected: node.id === selectedProjectId },
    })),
    [nodes, selectedProjectId]
  )

  const handleNodeClick: OnNodeClick = useCallback((_, node) => {
    setSelectedProject(node.id)
  }, [setSelectedProject])

  const handleSidebarSelect = useCallback((id: string) => {
    setSelectedProject(id)
    // Center on selected node
    const node = nodes.find(n => n.id === id)
    if (node) {
      setNodes(nds => nds.map(n => ({
        ...n,
        data: { ...n.data, isSelected: n.id === id },
      })))
    }
  }, [nodes, setNodes, setSelectedProject])

  const handleRefresh = useCallback(() => {
    // TODO: Implement data refresh
    console.log('Refreshing data...')
  }, [])

  const handleCloseDetail = useCallback(() => {
    setSelectedProject(null)
  }, [setSelectedProject])

  return (
    <div className="h-screen flex flex-col">
      <Header onRefresh={handleRefresh} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          projects={projects}
          summary={summary}
          selectedId={selectedProjectId ?? undefined}
          onSelect={handleSidebarSelect}
        />

        <main className="flex-1 relative">
          <ReactFlow
            nodes={nodesWithSelection}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.3}
            maxZoom={2}
          >
            <Background color="#f5f5f5" gap={20} />
            <Controls
              showInteractive={false}
              className="!border-primary !rounded-none"
            />
            <MiniMap
              nodeColor={node => {
                const data = node.data as { status?: string }
                if (data?.status === 'active') return '#000'
                if (data?.status === 'development') return '#666'
                return '#ccc'
              }}
              className="!border-primary !rounded-none"
            />
          </ReactFlow>
        </main>

        <DetailPanel
          project={selectedProject}
          onClose={handleCloseDetail}
        />
      </div>
    </div>
  )
}
