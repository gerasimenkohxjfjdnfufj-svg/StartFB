import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { ProfileType, RouteResult } from '../../types'

interface Props {
  profile: ProfileType
  route: RouteResult | null
  theme: 'dark' | 'light'
}

const TILE_DARK  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'

const PROFILE_COLORS: Record<ProfileType, string> = {
  wheelchair: '#2EC67A',
  visually:   '#2D7CF6',
  elderly:    '#F5C842',
  stroller:   '#F04E37',
}

export default function MapView({ profile, route, theme }: Props) {
  const mapRef        = useRef<L.Map | null>(null)
  const tileRef       = useRef<L.TileLayer | null>(null)
  const routeLayerRef = useRef<L.Polyline | null>(null)

  // Инициализация карты
  useEffect(() => {
    if (mapRef.current) return
    mapRef.current = L.map('map-container', {
      center: [55.7558, 37.6176],
      zoom: 14,
      zoomControl: false,
    })
    L.control.zoom({ position: 'bottomright' }).addTo(mapRef.current)
    tileRef.current = L.tileLayer(theme === 'dark' ? TILE_DARK : TILE_LIGHT, {
      attribution: '© OpenStreetMap contributors, © CARTO',
      maxZoom: 19,
    }).addTo(mapRef.current)
    mapRef.current.locate({ setView: true, maxZoom: 16 })
    return () => { mapRef.current?.remove(); mapRef.current = null }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Смена темы
  useEffect(() => {
    if (!mapRef.current || !tileRef.current) return
    tileRef.current.remove()
    tileRef.current = L.tileLayer(theme === 'dark' ? TILE_DARK : TILE_LIGHT, {
      attribution: '© OpenStreetMap contributors, © CARTO',
      maxZoom: 19,
    }).addTo(mapRef.current)
  }, [theme])

  // Отображение маршрута
  useEffect(() => {
    if (!mapRef.current) return
    routeLayerRef.current?.remove()
    if (!route?.geometry) return
    const coords = route.geometry.coordinates.map(
      ([lng, lat]: number[]) => [lat, lng] as [number, number]
    )
    routeLayerRef.current = L.polyline(coords, {
      color:   PROFILE_COLORS[profile],
      weight:  5,
      opacity: 0.85,
    }).addTo(mapRef.current)
    mapRef.current.fitBounds(routeLayerRef.current.getBounds(), { padding: [40, 40] })
  }, [route, profile])

  return <div id="map-container" style={{ width: '100%', height: '100%' }} />
}
