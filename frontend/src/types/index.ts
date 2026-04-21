// Центральный файл типов — импортировать отсюда везде

export type ProfileType = 'wheelchair' | 'visually' | 'elderly' | 'stroller'

export type BarrierType = 'steps' | 'kerb' | 'cobblestone' | 'crossing' | 'elevator' | 'ramp'

export interface BarrierItem {
  type: BarrierType
  lat: number
  lng: number
}

export interface BarrierSummary {
  type: BarrierType
  count: number
  label: string
  severity: 'critical' | 'warning' | 'positive'
}

export interface RouteResult {
  route_id: string
  distance_m: number
  duration_sec: number
  accessibility_score: number
  geometry: {
    type: 'LineString'
    coordinates: number[][]
  }
  barriers: BarrierItem[]
  barriers_summary?: Record<BarrierType, number>
  warnings?: string[]
}
