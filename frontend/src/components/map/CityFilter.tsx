import { useState, useEffect } from 'react'
import { cityStorage } from '../../utils/storage'

export interface CityInfo {
  name: string
  searchCity: string
  coords: [number, number]
  delta: number
}

interface Props {
  theme: 'dark' | 'light'
  onCitySelected: (info: CityInfo) => void
}

const MAJOR_CITIES: CityInfo[] = [
  { name: 'Москва и область', searchCity: 'Москва', coords: [55.7558, 37.6176], delta: 2.5 },
  { name: 'Санкт-Петербург',  searchCity: 'Санкт-Петербург', coords: [59.9311, 30.3609], delta: 1.8 },
  { name: 'Новосибирск',      searchCity: 'Новосибирск',      coords: [55.0084, 82.9357], delta: 1.8 },
  { name: 'Екатеринбург',     searchCity: 'Екатеринбург',     coords: [56.8389, 60.6057], delta: 1.8 },
  { name: 'Казань',           searchCity: 'Казань',           coords: [55.1894, 48.9027], delta: 1.8 },
  { name: 'Уфа',              searchCity: 'Уфа',              coords: [54.7355, 55.9988], delta: 1.8 },
  { name: 'Краснодар',        searchCity: 'Краснодар',        coords: [45.0355, 38.9759], delta: 1.8 },
  { name: 'Пермь',            searchCity: 'Пермь',            coords: [58.0193, 56.2389], delta: 1.8 },
]

export default function CityFilter({ theme, onCitySelected }: Props) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedName, setSelectedName] = useState<string>(() => cityStorage.get())

  useEffect(() => {
    if (selectedName) {
      const city = MAJOR_CITIES.find(c => c.name === selectedName || c.searchCity === selectedName)
      if (city) onCitySelected(city)
    }
  }, [selectedName])

  const handleSelect = (city: CityInfo) => {
    setSelectedName(city.name)
    cityStorage.set(city.name)
    onCitySelected(city)
    setIsOpen(false)
  }

  const displayCity = selectedName || 'Выберите город'

  return (
    <div style={{ position: 'relative', marginBottom: 12 }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%', padding: '10px 12px',
          background: 'var(--bg3)', border: '1px solid var(--border)',
          borderRadius: 10, color: 'var(--text)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
          fontSize: 13, fontWeight: 500, transition: 'border-color 0.25s ease',
        }}
        onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(46,198,122,.4)')}
        onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
      >
        <span>🌍</span>
        <span style={{ flex: 1, textAlign: 'left' }}>{displayCity}</span>
        <span style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.25s ease' }}>▼</span>
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4,
          background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 10, zIndex: 1000, boxShadow: '0 4px 12px rgba(0,0,0,.15)',
          maxHeight: 250, overflowY: 'auto',
        }}>
          {MAJOR_CITIES.map(city => (
            <button
              key={city.name}
              onClick={() => handleSelect(city)}
              style={{
                width: '100%', padding: '12px 16px',
                background: selectedName === city.name ? 'rgba(46,198,122,.1)' : 'transparent',
                border: 'none', borderBottom: '1px solid var(--border)',
                color: 'var(--text)', cursor: 'pointer', fontSize: 14,
                textAlign: 'left', transition: 'background 0.15s ease',
              }}
              onMouseEnter={e => { if (selectedName !== city.name) e.currentTarget.style.background = 'rgba(255,255,255,.05)' }}
              onMouseLeave={e => { if (selectedName !== city.name) e.currentTarget.style.background = 'transparent' }}
            >
              <span style={{ fontWeight: selectedName === city.name ? 600 : 400 }}>
                {selectedName === city.name ? '✓ ' : '  '}{city.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
