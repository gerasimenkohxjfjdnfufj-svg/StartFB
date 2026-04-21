import { useState, useRef } from 'react'
import { marksApi } from '../../services/api'

const OBSTACLE_TYPES = [
  { value: 'no_ramp',       icon: '🚫', label: 'Нет пандуса' },
  { value: 'broken_ramp',   icon: '⚠️', label: 'Сломан пандус' },
  { value: 'no_elevator',   icon: '🛗', label: 'Нет лифта' },
  { value: 'narrow_path',   icon: '↔️', label: 'Узкий проход' },
  { value: 'step',          icon: '🪜', label: 'Ступень/порог' },
  { value: 'blocked_path',  icon: '🚧', label: 'Перекрыт путь' },
  { value: 'bad_surface',   icon: '🪨', label: 'Плохое покрытие' },
  { value: 'other',         icon: '📌', label: 'Другое' },
]

interface Props {
  pendingCoords: { lat: number; lng: number } | null
  onActivateMode: () => void
  onMarkCreated: () => void
  onCancel: () => void
}

export default function VolunteerPanel({ pendingCoords, onActivateMode, onMarkCreated, onCancel }: Props) {
  const [obstacleType, setObstacleType] = useState('no_ramp')
  const [comment, setComment]           = useState('')
  const [photoFile, setPhotoFile]       = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setPhotoFile(f)
    setPhotoPreview(URL.createObjectURL(f))
  }

  const submit = async () => {
    if (!pendingCoords) return
    setLoading(true)
    setError('')
    try {
      let photoUrl: string | undefined
      if (photoFile) {
        const res = await marksApi.uploadPhoto(photoFile)
        photoUrl = res.data.url
      }
      await marksApi.create({
        lat: pendingCoords.lat,
        lng: pendingCoords.lng,
        category: 'obstacle',
        type: obstacleType,
        comment: comment || undefined,
        photo_url: photoUrl,
      })
      // Сброс формы
      setComment('')
      setPhotoFile(null)
      setPhotoPreview(null)
      setObstacleType('no_ramp')
      onMarkCreated()
    } catch {
      setError('Не удалось сохранить метку')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Кнопка активации режима или форма */}
      {!pendingCoords ? (
        <div>
          <div style={s.hint}>
            Нажмите кнопку, затем тапните на карту, чтобы отметить препятствие
          </div>
          <button style={s.addBtn} onClick={onActivateMode}>
            📍 Отметить препятствие
          </button>
        </div>
      ) : (
        <div style={s.form}>
          <div style={s.coordsBadge}>
            📌 {pendingCoords.lat.toFixed(5)}, {pendingCoords.lng.toFixed(5)}
          </div>

          <div style={s.label}>Тип препятствия</div>
          <div style={s.typeGrid}>
            {OBSTACLE_TYPES.map(t => (
              <button key={t.value}
                style={{ ...s.typeBtn, ...(obstacleType === t.value ? s.typeBtnActive : {}) }}
                onClick={() => setObstacleType(t.value)}>
                <span>{t.icon}</span>
                <span style={{ fontSize: 11 }}>{t.label}</span>
              </button>
            ))}
          </div>

          <div style={s.label}>Комментарий</div>
          <textarea
            style={s.textarea}
            placeholder="Опишите проблему подробнее..."
            value={comment}
            onChange={e => setComment(e.target.value)}
            rows={3}
          />

          <div style={s.label}>Фото</div>
          {photoPreview ? (
            <div style={{ position: 'relative' }}>
              <img src={photoPreview} style={s.preview} alt="preview" />
              <button style={s.removePhoto} onClick={() => { setPhotoFile(null); setPhotoPreview(null) }}>✕</button>
            </div>
          ) : (
            <button style={s.photoBtn} onClick={() => fileRef.current?.click()}>
              📷 Прикрепить фото
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" capture="environment"
            style={{ display: 'none' }} onChange={onFileChange} />

          {error && <div style={s.error}>{error}</div>}

          <div style={s.btnRow}>
            <button style={s.cancelBtn} onClick={onCancel}>Отмена</button>
            <button style={{ ...s.submitBtn, opacity: loading ? 0.6 : 1 }}
              onClick={submit} disabled={loading}>
              {loading ? 'Сохраняю...' : 'Сохранить метку'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const s: Record<string, React.CSSProperties> = {
  hint: { color: '#888', fontSize: 13, marginBottom: 12, lineHeight: 1.5 },
  addBtn: {
    width: '100%', padding: '14px', borderRadius: 12, border: 'none',
    background: '#e05c2d', color: '#fff', fontSize: 15, fontWeight: 600,
    cursor: 'pointer',
  },
  form: { display: 'flex', flexDirection: 'column', gap: 10 },
  coordsBadge: {
    background: '#1a2a1a', border: '1px solid #2a4a2a', color: '#6f6',
    borderRadius: 8, padding: '6px 10px', fontSize: 12,
  },
  label: { color: '#aaa', fontSize: 12, marginTop: 2 },
  typeGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 },
  typeBtn: {
    display: 'flex', alignItems: 'center', gap: 6,
    padding: '8px 10px', borderRadius: 8, border: '1px solid #333',
    background: '#12121f', color: '#ccc', cursor: 'pointer', fontSize: 13,
  },
  typeBtnActive: { border: '1px solid #e05c2d', background: '#2a1a0a', color: '#fff' },
  textarea: {
    padding: '10px', borderRadius: 8, border: '1px solid #333',
    background: '#12121f', color: '#fff', fontSize: 13, resize: 'none',
    fontFamily: 'inherit',
  },
  photoBtn: {
    padding: '10px', borderRadius: 8, border: '1px dashed #444',
    background: 'transparent', color: '#888', cursor: 'pointer', fontSize: 13,
  },
  preview: { width: '100%', borderRadius: 8, maxHeight: 180, objectFit: 'cover' },
  removePhoto: {
    position: 'absolute', top: 6, right: 6,
    background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none',
    borderRadius: '50%', width: 24, height: 24, cursor: 'pointer', fontSize: 14,
  },
  error: { background: '#3d1a1a', color: '#f66', borderRadius: 6, padding: '8px 10px', fontSize: 12 },
  btnRow: { display: 'flex', gap: 8 },
  cancelBtn: {
    flex: 1, padding: '10px', borderRadius: 10, border: '1px solid #444',
    background: 'transparent', color: '#888', cursor: 'pointer', fontSize: 13,
  },
  submitBtn: {
    flex: 2, padding: '10px', borderRadius: 10, border: 'none',
    background: '#e05c2d', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
  },
}
