import { useState, useRef, useCallback } from 'react'
import CityFilter from '../map/CityFilter'
import type { ProfileType, RouteResult, BarrierType } from '../../types'
import { routesApi, geoApi } from '../../services/api'
import type { CityInfo } from '../map/CityFilter'

interface GeoSuggestion { lat: number; lng: number; display_name: string }

function useAddressInput(cityInfo?: CityInfo | null) {
  const [value, setValue]             = useState('')
  const [suggestions, setSuggestions] = useState<GeoSuggestion[]>([])
  const [loading, setLoading]         = useState(false)
  const [coords, setCoords]           = useState<{ lat: number; lng: number } | null>(null)
  const [open, setOpen]               = useState(false)
  const debounce                      = useRef<ReturnType<typeof setTimeout> | null>(null)

  const onChange = useCallback((text: string) => {
    setValue(text)
    setCoords(null)
    if (debounce.current) clearTimeout(debounce.current)
    if (text.length < 2) { setSuggestions([]); setOpen(false); return }
    debounce.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await geoApi.search(
          text,
          cityInfo?.searchCity || undefined,
          cityInfo?.coords || undefined,
          cityInfo?.delta || undefined,
        )
        setSuggestions(res.data.slice(0, 5))
        setOpen(res.data.length > 0)
      } catch { setSuggestions([]) }
      finally { setLoading(false) }
    }, 400)
  }, [cityInfo])

  const select = useCallback((s: GeoSuggestion) => {
    setValue(s.display_name.split(',').slice(0, 2).join(',').trim())
    setCoords({ lat: s.lat, lng: s.lng })
    setSuggestions([])
    setOpen(false)
  }, [])

  const close = useCallback(() => setOpen(false), [])

  return { value, setValue, suggestions, loading, coords, setCoords, open, onChange, select, close }
}

interface Props {
  open: boolean
  sheetFull: boolean
  onSheetToggle: () => void
  onSheetHandleTouchStart: (e: React.TouchEvent) => void
  onSheetHandleTouchEnd: (e: React.TouchEvent) => void
  sidebarClass: string
  isMobile: boolean
  profile: ProfileType
  onProfileChange: (p: ProfileType) => void
  onRouteBuilt: (r: RouteResult) => void
  theme: 'dark' | 'light'
  onThemeToggle: () => void
}

const PROFILES: { id: ProfileType; icon: string; label: string; desc: string }[] = [
  { id: 'wheelchair', icon: '♿', label: 'Колясочник / родитель', desc: 'Избегает ступеней' },
  { id: 'visually',   icon: '👁️', label: 'Слабовидящий',         desc: 'Тактильные дорожки' },
  { id: 'elderly',    icon: '🦯', label: 'Пожилой человек',      desc: 'Медленный темп' },
  { id: 'stroller',   icon: '🚶', label: 'После травмы',         desc: 'Избегает неровностей' },
]

const BARRIER_INFO: Record<BarrierType, { icon: string; label: string }> = {
  steps:       { icon: '𓊍', label: 'Ступени' },
  kerb:        { icon: '📍', label: 'Бордюр' },
  cobblestone: { icon: '🧱', label: 'Брусчатка' },
  crossing:    { icon: '🚶', label: 'Переход' },
  elevator:    { icon: '↕️', label: 'Лифт' },
  ramp:        { icon: '♿', label: 'Пандус' },
}

export default function Sidebar({
  sheetFull, onSheetToggle,
  onSheetHandleTouchStart, onSheetHandleTouchEnd,
  sidebarClass, isMobile,
  profile, onProfileChange, onRouteBuilt, theme, onThemeToggle,
}: Props) {
  const [selectedCity, setSelectedCity]       = useState('')
  const [cityInfo, setCityInfo]               = useState<CityInfo | null>(null)
  const fromField = useAddressInput(cityInfo)
  const toField   = useAddressInput(cityInfo)
  const [loading, setLoading]                 = useState(false)
  const [loadingBarriers, setLoadingBarriers] = useState(false)
  const [error, setError]                     = useState('')
  const [score, setScore]                     = useState<number | null>(null)
  const [dist, setDist]                       = useState('')
  const [time, setTime]                       = useState('')
  const [steps, setSteps]                     = useState(0)
  const [route, setRoute]                     = useState<RouteResult | null>(null)
  const [listening, setListening]             = useState<'from' | 'to' | null>(null)

  const buildRoute = async () => {
    if (!fromField.value || !toField.value) { setError('Введите оба адреса'); return }
    setLoading(true); setError(''); setScore(null)

    try {
      let fp = fromField.coords, tp = toField.coords
      if (!fp) {
        const r = await geoApi.search(fromField.value)
        if (!r.data.length) throw new Error('Адрес "Откуда" не найден')
        fp = { lat: r.data[0].lat, lng: r.data[0].lng }
      }
      if (!tp) {
        const r = await geoApi.search(toField.value)
        if (!r.data.length) throw new Error('Адрес "Куда" не найден')
        tp = { lat: r.data[0].lat, lng: r.data[0].lng }
      }

      const payload = {
        from: fp, to: tp, profile,
        from_address: fromField.value,
        to_address:   toField.value,
      }

      // ── Фаза 1: быстрый маршрут без барьеров ──
      const quickRes = await routesApi.build(payload, true)
      const quickRoute: RouteResult = quickRes.data
      setDist((quickRoute.distance_m / 1000).toFixed(1) + ' км')
      setTime(Math.round(quickRoute.duration_sec / 60) + ' мин')
      setSteps(Math.round(quickRoute.distance_m / 0.75))
      setRoute(quickRoute)
      onRouteBuilt(quickRoute)
      setLoading(false)

      // ── Фаза 2: барьеры асинхронно ──
      setLoadingBarriers(true)
      try {
        const fullRes = await routesApi.build(payload, false)
        const fullRoute: RouteResult = fullRes.data
        setScore(fullRoute.accessibility_score)
        setRoute(fullRoute)
        onRouteBuilt(fullRoute)
      } finally {
        setLoadingBarriers(false)
      }

    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Ошибка построения маршрута'
      setError(msg)
      setLoading(false)
      setLoadingBarriers(false)
    }
  }

  const startVoice = (target: 'from' | 'to') => {
    const SR = (window as Window & { SpeechRecognition?: unknown; webkitSpeechRecognition?: unknown })
      .SpeechRecognition ?? (window as Window & { webkitSpeechRecognition?: unknown }).webkitSpeechRecognition
    if (!SR) { setError('Голосовой ввод не поддерживается'); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = new (SR as any)()
    r.lang = 'ru-RU'; r.interimResults = false
    setListening(target)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    r.onresult = (e: any) => {
      const text = e.results[0][0].transcript
      target === 'from' ? fromField.onChange(text) : toField.onChange(text)
      setListening(null)
    }
    r.onerror = () => setListening(null)
    r.onend   = () => setListening(null)
    r.start()
  }

  const scoreColor = score === null
    ? 'var(--muted)'
    : score >= 80 ? '#2EC67A' : score >= 50 ? '#F5C842' : '#F04E37'

  const barrierCounts = route?.barriers_summary
    ? (Object.entries(route.barriers_summary) as [BarrierType, number][])
        .filter(([_, count]) => count > 0)
        .sort(([_, a], [__, b]) => b - a)
    : []

  return (
    <aside className={sidebarClass}>

      {/* ── Mobile drag handle ── */}
      {isMobile && (
        <div
          onClick={onSheetToggle}
          onTouchStart={onSheetHandleTouchStart}
          onTouchEnd={onSheetHandleTouchEnd}
          style={{
            width: '100%',
            height: 52,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 5,
            cursor: 'pointer',
            flexShrink: 0,
            userSelect: 'none',
          }}
        >
          <div style={{ width: 44, height: 4, borderRadius: 2, background: 'var(--muted)', opacity: .6 }} />
          <span style={{ fontSize: 11, color: 'var(--muted)', letterSpacing: '.04em' }}>
            {sheetFull ? '▼ свернуть' : '▲ Маршрут'}
          </span>
        </div>
      )}

      {/* ── Desktop header ── */}
      {!isMobile && (
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-icon">🗺</div>
            <div className="logo-text">
              <span className="logo-title">Доступный город</span>
              <span className="logo-sub">Навигация без барьеров</span>
            </div>
            <button className="theme-toggle" onClick={onThemeToggle} title="Тема">
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      )}

      <div className="sidebar-body">

        {/* City filter */}
        <CityFilter theme={theme} onCitySelected={(info) => { setSelectedCity(info.searchCity); setCityInfo(info) }} />

        {/* ── Адреса ── */}
        <div className="input-group">
          <div style={{ position: 'relative' }}>
            <div className="input-wrap">
              <span style={{ color: '#2EC67A' }}>●</span>
              <input
                value={fromField.value}
                onChange={e => fromField.onChange(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') fromField.close(); if (e.key === 'Enter') buildRoute() }}
                placeholder="Откуда..."
              />
              {fromField.loading && <span style={{ fontSize: 12, color: 'var(--muted)' }}>⏳</span>}
              <button className={`btn-mic ${listening === 'from' ? 'listening' : ''}`}
                onClick={() => startVoice('from')}>🎤</button>
            </div>
            {fromField.open && (
              <ul className="suggestions">
                {fromField.suggestions.map((s, i) => (
                  <li key={i} className="suggestion-item" onMouseDown={() => fromField.select(s)}>
                    <span className="suggestion-icon">📍</span>
                    <span className="suggestion-text">{s.display_name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <button className="btn-swap" onClick={() => {
            const tv = fromField.value, tc = fromField.coords
            fromField.setValue(toField.value); fromField.setCoords(toField.coords)
            toField.setValue(tv); toField.setCoords(tc)
          }}>⇅ Поменять</button>

          <div style={{ position: 'relative' }}>
            <div className="input-wrap">
              <span style={{ color: '#F04E37' }}>●</span>
              <input
                value={toField.value}
                onChange={e => toField.onChange(e.target.value)}
                onKeyDown={e => { if (e.key === 'Escape') toField.close(); if (e.key === 'Enter') buildRoute() }}
                placeholder="Куда..."
              />
              {toField.loading && <span style={{ fontSize: 12, color: 'var(--muted)' }}>⏳</span>}
              <button className={`btn-mic ${listening === 'to' ? 'listening' : ''}`}
                onClick={() => startVoice('to')}>🎤</button>
            </div>
            {toField.open && (
              <ul className="suggestions">
                {toField.suggestions.map((s, i) => (
                  <li key={i} className="suggestion-item" onMouseDown={() => toField.select(s)}>
                    <span className="suggestion-icon">📍</span>
                    <span className="suggestion-text">{s.display_name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {error && <div className="error-msg">⚠️ {error}</div>}

        <button className="btn-main" onClick={buildRoute} disabled={loading}>
          {loading ? '⏳ Строю маршрут...' : '🗺 Построить маршрут'}
        </button>

        {/* ── Результат ── */}
        {dist && (
          <div className="route-info">
            <div className="route-stats">
              <div className="stat">
                <span className="stat-val">{dist}</span>
                <span className="stat-lbl">Расстояние</span>
              </div>
              <div className="stat">
                <span className="stat-val">{time}</span>
                <span className="stat-lbl">Время</span>
              </div>
              <div className="stat" style={{ gridColumn: '1 / -1' }}>
                <span className="stat-val">🦶 {steps.toLocaleString('ru')}</span>
                <span className="stat-lbl">Шагов</span>
              </div>
            </div>
            <div className="access-bar-wrap">
              <div className="access-bar-label">
                <span>Доступность</span>
                {loadingBarriers
                  ? <span style={{ color: 'var(--muted)', fontSize: 12 }}>⏳ анализ барьеров...</span>
                  : score !== null
                    ? <span style={{ color: scoreColor, fontWeight: 700 }}>{score}%</span>
                    : null}
              </div>
              {score !== null && (
                <div className="access-bar-track">
                  <div className="access-bar-fill" style={{ width: `${score}%`, background: scoreColor }} />
                </div>
              )}
            </div>

            {barrierCounts.length > 0 && (
              <div style={{
                marginTop: 12, padding: 10,
                background: theme === 'dark' ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.05)',
                borderRadius: 8, fontSize: 13,
              }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>📍 Препятствия:</div>
                {barrierCounts.map(([type, count]) => (
                  <div key={type} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '5px 8px', marginBottom: 4, borderRadius: 4,
                    background: theme === 'dark' ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.08)',
                    borderLeft: `3px solid ${
                      type === 'steps' || type === 'kerb' ? '#F04E37'
                      : type === 'cobblestone' ? '#F5A623'
                      : type === 'crossing' ? '#2D7CF6' : '#2EC67A'
                    }`,
                  }}>
                    <span>{BARRIER_INFO[type]?.icon} {BARRIER_INFO[type]?.label}</span>
                    <span style={{ fontWeight: 600, padding: '2px 8px', borderRadius: 3,
                      background: theme === 'dark' ? 'rgba(255,255,255,.15)' : 'rgba(0,0,0,.1)' }}>
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Профили ── */}
        <div className="section-label">Профиль доступности</div>
        <div className="profile-grid">
          {PROFILES.map(p => (
            <button key={p.id} className={`profile-btn ${profile === p.id ? 'active' : ''}`}
              onClick={() => onProfileChange(p.id)}>
              <span className="p-icon">{p.icon}</span>
              <span className="p-name">{p.label}</span>
              <span className="p-desc">{p.desc}</span>
            </button>
          ))}
        </div>

      </div>
    </aside>
  )
}
