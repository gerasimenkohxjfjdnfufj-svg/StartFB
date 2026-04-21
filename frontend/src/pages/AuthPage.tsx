import { useState } from 'react'
import { authApi } from '../services/api'
import { useAuthStore } from '../store/useAuthStore'

type Tab = 'login' | 'register'
type Role = 'user' | 'volunteer'
type ProfileType = 'wheelchair' | 'visually' | 'elderly' | 'stroller'

const PROFILES: { value: ProfileType; label: string; icon: string; desc: string }[] = [
  { value: 'wheelchair', label: 'Колясочник',       icon: '♿', desc: 'Маршруты с пандусами и лифтами' },
  { value: 'visually',   label: 'Слабовидящий',     icon: '👁', desc: 'Маршруты с тактильными дорожками' },
  { value: 'elderly',    label: 'Пожилой человек',  icon: '🧓', desc: 'Маршруты с низкой нагрузкой' },
  { value: 'stroller',   label: 'С коляской',       icon: '👶', desc: 'Маршруты без ступеней и барьеров' },
]

export default function AuthPage() {
  const [tab, setTab]               = useState<Tab>('login')
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [name, setName]             = useState('')
  const [role, setRole]             = useState<Role>('user')
  const [profileType, setProfileType] = useState<ProfileType>('wheelchair')
  const [error, setError]           = useState('')
  const [loading, setLoading]       = useState(false)

  const { setAuth } = useAuthStore()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      let res
      if (tab === 'login') {
        res = await authApi.login({ email, password })
      } else {
        res = await authApi.register({
          email, password, name, role,
          profile_type: role === 'user' ? profileType : undefined,
        })
      }
      const { user, access_token, refresh_token } = res.data
      setAuth(user, access_token, refresh_token)
    } catch (err: any) {
      setError(err?.response?.data?.detail || 'Что-то пошло не так')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.card}>
        {/* Логотип */}
        <div style={styles.logo}>
          <span style={styles.logoIcon}>♿</span>
          <div>
            <div style={styles.logoTitle}>Доступный город</div>
            <div style={styles.logoSub}>Навигатор для всех</div>
          </div>
        </div>

        {/* Табы */}
        <div style={styles.tabs}>
          <button style={{ ...styles.tab, ...(tab === 'login' ? styles.tabActive : {}) }}
            onClick={() => { setTab('login'); setError('') }}>
            Вход
          </button>
          <button style={{ ...styles.tab, ...(tab === 'register' ? styles.tabActive : {}) }}
            onClick={() => { setTab('register'); setError('') }}>
            Регистрация
          </button>
        </div>

        <form onSubmit={submit} style={styles.form}>
          {tab === 'register' && (
            <label style={styles.fieldWrap}>
              <span style={styles.fieldLabel}>Ваше имя</span>
              <input style={styles.input} type="text" placeholder="Иван Иванов"
                value={name} onChange={e => setName(e.target.value)} required />
            </label>
          )}

          <label style={styles.fieldWrap}>
            <span style={styles.fieldLabel}>Email</span>
            <input style={styles.input} type="email" placeholder="example@mail.ru"
              value={email} onChange={e => setEmail(e.target.value)} required />
          </label>

          <label style={styles.fieldWrap}>
            <span style={styles.fieldLabel}>Пароль</span>
            <input style={styles.input} type="password" placeholder="Минимум 8 символов"
              value={password} onChange={e => setPassword(e.target.value)} required />
          </label>

          {tab === 'register' && (
            <>
              {/* Выбор роли */}
              <div style={styles.label}>Я являюсь:</div>
              <div style={styles.roleRow}>
                {([
                  { v: 'user',      icon: '🧑', label: 'Маломобильный\nгражданин' },
                  { v: 'volunteer', icon: '🤝', label: 'Волонтёр' },
                ] as const).map(r => (
                  <button key={r.v} type="button"
                    style={{ ...styles.roleBtn, ...(role === r.v ? styles.roleBtnActive : {}) }}
                    onClick={() => setRole(r.v)}>
                    <span style={{ fontSize: 24 }}>{r.icon}</span>
                    <span style={{ fontSize: 12, whiteSpace: 'pre-line', textAlign: 'center' }}>{r.label}</span>
                  </button>
                ))}
              </div>

              {/* Категория маломобильности — только для user */}
              {role === 'user' && (
                <>
                  <div style={styles.label}>Категория маломобильности:</div>
                  <div style={styles.profileGrid}>
                    {PROFILES.map(p => (
                      <button key={p.value} type="button"
                        style={{ ...styles.profileBtn, ...(profileType === p.value ? styles.profileBtnActive : {}) }}
                        onClick={() => setProfileType(p.value)}>
                        <span style={{ fontSize: 22 }}>{p.icon}</span>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{p.label}</span>
                        <span style={{ fontSize: 10, opacity: 0.7, textAlign: 'center' }}>{p.desc}</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </>
          )}

          {error && <div style={styles.error}>{error}</div>}

          <button style={{ ...styles.submitBtn, opacity: loading ? 0.6 : 1 }}
            type="submit" disabled={loading}>
            {loading ? 'Загрузка...' : tab === 'login' ? 'Войти' : 'Зарегистрироваться'}
          </button>
        </form>

        {tab === 'login' && (
          <div style={styles.hint}>
            Нет аккаунта?{' '}
            <span style={styles.link} onClick={() => setTab('register')}>Зарегистрироваться</span>
          </div>
        )}
      </div>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: 16, zIndex: 1000,
  },
  card: {
    background: '#1e1e2e', borderRadius: 20, padding: '32px 28px',
    width: '100%', maxWidth: 420,
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    maxHeight: '90vh', overflowY: 'auto',
  },
  logo: {
    display: 'flex', alignItems: 'center', gap: 12, marginBottom: 28,
  },
  logoIcon: { fontSize: 40 },
  logoTitle: { fontSize: 20, fontWeight: 700, color: '#fff' },
  logoSub: { fontSize: 13, color: '#888' },
  tabs: {
    display: 'flex', background: '#12121f', borderRadius: 10, padding: 4, marginBottom: 24,
  },
  tab: {
    flex: 1, padding: '10px 0', border: 'none', background: 'transparent',
    color: '#888', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 500,
  },
  tabActive: { background: '#2d6ae0', color: '#fff' },
  form: { display: 'flex', flexDirection: 'column', gap: 12 },
  input: {
    padding: '12px 14px', borderRadius: 10, border: '1px solid #333',
    background: '#12121f', color: '#fff', fontSize: 15, outline: 'none', width: '100%',
  },
  label: { color: '#aaa', fontSize: 13, marginTop: 4 },
  roleRow: { display: 'flex', gap: 10 },
  roleBtn: {
    flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
    padding: '14px 8px', borderRadius: 12, border: '2px solid #333',
    background: '#12121f', color: '#fff', cursor: 'pointer',
  },
  roleBtnActive: { border: '2px solid #2d6ae0', background: '#1a2a4a' },
  profileGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  profileBtn: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
    padding: '12px 8px', borderRadius: 12, border: '2px solid #333',
    background: '#12121f', color: '#fff', cursor: 'pointer',
  },
  profileBtnActive: { border: '2px solid #2d6ae0', background: '#1a2a4a' },
  error: {
    background: '#3d1a1a', color: '#ff6b6b', padding: '10px 14px',
    borderRadius: 8, fontSize: 13,
  },
  submitBtn: {
    padding: '14px', borderRadius: 12, border: 'none',
    background: '#2d6ae0', color: '#fff', fontSize: 16, fontWeight: 600,
    cursor: 'pointer', marginTop: 4,
  },
  hint: { textAlign: 'center', marginTop: 16, color: '#666', fontSize: 13 },
  link: { color: '#2d6ae0', cursor: 'pointer' },
  fieldWrap: { display: 'flex', flexDirection: 'column', gap: 5 },
  fieldLabel: { color: '#aaa', fontSize: 12, fontWeight: 500, letterSpacing: '0.02em' },
}
