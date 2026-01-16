import type { AppEdge } from '@/types'

// Supabase 클라이언트 초기화
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// 환경 변수가 없으면 mock 모드로 동작
const isMockMode = !supabaseUrl || !supabaseAnonKey

// Supabase 클라이언트 (lazy initialization)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let supabaseInstance: any = null
let initialized = false

async function initSupabase() {
  if (isMockMode) return null
  try {
    // 동적 import - @supabase/supabase-js가 설치되어 있지 않으면 실패
    // 문자열 변수를 사용하여 TypeScript 체크 우회
    const moduleName = '@supabase/supabase-js'
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const module = await (Function('moduleName', 'return import(moduleName)')(moduleName) as Promise<any>)
    return module.createClient(supabaseUrl!, supabaseAnonKey!)
  } catch {
    console.warn('[Supabase] @supabase/supabase-js not installed - running in mock mode')
    return null
  }
}

async function getClient() {
  if (!initialized) {
    initialized = true
    supabaseInstance = await initSupabase()
  }
  return supabaseInstance
}

export const supabase = null // backward compatibility placeholder

// Edge 데이터 변환 함수
interface DbEdge {
  id: string
  edge_id: string
  source_node: string
  target_node: string
  source_handle?: string
  target_handle?: string
  edge_type: string
  animated: boolean
  label?: string
  style?: Record<string, unknown>
  data?: Record<string, unknown>
  created_at: string
  updated_at: string
}

function toAppEdge(dbEdge: DbEdge): AppEdge {
  return {
    id: dbEdge.edge_id,
    source: dbEdge.source_node,
    target: dbEdge.target_node,
    sourceHandle: dbEdge.source_handle,
    targetHandle: dbEdge.target_handle,
    type: dbEdge.edge_type as AppEdge['type'],
    animated: dbEdge.animated,
    label: dbEdge.label,
    style: dbEdge.style as AppEdge['style'],
  }
}

function toDbEdge(edge: AppEdge): Omit<DbEdge, 'id' | 'created_at' | 'updated_at'> {
  return {
    edge_id: edge.id,
    source_node: edge.source,
    target_node: edge.target,
    source_handle: edge.sourceHandle ?? undefined,
    target_handle: edge.targetHandle ?? undefined,
    edge_type: edge.type ?? 'default',
    animated: edge.animated ?? true,
    label: typeof edge.label === 'string' ? edge.label : undefined,
    style: edge.style as Record<string, unknown> | undefined,
    data: undefined,
  }
}

export const edgeService = {
  /**
   * Supabase에서 모든 Edge 조회
   */
  async fetchEdges(): Promise<AppEdge[]> {
    if (isMockMode) {
      console.warn('[EdgeService] Mock mode - returning empty array')
      return []
    }

    const client = await getClient()
    if (!client) return []

    const { data, error } = await client
      .from('dashboard_edges')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      console.error('[EdgeService] Failed to fetch edges:', error)
      throw error
    }

    return (data || []).map(toAppEdge)
  },

  /**
   * 단일 Edge 저장 (upsert)
   */
  async saveEdge(edge: AppEdge): Promise<void> {
    if (isMockMode) {
      console.warn('[EdgeService] Mock mode - edge not saved:', edge.id)
      return
    }

    const client = await getClient()
    if (!client) return

    const dbEdge = toDbEdge(edge)
    const { error } = await client
      .from('dashboard_edges')
      .upsert(dbEdge, { onConflict: 'edge_id' })

    if (error) {
      console.error('[EdgeService] Failed to save edge:', error)
      throw error
    }
  },

  /**
   * Edge 삭제
   */
  async deleteEdge(edgeId: string): Promise<void> {
    if (isMockMode) {
      console.warn('[EdgeService] Mock mode - edge not deleted:', edgeId)
      return
    }

    const client = await getClient()
    if (!client) return

    const { error } = await client
      .from('dashboard_edges')
      .delete()
      .eq('edge_id', edgeId)

    if (error) {
      console.error('[EdgeService] Failed to delete edge:', error)
      throw error
    }
  },

  /**
   * 전체 Edge 동기화 (기존 데이터 교체)
   */
  async syncEdges(edges: AppEdge[]): Promise<void> {
    if (isMockMode) {
      console.warn('[EdgeService] Mock mode - edges not synced')
      return
    }

    const client = await getClient()
    if (!client) return

    // 트랜잭션: 기존 삭제 후 새로 삽입
    const { error: deleteError } = await client
      .from('dashboard_edges')
      .delete()
      .neq('edge_id', '')

    if (deleteError) {
      console.error('[EdgeService] Failed to clear edges:', deleteError)
      throw deleteError
    }

    if (edges.length === 0) return

    const dbEdges = edges.map(toDbEdge)
    const { error: insertError } = await client
      .from('dashboard_edges')
      .insert(dbEdges)

    if (insertError) {
      console.error('[EdgeService] Failed to insert edges:', insertError)
      throw insertError
    }
  },

  /**
   * Mock 모드 여부 확인
   */
  isMockMode(): boolean {
    return isMockMode
  },
}
