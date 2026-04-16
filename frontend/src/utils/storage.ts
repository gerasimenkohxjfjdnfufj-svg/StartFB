// Система хранения данных в localStorage со сроками жизни

const CACHE_KEY_PREFIX = 'dg_cache_'
const MARKS_STORAGE_KEY = 'dg_marks'
const CITY_STORAGE_KEY = 'dg_selected_city'

export interface CachedData<T> {
  data: T
  timestamp: number
  ttl: number
}

export interface UserMark {
  id: string
  lat: number
  lng: number
  type: 'place' | 'barrier' | 'favorite' | 'route'
  label: string
  timestamp: number
}

// === Кэширование геокодирования ===
export const cacheStorage = {
  // Сохранить данные с TTL (по умолчанию 1 час)
  set<T>(key: string, data: T, ttlMinutes = 60): void {
    const cached: CachedData<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttlMinutes * 60 * 1000,
    }
    try {
      localStorage.setItem(CACHE_KEY_PREFIX + key, JSON.stringify(cached))
    } catch (e) {
      console.warn('LocalStorage full:', e)
    }
  },

  // Получить данные, если они еще валидны
  get<T>(key: string): T | null {
    try {
      const stored = localStorage.getItem(CACHE_KEY_PREFIX + key)
      if (!stored) return null

      const cached: CachedData<T> = JSON.parse(stored)
      const age = Date.now() - cached.timestamp

      if (age > cached.ttl) {
        localStorage.removeItem(CACHE_KEY_PREFIX + key)
        return null
      }

      return cached.data
    } catch {
      return null
    }
  },

  clear(key: string): void {
    localStorage.removeItem(CACHE_KEY_PREFIX + key)
  },

  clearAll(): void {
    const keys = Object.keys(localStorage)
    keys.forEach(key => {
      if (key.startsWith(CACHE_KEY_PREFIX)) {
        localStorage.removeItem(key)
      }
    })
  },
}

// === Сохранение пользовательских меток ===
export const marksStorage = {
  getAll(): UserMark[] {
    try {
      const stored = localStorage.getItem(MARKS_STORAGE_KEY)
      if (!stored) return []
      const parsed = JSON.parse(stored)
      // Защита: убедимся что это именно массив
      return Array.isArray(parsed) ? parsed : []
    } catch (e) {
      console.warn('Error loading marks from storage:', e)
      return []
    }
  },

  add(mark: Omit<UserMark, 'id' | 'timestamp'>): UserMark {
    const newMark: UserMark = {
      ...mark,
      id: `mark_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      timestamp: Date.now(),
    }

    const all = this.getAll()
    all.push(newMark)

    try {
      localStorage.setItem(MARKS_STORAGE_KEY, JSON.stringify(all))
    } catch (e) {
      console.warn('LocalStorage full:', e)
    }

    return newMark
  },

  remove(id: string): void {
    const all = this.getAll().filter(m => m.id !== id)
    localStorage.setItem(MARKS_STORAGE_KEY, JSON.stringify(all))
  },

  update(id: string, updates: Partial<UserMark>): void {
    const all = this.getAll()
    const idx = all.findIndex(m => m.id === id)
    if (idx !== -1) {
      all[idx] = { ...all[idx], ...updates }
      localStorage.setItem(MARKS_STORAGE_KEY, JSON.stringify(all))
    }
  },

  clear(): void {
    localStorage.removeItem(MARKS_STORAGE_KEY)
  },
}

// === Сохранение выбранного города ===
export const cityStorage = {
  get(): string {
    return localStorage.getItem(CITY_STORAGE_KEY) || ''
  },

  set(city: string): void {
    localStorage.setItem(CITY_STORAGE_KEY, city)
  },

  clear(): void {
    localStorage.removeItem(CITY_STORAGE_KEY)
  },
}
