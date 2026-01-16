import { useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type NodeMouseHandler,
  type OnConnect,
  type OnEdgesDelete,
  type Connection,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'

import { Header, Sidebar, DetailPanel } from '@/components/layout'
import { nodeTypes } from '@/components/nodes'
import { projects, getProjectSummary, initialNodes, initialEdges } from '@/data'
import { useUIStore } from '@/stores'

export default function App() {
  const {
    selectedProjectId,
    setSelectedProject,
    isSidebarOpen,
    toggleSidebar,
    isDetailPanelOpen,
    toggleDetailPanel,
    setDetailPanelOpen,
  } = useUIStore()

  const summary = useMemo(() => getProjectSummary(), [])
  const selectedProject = useMemo(
    () => projects.find(p => p.id === selectedProjectId) ?? null,
    [selectedProjectId]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes as Node[])
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Update node selection state
  const nodesWithSelection = useMemo(
    () => nodes.map(node => ({
      ...node,
      data: { ...node.data, isSelected: node.id === selectedProjectId },
    })),
    [nodes, selectedProjectId]
  )

  // 노드 클릭 핸들러 - zoom 제거, 상세 패널 열기
  const handleNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    setSelectedProject(node.id)
    setDetailPanelOpen(true)  // 상세 패널 자동 열림
  }, [setSelectedProject, setDetailPanelOpen])

  const handleSidebarSelect = useCallback((id: string) => {
    setSelectedProject(id)
    setDetailPanelOpen(true)  // 상세 패널 자동 열림
    // Update node selection
    setNodes(nds => nds.map(n => ({
      ...n,
      data: { ...n.data, isSelected: n.id === id },
    })))
  }, [setNodes, setSelectedProject, setDetailPanelOpen])

  const handleRefresh = useCallback(() => {
    // TODO: Implement data refresh
    console.log('Refreshing data...')
  }, [])

  const handleCloseDetail = useCallback(() => {
    setSelectedProject(null)
  }, [setSelectedProject])

  // Edge 연결 핸들러
  const onConnect: OnConnect = useCallback((params: Connection) => {
    setEdges((eds) => addEdge({
      ...params,
      type: 'default',
      animated: true,
      style: { stroke: '#000', strokeWidth: 2 },
    }, eds))
    // TODO: Supabase에 저장
    console.log('Edge connected:', params)
  }, [setEdges])

  // Edge 삭제 핸들러
  const onEdgesDelete: OnEdgesDelete = useCallback((deletedEdges) => {
    // TODO: Supabase에서 삭제
    console.log('Edges deleted:', deletedEdges)
  }, [])

  return (
    <div className="h-screen flex flex-col">
      <Header onRefresh={handleRefresh} />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          projects={projects}
          summary={summary}
          selectedId={selectedProjectId ?? undefined}
          onSelect={handleSidebarSelect}
          isOpen={isSidebarOpen}
          onToggle={toggleSidebar}
        />

        <main className="flex-1 relative">
          <ReactFlow
            nodes={nodesWithSelection}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            onConnect={onConnect}
            onEdgesDelete={onEdgesDelete}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.2 }}
            minZoom={0.3}
            maxZoom={2}
            // Edge 편집 활성화
            edgesFocusable={true}
            connectOnClick={true}
            deleteKeyCode={['Backspace', 'Delete']}
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
          isOpen={isDetailPanelOpen}
          onToggle={toggleDetailPanel}
        />
      </div>
    </div>
  )
}
