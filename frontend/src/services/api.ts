import axios from 'axios'
import { cacheStorage } from '../utils/storage'

// В Docker фронтенд ходит на /v1 через nginx proxy
// В локальной разработке (npm run dev) — тоже /v1 через vite proxy
const API_BASE = '/v1'

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
    'bypass-tunnel-reminder': 'true',
  },
  withCredentials: true,
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// === Debounce утилита для замедления запросов ===
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DebouncedFn = (...args: any[]) => Promise<any>

const createDebounce = (fn: DebouncedFn, delay: number) => {
  let timeoutId: ReturnType<typeof setTimeout>
  return async (...args: Parameters<typeof fn>) => {
    return new Promise((resolve, reject) => {
      clearTimeout(timeoutId)
      timeoutId = setTimeout(async () => {
        try {
          const result = await fn(...args)
          resolve(result)
        } catch (error) {
          reject(error)
        }
      }, delay)
    })
  }
}

export const authApi = {
  register: (data: { email: string; password: string; name: string; profile_type: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
}

export const routesApi = {
  build: (data: {
    from: { lat: number; lng: number }
    to: { lat: number; lng: number }
    profile: string
    from_address?: string
    to_address?: string
  }, quick = false) => api.post(`/routes/build?quick=${quick}`, {
    from_point:   data.from,
    to_point:     data.to,
    profile:      data.profile,
    from_address: data.from_address,
    to_address:   data.to_address,
  }),
  history: (limit = 20) => api.get('/routes/history', { params: { limit } }),
  rate: (routeId: string, stars: number, comment?: string) =>
    api.post(`/routes/${routeId}/rate`, { stars, comment }),
}

export const marksApi = {
  list: (bbox: { south: number; west: number; north: number; east: number }) =>
    api.get('/marks', { params: { ...bbox, limit: 200 } }),
  create: (data: { lat: number; lng: number; category: string; type: string; comment?: string; photo_url?: string }) =>
    api.post('/marks', data),
  vote: (markId: string, vote: 'confirm' | 'deny') =>
    api.post(`/marks/${markId}/vote`, { vote }),
  uploadPhoto: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/marks/upload-photo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
  },
}

// === GEO: поиск через Photon (photon.komoot.io) прямо из браузера ===
// Photon поддерживает CORS и не блокирует браузерные IP.
// lang=ru не поддерживается, но OSM-данные уже содержат русские названия.
const PHOTON_URL = 'https://photon.komoot.io/api'

function formatPhotonResult(feat: any): { lat: number; lng: number; display_name: string; type: string } {
  const p = feat.properties || {}
  const city   = p.city || p.town || p.village || p.county || ''
  const street = p.street || ''
  const house  = p.housenumber || ''
  const name   = p.name || ''

  const parts: string[] = []
  if (city) parts.push(city)
  if (street) parts.push(street)
  else if (name && name !== city) parts.push(name)
  if (house) parts.push(house)

  const display = parts.length > 0 ? parts.join(', ') : (name || city || '')
  const [lng, lat] = feat.geometry.coordinates

  return { lat, lng, display_name: display, type: p.type || p.osm_value || '' }
}

const geoCache = new Map<string, { data: any[]; ts: number }>()

async function searchGeo(
  q: string,
  city?: string,
  cityCoords?: [number, number],
  delta?: number,
): Promise<{ data: any[] }> {
  const searchQ = city ? `${q}, ${city}` : q
  const cacheKey = `${searchQ}|${cityCoords?.[0] ?? ''}|${cityCoords?.[1] ?? ''}`
  const cached = geoCache.get(cacheKey)
  if (cached && Date.now() - cached.ts < 600_000) return { data: cached.data }

  const params: Record<string, string | number> = { q: searchQ, limit: 7 }
  if (cityCoords) {
    const d = delta ?? 1.8
    // Photon bbox: lon_min,lat_min,lon_max,lat_max
    params.bbox = `${cityCoords[1] - d},${cityCoords[0] - d},${cityCoords[1] + d},${cityCoords[0] + d}`
  }

  const url = PHOTON_URL + '?' + new URLSearchParams(params as any).toString()
  const resp = await fetch(url)
  if (!resp.ok) throw new Error(`Photon ${resp.status}`)
  const json = await resp.json()

  const features = (json.features || []) as any[]
  // Оставляем только Россию, если есть хоть один российский результат
  const ru = features.filter((f: any) => f.properties?.country_code?.toLowerCase() === 'ru')
  const result = (ru.length > 0 ? ru : features).slice(0, 5).map(formatPhotonResult)

  geoCache.set(cacheKey, { data: result, ts: Date.now() })
  return { data: result }
}

export const geoApi = {
  search: (q: string, city?: string, cityCoords?: [number, number], delta?: number) => {
    if (!q.trim()) return Promise.resolve({ data: [] })
    return searchGeo(q, city, cityCoords, delta)
  },

  reverse: (lat: number, lng: number) => api.get('/geo/reverse', { params: { lat, lng } }),
}

export const osmApi = {
  barriers: (bbox: { south: number; west: number; north: number; east: number }) =>
    api.get('/osm/barriers', { params: bbox }),
}

export default api
