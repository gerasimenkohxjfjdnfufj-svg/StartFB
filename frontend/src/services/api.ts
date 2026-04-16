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
  create: (data: { lat: number; lng: number; category: string; type: string; comment?: string }) =>
    api.post('/marks', data),
  vote: (markId: string, vote: 'confirm' | 'deny') =>
    api.post(`/marks/${markId}/vote`, { vote }),
}

// === GEO: прямой запрос к Nominatim из браузера (обходим блокировку IP сервера) ===
const NOMINATIM = 'https://nominatim.openstreetmap.org'
const GEO_HEADERS = { 'Accept-Language': 'ru', 'User-Agent': 'DostupnyGorod/1.0' }

function formatNominatimResult(r: any): { lat: number; lng: number; display_name: string; type: string } {
  const addr = r.address || {}
  const city = addr.city || addr.town || addr.village || addr.municipality || addr.county || ''
  const road = addr.road || addr.pedestrian || addr.footway || ''
  const house = addr.house_number || ''
  const block = addr.block || addr.building || ''

  const parts: string[] = []
  if (city) parts.push(city)
  if (road) parts.push(road)
  if (house) parts.push(house + (block ? `, стр. ${block}` : ''))

  let display = parts.length > 0 && road
    ? parts.join(', ')
    : (() => {
        const raw: string = r.display_name || ''
        const chunks = raw.split(',').map((c: string) => c.trim())
        const filtered = chunks.filter((c: string) =>
          !c.match(/^\d+$/) && !c.includes('Россия') &&
          !c.includes('федеральный округ') &&
          (!c.toLowerCase().includes('область') || c.includes(city))
        )
        return filtered.slice(0, 3).join(', ') || chunks[0]
      })()

  return { lat: parseFloat(r.lat), lng: parseFloat(r.lon), display_name: display, type: r.type }
}

const nominatimCache = new Map<string, { data: any[]; ts: number }>()

async function searchNominatim(
  q: string,
  city?: string,
  cityCoords?: [number, number],
  delta?: number,
): Promise<{ data: any[] }> {
  const searchQ = city ? `${q}, ${city}` : q
  const cacheKey = `${searchQ}|${cityCoords?.[0] ?? ''}|${cityCoords?.[1] ?? ''}`
  const cached = nominatimCache.get(cacheKey)
  if (cached && Date.now() - cached.ts < 600_000) return { data: cached.data }

  const params: Record<string, string | number> = {
    q: searchQ, format: 'json', limit: 7,
    addressdetails: 1, countrycodes: 'ru', dedupe: 1,
  }
  if (cityCoords) {
    const d = delta ?? 1.8
    params.viewbox = `${cityCoords[1] - d},${cityCoords[0] + d},${cityCoords[1] + d},${cityCoords[0] - d}`
    params.bounded = 1
  }

  const url = `${NOMINATIM}/search?` + new URLSearchParams(params as any).toString()
  const resp = await fetch(url, { headers: GEO_HEADERS })
  if (!resp.ok) throw new Error(`Nominatim ${resp.status}`)
  const raw = await resp.json()
  const data = raw.slice(0, 5).map(formatNominatimResult)
  nominatimCache.set(cacheKey, { data, ts: Date.now() })
  return { data }
}

export const geoApi = {
  // Поиск напрямую из браузера (IP браузера, не сервера)
  search: (q: string, city?: string, cityCoords?: [number, number], delta?: number) => {
    if (!q.trim()) return Promise.resolve({ data: [] })
    return searchNominatim(q, city, cityCoords, delta)
  },

  reverse: (lat: number, lng: number) => api.get('/geo/reverse', { params: { lat, lng } }),
}

export const osmApi = {
  barriers: (bbox: { south: number; west: number; north: number; east: number }) =>
    api.get('/osm/barriers', { params: bbox }),
}

export default api
