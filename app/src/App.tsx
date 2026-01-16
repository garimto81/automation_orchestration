import { useCallback, useMemo, useEffect } from 'react'
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
import { projects, getProjectSummary, initialNodes, initialEdges, createLayerNodes, createLayerEdges, layerDefinitions } from '@/data'
import { useUIStore } from '@/stores'
import { edgeService } from '@/services/supabase'

export default function App() {
  const {
    viewMode,
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

  // viewMode에 따른 노드/엣지 생성
  const { baseNodes, baseEdges } = useMemo(() => {
    const layerNodes = createLayerNodes()
    const layerEdges = createLayerEdges()

    // Layer 시작 위치와 간격 (layers.ts와 동일하게)
    const layerStartX = 20
    const layerGapX = 165
    const moduleY = 280 // Layer 아래 위치
    const moduleGapY = 70 // 같은 Layer 내 모듈 간격

    // combined 모드: 모듈 노드를 해당 Layer 아래로 정렬
    const getLayerIndex = (moduleId: string): number => {
      return layerDefinitions.findIndex(layer => layer.moduleIds.includes(moduleId))
    }

    // 각 Layer별 모듈 위치 카운터
    const layerModuleCount: Record<number, number> = {}

    const repositionedModuleNodes = (initialNodes as Node[]).map(node => {
      const layerIndex = getLayerIndex(node.id)
      if (layerIndex === -1) {
        // Layer에 속하지 않는 노드는 원래 위치 + 오프셋
        return {
          ...node,
          position: { x: node.position.x, y: node.position.y + 200 },
        }
      }

      // 해당 Layer 내 몇 번째 모듈인지 계산
      const moduleIndex = layerModuleCount[layerIndex] ?? 0
      layerModuleCount[layerIndex] = moduleIndex + 1

      return {
        ...node,
        position: {
          x: layerStartX + layerIndex * layerGapX,
          y: moduleY + moduleIndex * moduleGapY,
        },
      }
    })

    switch (viewMode) {
      case 'layers':
        return { baseNodes: layerNodes as Node[], baseEdges: layerEdges }
      case 'combined':
        return {
          baseNodes: [...layerNodes, ...repositionedModuleNodes] as Node[],
          baseEdges: [...layerEdges, ...initialEdges],
        }
      case 'modules':
      default:
        return { baseNodes: initialNodes as Node[], baseEdges: initialEdges }
    }
  }, [viewMode])

  const [nodes, setNodes, onNodesChange] = useNodesState(baseNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(baseEdges)

  // viewMode 변경 시 노드/엣지 업데이트
  useEffect(() => {
    setNodes(baseNodes)
    setEdges(baseEdges)
  }, [viewMode, baseNodes, baseEdges, setNodes, setEdges])

  // 초기 Edge 로드 (localStorage 우선, 없으면 initialEdges 저장)
  useEffect(() => {
    const loadEdges = async () => {
      const savedEdges = await edgeService.fetchEdges()
      if (savedEdges.length > 0) {
        setEdges(savedEdges)
        console.log('[App] Loaded edges from storage:', savedEdges.length)
      } else {
        // localStorage가 비어있으면 initialEdges 저장
        console.log('[App] No saved edges, initializing with defaults:', initialEdges.length)
        for (const edge of initialEdges) {
          await edgeService.saveEdge(edge)
        }
      }
    }
    loadEdges()
  }, [setEdges])

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

    // localStorage/Supabase에 저장
    const newEdge = {
      id: `${params.source}-${params.target}`,
      source: params.source,
      target: params.target,
      sourceHandle: params.sourceHandle ?? undefined,
      targetHandle: params.targetHandle ?? undefined,
      type: 'default',
      animated: true,
      style: { stroke: '#000', strokeWidth: 2 },
    }

    // localStorage/Supabase에 저장
    edgeService.saveEdge(newEdge).catch(err => {
      console.error('[App] Failed to save edge:', err)
    })
  }, [setEdges])

  // Edge 삭제 핸들러
  const onEdgesDelete: OnEdgesDelete = useCallback((deletedEdges) => {
    deletedEdges.forEach(edge => {
      edgeService.deleteEdge(edge.id).catch(err => {
        console.error('[App] Failed to delete edge:', err)
      })
    })
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
            key={viewMode}
            nodes={nodesWithSelection}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={handleNodeClick}
            onConnect={onConnect}
            onEdgesDelete={onEdgesDelete}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.05, includeHiddenNodes: false }}
            minZoom={0.2}
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
