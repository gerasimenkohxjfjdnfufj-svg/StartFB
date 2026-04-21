import { useEffect, useRef, useState, useCallback } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { ProfileType, RouteResult, BarrierType } from '../../types'
import { marksStorage, UserMark } from '../../utils/storage'
import { routesApi, marksApi } from '../../services/api'

interface Props {
  profile: ProfileType
  route: RouteResult | null
  theme: 'dark' | 'light'
  onThemeToggle?: () => void
  selectedCity?: string
  onCitySelected?: (city: string) => void
  sheetFull?: boolean
  volunteerMode?: boolean
  onVolunteerMapClick?: (coords: { lat: number; lng: number }) => void
  volunteerMarksKey?: number
}

const TILE_DARK  = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
const TILE_LIGHT = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'

const PROFILE_COLORS: Record<ProfileType, string> = {
  wheelchair: '#2EC67A',
  visually:   '#2D7CF6',
  elderly:    '#F5C842',
  stroller:   '#F04E37',
}

const BARRIER_STYLE: Record<BarrierType, { color: string; label: string; icon: string }> = {
  steps:       { color: '#F04E37', label: 'Ступени', icon: '𓊍' },
  kerb:        { color: '#F5C842', label: 'Бордюр', icon: '📍' },
  cobblestone: { color: '#F5A623', label: 'Брусчатка', icon: '🧱' },
  crossing:    { color: '#2D7CF6', label: 'Переход', icon: '🚶' },
  elevator:    { color: '#2EC67A', label: 'Лифт', icon: '↕️' },
  ramp:        { color: '#2EC67A', label: 'Пандус', icon: '♿' },
}

const MARK_STYLE: Record<string, { icon: string; color: string }> = {
  place:      { icon: '📍', color: '#FF6B6B' },
  barrier:    { icon: '⚠️', color: '#FFA500' },
  favorite:   { icon: '⭐', color: '#FFD700' },
  route:      { icon: '🗺️', color: '#4169E1' },
}

export default function MapView({ profile, route, theme, onThemeToggle, selectedCity, onCitySelected: _onCitySelected, sheetFull, volunteerMode, onVolunteerMapClick, volunteerMarksKey }: Props) {
  const mapRef          = useRef<L.Map | null>(null)
  const tileRef         = useRef<L.TileLayer | null>(null)
  const routeLayerRef   = useRef<L.Polyline | null>(null)
  const barrierLayerRef = useRef<L.LayerGroup | null>(null)
  const marksLayerRef   = useRef<L.LayerGroup | null>(null)
  const serverMarksLayerRef = useRef<L.LayerGroup | null>(null)
  const legendRef       = useRef<HTMLDivElement | null>(null)
  const longPressTimer  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const locationMarkerRef   = useRef<L.Marker | null>(null)
  const locationCircleRef   = useRef<L.Circle | null>(null)
  const locationCenteredRef = useRef(false)
  const myLatLngRef         = useRef<L.LatLng | null>(null)
  
  const [visibleBarriers, setVisibleBarriers] = useState<Set<BarrierType>>(
    new Set(['steps', 'kerb', 'cobblestone', 'crossing', 'elevator', 'ramp'])
  )
  const [userMarks, setUserMarks] = useState<UserMark[]>([])
  const [filterOpen, setFilterOpen] = useState(false)

  // Диалог добавления метки
  const [markDialog, setMarkDialog] = useState<{
    latlng: L.LatLng
    type: 'place' | 'barrier' | 'favorite' | null
  } | null>(null)
  const [markLabel, setMarkLabel] = useState('')
  const pendingLatlng = useRef<L.LatLng | null>(null)

  // === Создание маршрута из точки ===
  const startRouteFromPoint = useCallback(async (lat: number, lng: number) => {
    if (!mapRef.current) return
    
    mapRef.current.locate({
      setView: false,
      enableHighAccuracy: true,
    })

    mapRef.current.once('locationfound', async (e) => {
      try {
        await routesApi.build({
          from: { lat: e.latlng.lat, lng: e.latlng.lng },
          to:   { lat, lng },
          profile,
        })
        console.log('✅ Маршрут построен')
      } catch (err) {
        console.error('❌ Ошибка построения маршрута:', err)
      }
    })
  }, [profile])

  // === Инициализация карты ===
  useEffect(() => {
    if (mapRef.current) return
    
    const map = L.map('map-container', {
      center: [55.7558, 37.6176],
      zoom: 14,
      zoomControl: false,
    })
    mapRef.current = map

    L.control.zoom({ position: 'bottomright' }).addTo(map)
    
    tileRef.current = L.tileLayer(theme === 'dark' ? TILE_DARK : TILE_LIGHT, {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(map)

    // === Геолокация с пульсирующим маркером ===
    map.locate({
      setView: false,
      watch: true,
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 3000,
    })

    map.on('locationfound', (e: L.LocationEvent) => {
      myLatLngRef.current = e.latlng
      // Центрируем только при первом получении
      if (!locationCenteredRef.current) {
        map.setView(e.latlng, 16, { animate: true })
        locationCenteredRef.current = true
      }

      // Круг точности
      if (locationCircleRef.current) {
        locationCircleRef.current.setLatLng(e.latlng)
        locationCircleRef.current.setRadius(e.accuracy / 2)
      } else {
        locationCircleRef.current = L.circle(e.latlng, {
          radius: e.accuracy / 2,
          color: '#007AFF',
          weight: 0,
          fillColor: '#007AFF',
          fillOpacity: 0.12,
        }).addTo(map)
      }

      // Пульсирующий маркер (инлайн стили — работают в Leaflet divIcon)
      if (locationMarkerRef.current) {
        locationMarkerRef.current.setLatLng(e.latlng)
      } else {
        const icon = L.divIcon({
          className: '',
          html: `
            <style>
              @keyframes loc-ring {
                0%   { transform: scale(.3); opacity: .9; }
                100% { transform: scale(1.6); opacity: 0; }
              }
            </style>
            <div style="position:relative;width:40px;height:40px;display:flex;align-items:center;justify-content:center;">
              <div style="position:absolute;width:36px;height:36px;border-radius:50%;background:rgba(0,122,255,.3);animation:loc-ring 1.8s ease-out infinite;"></div>
              <div style="width:18px;height:18px;background:#007AFF;border:3px solid #fff;border-radius:50%;box-shadow:0 2px 10px rgba(0,122,255,.7);position:relative;z-index:2;"></div>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        })
        locationMarkerRef.current = L.marker(e.latlng, { icon, zIndexOffset: 500 })
          .addTo(map)
          .bindPopup('📍 Моё местоположение')
      }
    })

    map.on('locationerror', (e: L.ErrorEvent) => {
      console.warn('Ошибка геолокации:', e.message)
    })

    // === Волонтёрский клик ===
    map.on('click', (e: L.LeafletMouseEvent) => {
      // volunteerMode хранится в замыкании — читаем через ref
      if ((mapRef.current as any)._volunteerMode) {
        onVolunteerMapClick?.({ lat: e.latlng.lat, lng: e.latlng.lng })
      }
    })

    // === Долгое нажатие через Leaflet contextmenu ===
    // На мобиле contextmenu = долгий тап (Leaflet обрабатывает сам)
    // На десктопе = правая кнопка мыши
    map.on('contextmenu', (e: L.LeafletMouseEvent) => {
      pendingLatlng.current = e.latlng
      setMarkDialog({ latlng: e.latlng, type: null })
      setMarkLabel('')
    })

    // === Загружаем сохраненные метки ===
    const saved = marksStorage.getAll()
    if (Array.isArray(saved) && saved.length > 0) {
      setUserMarks(saved)
    }

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // === Смена темы ===
  useEffect(() => {
    if (!mapRef.current || !tileRef.current) return
    tileRef.current.remove()
    tileRef.current = L.tileLayer(theme === 'dark' ? TILE_DARK : TILE_LIGHT, {
      attribution: '© OpenStreetMap © CARTO',
      subdomains: 'abcd',
      maxZoom: 20,
    }).addTo(mapRef.current)
  }, [theme])

  // === Волонтёрский режим — курсор и флаг ===
  useEffect(() => {
    if (!mapRef.current) return
    ;(mapRef.current as any)._volunteerMode = volunteerMode
    const container = mapRef.current.getContainer()
    container.style.cursor = volunteerMode ? 'crosshair' : ''
  }, [volunteerMode])

  // === Загрузка волонтёрских меток с сервера ===
  useEffect(() => {
    const map = mapRef.current
    if (!map) return

    const loadServerMarks = async () => {
      const bounds = map.getBounds()
      try {
        const res = await marksApi.list({
          south: bounds.getSouth(),
          west:  bounds.getWest(),
          north: bounds.getNorth(),
          east:  bounds.getEast(),
        })
        const marks: any[] = res.data

        serverMarksLayerRef.current?.remove()
        serverMarksLayerRef.current = L.layerGroup().addTo(map)

        const OBSTACLE_ICONS: Record<string, string> = {
          no_ramp:      '🚫',
          broken_ramp:  '⚠️',
          no_elevator:  '🛗',
          narrow_path:  '↔️',
          step:         '🪜',
          blocked_path: '🚧',
          bad_surface:  '🪨',
          other:        '📌',
        }

        for (const mark of marks) {
          const icon_str = OBSTACLE_ICONS[mark.type] ?? '📌'
          const popupHtml = `
            <div style="text-align:center;padding:8px;min-width:120px">
              <div style="font-size:24px">${icon_str}</div>
              <div style="font-weight:700;margin:4px 0;font-size:13px">${mark.type}</div>
              ${mark.comment ? `<div style="font-size:12px;color:#888;margin-bottom:6px">${mark.comment}</div>` : ''}
              ${mark.photo_url ? `<img src="${mark.photo_url}" style="width:100%;border-radius:6px;max-height:120px;object-fit:cover;margin-top:4px"/>` : ''}
              <div style="font-size:11px;color:#aaa;margin-top:6px">👍 ${mark.votes ?? 0}</div>
            </div>
          `
          L.marker([mark.lat, mark.lng], {
            icon: L.divIcon({
              className: '',
              html: `<div style="font-size:22px;filter:drop-shadow(0 2px 4px rgba(0,0,0,.5))">${icon_str}</div>`,
              iconSize: [30, 30],
              iconAnchor: [15, 15],
            }),
          })
            .bindPopup(popupHtml, { maxWidth: 200 })
            .addTo(serverMarksLayerRef.current!)
        }
      } catch {
        // Тихо — нет меток или нет сети
      }
    }

    loadServerMarks()
    const handler = () => loadServerMarks()
    map.on('moveend', handler)
    return () => { map.off('moveend', handler) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [volunteerMarksKey])

  // === Маршрут и барьеры ===
  useEffect(() => {
    if (!mapRef.current) return

    routeLayerRef.current?.remove()
    barrierLayerRef.current?.remove()

    if (!route?.geometry) return

    const coords = route.geometry.coordinates.map(
      ([lng, lat]: number[]) => [lat, lng] as [number, number]
    )
    
    routeLayerRef.current = L.polyline(coords, {
      color: PROFILE_COLORS[profile],
      weight: 5,
      opacity: 0.85,
    }).addTo(mapRef.current)
    
    mapRef.current.fitBounds(routeLayerRef.current.getBounds(), { padding: [40, 40] })

    // === Барьеры ===
    barrierLayerRef.current = L.layerGroup().addTo(mapRef.current)
    
    if (route.barriers?.length) {
      (window as any).startRouteHandler = startRouteFromPoint

      for (const b of route.barriers) {
        if (!b.lat || !b.lng) continue
        if (!visibleBarriers.has(b.type as BarrierType)) continue
        
        const style = BARRIER_STYLE[b.type as BarrierType] || { color: '#999', label: 'Неизвестно', icon: '?' }
        
        const popupHtml = `
          <div class="barrier-popup">
            <div class="barrier-popup__icon" style="background:${style.color}22;border-color:${style.color}">
              <span>${style.icon}</span>
            </div>
            <div class="barrier-popup__label" style="color:${style.color}">${style.label}</div>
          </div>
        `

        const markerHtml = `
          <div class="barrier-pin" style="--pin-color:${style.color}">
            <div class="barrier-pin__bubble">${style.icon}</div>
            <div class="barrier-pin__tail"></div>
          </div>
        `

        const icon = L.divIcon({
          className: '',
          html: markerHtml,
          iconSize: [36, 44],
          iconAnchor: [18, 44],
          popupAnchor: [0, -46],
        })

        L.marker([b.lat, b.lng], { icon })
          .bindPopup(popupHtml, { className: 'barrier-popup-wrap', maxWidth: 180 })
          .addTo(barrierLayerRef.current!)
      }
    }
  }, [route, profile, visibleBarriers, startRouteFromPoint])

  // === Пользовательские метки ===
  useEffect(() => {
    if (!mapRef.current) return

    marksLayerRef.current?.remove()
    marksLayerRef.current = L.layerGroup().addTo(mapRef.current)

    if (!Array.isArray(userMarks)) return

    (window as any).removeMarkHandler = (id: string) => {
      marksStorage.remove(id)
      setUserMarks(prev => {
        if (!Array.isArray(prev)) return []
        return prev.filter(m => m.id !== id)
      })
    }

    userMarks.forEach(mark => {
      const style = MARK_STYLE[mark.type] || { icon: '📍', color: '#666' }
      
      const popupHtml = `
        <div style="text-align: center; padding: 8px;">
          <b>${mark.label}</b><br>
          <small>${mark.type}</small><br>
          <button onclick="window.removeMarkHandler?.('${mark.id}')" 
            style="margin-top: 8px; padding: 4px 8px; background: #F04E37; color: white; border: none; border-radius: 3px; cursor: pointer;">
            🗑️ Удалить
          </button>
        </div>
      `

      L.marker([mark.lat, mark.lng], {
        icon: L.divIcon({
          className: 'user-mark',
          html: `<div style="font-size: 20px;">${style.icon}</div>`,
          iconSize: [30, 30],
        }),
      })
        .bindPopup(popupHtml)
        .addTo(marksLayerRef.current!)
    })
  }, [userMarks])

  // === Фильтр барьеров ===
  const toggleBarrier = (type: BarrierType) => {
    setVisibleBarriers(prev => {
      const newSet = new Set(prev)
      if (newSet.has(type)) {
        newSet.delete(type)
      } else {
        newSet.add(type)
      }
      return newSet
    })
  }

  return (
    <div style={{ display: 'flex', height: '100%', width: '100%', position: 'relative' }}>
      <div id="map-container" style={{ flex: 1, height: '100%' }} />
      
      {/* ── Кнопка "Найти меня" — внизу справа, выше зума ── */}
      <button
        onClick={() => {
          if (myLatLngRef.current && mapRef.current) {
            mapRef.current.setView(myLatLngRef.current, 16, { animate: true })
          } else if (mapRef.current) {
            mapRef.current.locate({ setView: true, maxZoom: 16, enableHighAccuracy: true })
          }
        }}
        title="Моё местоположение"
        style={{
          position: 'absolute',
          bottom: 145, right: 10,
          zIndex: 1000,
          width: 44, height: 44,
          opacity: sheetFull ? 0 : 1,
          pointerEvents: sheetFull ? 'none' : 'auto',
          transition: 'opacity .3s ease',
          borderRadius: '50%',
          background: theme === 'dark' ? 'rgba(30,37,53,0.95)' : 'rgba(255,255,255,0.95)',
          border: '2px solid rgba(0,122,255,.5)',
          boxShadow: '0 4px 16px rgba(0,0,0,.35)',
          backdropFilter: 'blur(8px)',
          cursor: 'pointer',
          fontSize: 20,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        📍
      </button>

      {/* ── Кнопка темы — top right ── */}
      {onThemeToggle && (
        <button
          onClick={onThemeToggle}
          title="Сменить тему"
          style={{
            position: 'absolute',
            top: 14, right: 14,
            zIndex: 1000,
            width: 44, height: 44,
            borderRadius: '50%',
            background: theme === 'dark' ? 'rgba(30,37,53,0.95)' : 'rgba(255,255,255,0.95)',
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 4px 16px rgba(0,0,0,.35)',
            backdropFilter: 'blur(8px)',
            cursor: 'pointer',
            fontSize: 20,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      )}

      {/* ── Фильтр барьеров — top left ── */}
      <div style={{
        position: 'absolute',
        top: 14, left: 14,
        zIndex: 1000,
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8,
      }}>
        <button
          onClick={() => setFilterOpen(o => !o)}
          style={{
            backgroundColor: theme === 'dark' ? 'rgba(30,37,53,0.95)' : 'rgba(255,255,255,0.95)',
            border: `1px solid ${filterOpen ? '#2EC67A' : 'rgba(255,255,255,0.12)'}`,
            borderRadius: 12,
            padding: '8px 14px',
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 600,
            color: theme === 'dark' ? '#fff' : '#111',
            boxShadow: '0 4px 16px rgba(0,0,0,0.35)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'border-color .2s',
          }}
        >
          <span>🔍</span>
          <span>Барьеры</span>
          <span style={{ fontSize: 10, opacity: .7 }}>{filterOpen ? '▲' : '▼'}</span>
        </button>

        {filterOpen && (
          <div
            ref={el => { if (el) legendRef.current = el }}
            style={{
              backgroundColor: theme === 'dark' ? 'rgba(30,37,53,0.97)' : 'rgba(255,255,255,0.97)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 14,
              padding: '12px 14px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              backdropFilter: 'blur(12px)',
              minWidth: 170,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '.06em', textTransform: 'uppercase', marginBottom: 10 }}>
              Показать на карте
            </div>
            {Object.entries(BARRIER_STYLE).map(([type, { color, label, icon }]) => (
              <label key={type} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                marginBottom: 8, cursor: 'pointer',
                color: theme === 'dark' ? '#fff' : '#111',
                fontSize: 13,
              }}>
                <input
                  type="checkbox"
                  checked={visibleBarriers.has(type as BarrierType)}
                  onChange={() => toggleBarrier(type as BarrierType)}
                  style={{ width: 16, height: 16, cursor: 'pointer', accentColor: color }}
                />
                <span>{icon}</span>
                <span>{label}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* ── Диалог добавления метки — по центру экрана ── */}
      {markDialog && (
        <div style={{
          position: 'absolute', inset: 0, zIndex: 2000,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'rgba(0,0,0,.55)',
          padding: '20px',
        }}
          onClick={() => setMarkDialog(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              width: '100%', maxWidth: 360,
              background: theme === 'dark' ? '#1E2535' : '#fff',
              borderRadius: 20,
              padding: '24px 20px',
              boxShadow: '0 20px 60px rgba(0,0,0,.5)',
            }}
          >
            {/* Заголовок */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <span style={{ fontWeight: 700, fontSize: 17, color: theme === 'dark' ? '#fff' : '#111' }}>
                Добавить место
              </span>
              <button onClick={() => setMarkDialog(null)}
                style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--muted)', lineHeight: 1 }}>
                ×
              </button>
            </div>

            {!markDialog.type ? (
              /* Выбор типа */
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                {([
                  { type: 'place',    icon: '📍', label: 'Моё место',   color: '#FF6B6B' },
                  { type: 'favorite', icon: '⭐', label: 'Избранное',   color: '#FFD700' },
                  { type: 'barrier',  icon: '⚠️', label: 'Препятствие', color: '#FFA500' },
                ] as const).map(opt => (
                  <button key={opt.type}
                    onClick={() => setMarkDialog(d => d ? { ...d, type: opt.type } : null)}
                    style={{
                      padding: '16px 8px', borderRadius: 16,
                      border: `2px solid ${opt.color}33`,
                      background: opt.color + '18',
                      cursor: 'pointer',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                      transition: 'transform .15s',
                    }}
                  >
                    <span style={{ fontSize: 32 }}>{opt.icon}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: theme === 'dark' ? '#ddd' : '#444', textAlign: 'center', lineHeight: 1.3 }}>{opt.label}</span>
                  </button>
                ))}
              </div>
            ) : (
              /* Ввод названия */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                  Введите название для метки:
                </div>
                <input
                  autoFocus
                  value={markLabel}
                  onChange={e => setMarkLabel(e.target.value)}
                  placeholder="Например: Любимое кафе"
                  style={{
                    padding: '14px 16px', borderRadius: 12, fontSize: 16,
                    border: `1.5px solid ${markLabel.trim() ? '#2EC67A' : theme === 'dark' ? 'rgba(255,255,255,.15)' : 'rgba(0,0,0,.15)'}`,
                    background: theme === 'dark' ? 'rgba(255,255,255,.06)' : '#f7f7f7',
                    color: theme === 'dark' ? '#fff' : '#111',
                    outline: 'none', width: '100%', boxSizing: 'border-box',
                    transition: 'border-color .2s',
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && markLabel.trim()) {
                      const mark = marksStorage.add({ lat: markDialog.latlng.lat, lng: markDialog.latlng.lng, type: markDialog.type!, label: markLabel.trim() })
                      setUserMarks(prev => [...prev, mark])
                      setMarkDialog(null)
                    }
                  }}
                />
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setMarkDialog(d => d ? { ...d, type: null } : null)}
                    style={{ flex: 1, padding: '13px', borderRadius: 12, border: `1px solid ${theme === 'dark' ? 'rgba(255,255,255,.15)' : 'rgba(0,0,0,.15)'}`, background: 'transparent', color: theme === 'dark' ? '#ccc' : '#555', fontSize: 15, cursor: 'pointer' }}>
                    ← Назад
                  </button>
                  <button
                    disabled={!markLabel.trim()}
                    onClick={() => {
                      if (!markLabel.trim()) return
                      const mark = marksStorage.add({ lat: markDialog.latlng.lat, lng: markDialog.latlng.lng, type: markDialog.type!, label: markLabel.trim() })
                      setUserMarks(prev => [...prev, mark])
                      setMarkDialog(null)
                    }}
                    style={{ flex: 2, padding: '13px', borderRadius: 12, border: 'none', background: markLabel.trim() ? '#2EC67A' : 'rgba(46,198,122,.3)', color: '#fff', fontSize: 15, fontWeight: 700, cursor: markLabel.trim() ? 'pointer' : 'not-allowed', transition: 'background .2s' }}>
                    Сохранить ✓
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
