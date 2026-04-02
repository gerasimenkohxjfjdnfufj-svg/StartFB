// Центральный файл типов — импортировать отсюда везде

export type ProfileType = 'wheelchair' | 'visually' | 'elderly' | 'stroller'

export interface BarrierItem {
  type: string
  count: number
  lat?: number
  lng?: number
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
  warnings?: string[]
}
