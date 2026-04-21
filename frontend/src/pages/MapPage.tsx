// Главная страница с картой
// TODO: перенести логику из HTML MVP
// Роман: реализует в Спринте 3 (feature/react-map)

export default function MapPage() {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      flexDirection: 'column',
      gap: 16,
      background: '#0F1217',
      color: '#EEF2F7'
    }}>
      <div style={{ fontSize: 48 }}>🗺</div>
      <h1 style={{ fontFamily: 'sans-serif', fontSize: 24, color: '#2EC67A' }}>
        Доступный город
      </h1>
      <p style={{ color: '#7A8499', fontFamily: 'sans-serif' }}>
        Backend запущен → <a href="/v1/docs" style={{ color: '#2D7CF6' }}>API Docs</a>
      </p>
      <p style={{ color: '#4A5568', fontSize: 12, fontFamily: 'monospace' }}>
        Frontend: Спринт 3 — feature/react-map
      </p>
    </div>
  )
}
