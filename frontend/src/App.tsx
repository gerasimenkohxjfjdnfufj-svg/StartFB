import { useState, useEffect } from 'react'
import MapView from './components/map/MapView'
import Sidebar from './components/layout/Sidebar'
import type { ProfileType, RouteResult } from './types'
import './App.css'

export type { ProfileType, RouteResult }

function App() {
  const [profile, setProfile] = useState<ProfileType>('wheelchair')
  const [theme, setTheme] = useState<'dark' | 'light'>(() =>
    (localStorage.getItem('dg_theme') as 'dark' | 'light') || 'dark'
  )
  const [route, setRoute] = useState<RouteResult | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('dg_theme', theme)
  }, [theme])

  return (
    <div className={`app ${theme}`}>
      <button
        className="menu-toggle"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Меню"
      >
        ☰
      </button>

      <Sidebar
        open={sidebarOpen}
        profile={profile}
        onProfileChange={setProfile}
        onRouteBuilt={setRoute}
        theme={theme}
        onThemeToggle={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
      />

      <MapView
        profile={profile}
        route={route}
        theme={theme}
      />
    </div>
  )
}

export default App
