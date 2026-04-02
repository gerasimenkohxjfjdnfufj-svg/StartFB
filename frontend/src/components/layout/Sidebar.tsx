import { useState } from 'react'
import type { ProfileType, RouteResult } from '../../types'
import { routesApi, geoApi } from '../../services/api'

interface Props {
  open: boolean
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

export default function Sidebar({ open, profile, onProfileChange, onRouteBuilt, theme, onThemeToggle }: Props) {
  const [from, setFrom] = useState('')
  const [to, setTo]     = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')
  const [score, setScore]     = useState<number | null>(null)
  const [dist, setDist]       = useState('')
  const [time, setTime]       = useState('')
  const [listening, setListening] = useState<'from' | 'to' | null>(null)

  const buildRoute = async () => {
    if (!from || !to) { setError('Введите оба адреса'); return }
    setLoading(true); setError('')
    try {
      const [fromRes, toRes] = await Promise.all([
        geoApi.search(from),
        geoApi.search(to),
      ])
      if (!fromRes.data.length) throw new Error('Адрес "Откуда" не найден')
      if (!toRes.data.length)   throw new Error('Адрес "Куда" не найден')

      const fp = fromRes.data[0], tp = toRes.data[0]
      const res = await routesApi.build({
        from: { lat: fp.lat, lng: fp.lng },
        to:   { lat: tp.lat, lng: tp.lng },
        profile,
        from_address: from,
        to_address:   to,
      })
      const r: RouteResult = res.data
      setScore(r.accessibility_score)
      setDist((r.distance_m / 1000).toFixed(1) + ' км')
      setTime(Math.round(r.duration_sec / 60) + ' мин')
      onRouteBuilt(r)
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Ошибка построения маршрута'
      setError(msg)
    } finally { setLoading(false) }
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
      target === 'from' ? setFrom(text) : setTo(text)
      setListening(null)
    }
    r.onerror = () => setListening(null)
    r.onend   = () => setListening(null)
    r.start()
  }

  const scoreColor = score === null ? '' : score >= 80 ? '#2EC67A' : score >= 50 ? '#F5C842' : '#F04E37'

  return (
    <aside className={`sidebar ${open ? 'open' : ''}`}>
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

      <div className="sidebar-body">
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

        <div className="section-label">Маршрут</div>
        <div className="input-group">
          <div className="input-wrap">
            <span style={{ color: '#2EC67A' }}>●</span>
            <input value={from} onChange={e => setFrom(e.target.value)}
              placeholder="Откуда..." onKeyDown={e => e.key === 'Enter' && buildRoute()} />
            <button className={`btn-mic ${listening === 'from' ? 'listening' : ''}`}
              onClick={() => startVoice('from')}>🎤</button>
          </div>
          <button className="btn-swap" onClick={() => { const t = from; setFrom(to); setTo(t) }}>
            ⇅ Поменять
          </button>
          <div className="input-wrap">
            <span style={{ color: '#F04E37' }}>●</span>
            <input value={to} onChange={e => setTo(e.target.value)}
              placeholder="Куда..." onKeyDown={e => e.key === 'Enter' && buildRoute()} />
            <button className={`btn-mic ${listening === 'to' ? 'listening' : ''}`}
              onClick={() => startVoice('to')}>🎤</button>
          </div>
        </div>

        {error && <div className="error-msg">⚠️ {error}</div>}

        <button className="btn-main" onClick={buildRoute} disabled={loading}>
          {loading ? '⏳ Строю маршрут...' : '🗺 Построить доступный маршрут'}
        </button>

        {score !== null && (
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
            </div>
            <div className="access-bar-wrap">
              <div className="access-bar-label">
                <span>Доступность</span>
                <span style={{ color: scoreColor, fontWeight: 700 }}>{score}%</span>
              </div>
              <div className="access-bar-track">
                <div className="access-bar-fill"
                  style={{ width: `${score}%`, background: scoreColor }} />
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
