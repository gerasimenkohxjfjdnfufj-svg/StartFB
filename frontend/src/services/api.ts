import axios from 'axios'

// В Docker фронтенд ходит на /v1 через nginx proxy
// В локальной разработке (npm run dev) — тоже /v1 через vite proxy
const API_BASE = '/v1'

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.request.use(config => {
  const token = localStorage.getItem('access_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

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
  }) => api.post('/routes/build', {
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

export const geoApi = {
  search:  (q: string) => api.get('/geo/search', { params: { q } }),
  reverse: (lat: number, lng: number) => api.get('/geo/reverse', { params: { lat, lng } }),
}

export const osmApi = {
  barriers: (bbox: { south: number; west: number; north: number; east: number }) =>
    api.get('/osm/barriers', { params: bbox }),
}

export default api
