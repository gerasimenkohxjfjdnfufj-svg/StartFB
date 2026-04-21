import { useState, useEffect, useRef } from 'react'
import MapView from './components/map/MapView'
import Sidebar from './components/layout/Sidebar'
import AuthPage from './pages/AuthPage'
import { useAuthStore } from './store/useAuthStore'
import type { ProfileType, RouteResult } from './types'
import type { CityInfo } from './components/map/CityFilter'
import './App.css'

export type { ProfileType, RouteResult }

function useIsMobile() {
  const [mobile, setMobile] = useState(() => window.innerWidth <= 768)
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)')
    const handler = (e: MediaQueryListEvent) => setMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return mobile
}

function App() {
  const { user } = useAuthStore()

  const [profile, setProfile] = useState<ProfileType>(
    (user?.profile_type as ProfileType) ?? 'wheelchair'
  )
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    (localStorage.getItem('dg_theme') as 'dark' | 'light') || 'dark'
  )
  const [route, setRoute]             = useState<RouteResult | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sheetFull, setSheetFull]     = useState(false)
  const [selectedCityInfo, setSelectedCityInfo] = useState<CityInfo | null>(null)
  const isMobile = useIsMobile()

  // Волонтёрский режим — ожидание клика на карту
  const [volunteerMode, setVolunteerMode] = useState(false)
  const [pendingVolunteerCoords, setPendingVolunteerCoords] = useState<{ lat: number; lng: number } | null>(null)
  const [volunteerMarksKey, setVolunteerMarksKey] = useState(0)

  const dragStartY    = useRef<number | null>(null)
  const dragStartFull = useRef(false)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('dg_theme', theme)
  }, [theme])

  useEffect(() => {
    if (!isMobile) setSidebarOpen(true)
  }, [isMobile])

  const handleRouteBuilt = (r: RouteResult) => {
    setRoute(r)
    if (isMobile) setSheetFull(false)
  }

  const onSheetHandleTouchStart = (e: React.TouchEvent) => {
    dragStartY.current = e.touches[0].clientY
    dragStartFull.current = sheetFull
  }
  const onSheetHandleTouchEnd = (e: React.TouchEvent) => {
    if (dragStartY.current === null) return
    const dy = dragStartY.current - e.changedTouches[0].clientY
    if (Math.abs(dy) > 30) setSheetFull(dy > 0)
    dragStartY.current = null
  }

  const sidebarClass = [
    'sidebar',
    !isMobile && sidebarOpen ? 'open' : '',
    isMobile && sheetFull ? 'sheet-full' : '',
  ].filter(Boolean).join(' ')

  if (!user) return <AuthPage />

  return (
    <div className={`app ${theme}`}>

      {!isMobile && (
        <button className="menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Меню">
          ☰
        </button>
      )}

      <Sidebar
        open={sidebarOpen}
        sheetFull={sheetFull}
        onSheetToggle={() => setSheetFull(f => !f)}
        onSheetHandleTouchStart={onSheetHandleTouchStart}
        onSheetHandleTouchEnd={onSheetHandleTouchEnd}
        sidebarClass={sidebarClass}
        isMobile={isMobile}
        profile={profile}
        onProfileChange={setProfile}
        onRouteBuilt={handleRouteBuilt}
        theme={theme}
        onThemeToggle={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        volunteerMode={volunteerMode}
        onVolunteerModeChange={(v) => {
          setVolunteerMode(v)
          if (!v) setPendingVolunteerCoords(null)
        }}
        pendingVolunteerCoords={pendingVolunteerCoords}
        onVolunteerMarkCreated={() => {
          setVolunteerMode(false)
          setPendingVolunteerCoords(null)
          setVolunteerMarksKey(k => k + 1) // перезагружаем метки на карте
        }}
        onCitySelected={setSelectedCityInfo}
      />

      <MapView
        profile={profile}
        route={route}
        theme={theme}
        onThemeToggle={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
        selectedCityInfo={selectedCityInfo}
        sheetFull={isMobile && sheetFull}
        volunteerMode={volunteerMode}
        onVolunteerMapClick={(coords) => {
          setPendingVolunteerCoords(coords)
          setVolunteerMode(false)
          if (isMobile) setSheetFull(true) // раскрываем панель чтобы показать форму
        }}
        volunteerMarksKey={volunteerMarksKey}
      />
    </div>
  )
}

export default App
