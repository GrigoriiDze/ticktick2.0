import { useEffect, useState } from 'react'
import type { CheckStatus, Habit } from '../domain/types'
import { HabitIcon } from './Habits'

const MOODS = [
  { emoji: '😞', label: 'Тяжело' },
  { emoji: '😐', label: 'Нормально' },
  { emoji: '🙂', label: 'Хорошо' },
  { emoji: '😊', label: 'Отлично' },
  { emoji: '🤩', label: 'Супер!' },
]

interface Props {
  open: boolean
  habit: Habit | null
  day: string
  initialStatus: CheckStatus | undefined
  initialNote: string | null
  onSave: (habitId: string, day: string, status: CheckStatus | undefined, note: string | null) => void
  onClose: () => void
}

export function HabitLogSheet({
  open,
  habit,
  day,
  initialStatus,
  initialNote,
  onSave,
  onClose,
}: Props) {
  const [status, setStatus] = useState<CheckStatus>(initialStatus ?? 'done')
  const [selectedMood, setSelectedMood] = useState<string | null>(() => {
    if (!initialNote) return null
    const found = MOODS.find((m) => initialNote.startsWith(m.emoji))
    return found ? found.emoji : null
  })
  const [text, setText] = useState<string>(() => {
    if (!initialNote) return ''
    const found = MOODS.find((m) => initialNote.startsWith(m.emoji))
    return found ? initialNote.slice(found.emoji.length).trim() : initialNote
  })

  useEffect(() => {
    setStatus(initialStatus ?? 'done')
    const found = initialNote ? MOODS.find((m) => initialNote.startsWith(m.emoji)) : null
    setSelectedMood(found ? found.emoji : null)
    setText(found && initialNote ? initialNote.slice(found.emoji.length).trim() : (initialNote ?? ''))
  }, [open, initialStatus, initialNote])

  useEffect(() => {
    if (!open) return
    const onBack = (e: Event) => {
      e.preventDefault()
      onClose()
    }
    window.addEventListener('tt-back-request', onBack)
    return () => window.removeEventListener('tt-back-request', onBack)
  }, [open, onClose])

  if (!open || !habit) return null

  function handleSave() {
    if (!habit) return
    let note: string | null = null
    const trimmed = text.trim()
    if (selectedMood && trimmed) {
      note = `${selectedMood} ${trimmed}`
    } else if (selectedMood) {
      note = selectedMood
    } else if (trimmed) {
      note = trimmed
    }
    onSave(habit.id, day, status, note)
    onClose()
  }

  function handleClear() {
    if (!habit) return
    onSave(habit.id, day, undefined, null)
    onClose()
  }

  return (
    <div className="sheet-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Журнал привычки">
      <div className="habit-log-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" aria-hidden="true" />

        <div className="hl-header">
          <div className="hl-habit-info">
            <span className="hl-icon" style={{ color: habit.color ?? '#ff7a00' }}>
              <HabitIcon name={habit.name} size={26} />
            </span>
            <div>
              <h3 className="hl-title">{habit.name}</h3>
              <span className="hl-day">{day}</span>
            </div>
          </div>
          <button className="sheet-close-btn" onClick={onClose} aria-label="Закрыть">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Статус выполнения: Выполнено / Пропущено */}
        <div className="hl-status-row">
          <button
            type="button"
            className={`hl-status-btn done${status === 'done' ? ' active' : ''}`}
            onClick={() => setStatus('done')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>Выполнено</span>
          </button>
          <button
            type="button"
            className={`hl-status-btn skip${status === 'failed' ? ' active' : ''}`}
            onClick={() => setStatus('failed')}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            <span>Пропустить</span>
          </button>
        </div>

        {/* Настроение (5 смайлов) */}
        <div className="hl-section">
          <div className="hl-label">НАСТРОЕНИЕ И ОЩУЩЕНИЯ</div>
          <div className="hl-mood-row">
            {MOODS.map((m) => {
              const active = selectedMood === m.emoji
              return (
                <button
                  key={m.emoji}
                  type="button"
                  className={`hl-mood-btn${active ? ' active' : ''}`}
                  onClick={() => setSelectedMood(active ? null : m.emoji)}
                  title={m.label}
                >
                  <span className="hl-mood-emoji">{m.emoji}</span>
                  <span className="hl-mood-label">{m.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Заметка к привычке */}
        <div className="hl-section">
          <div className="hl-label">ЗАМЕТКА</div>
          <textarea
            className="hl-textarea"
            placeholder="Как прошла привычка? Добавьте мысли..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
          />
        </div>

        <div className="hl-actions">
          {initialStatus && (
            <button type="button" className="hl-clear-btn" onClick={handleClear}>
              Сбросить
            </button>
          )}
          <button type="button" className="hl-save-btn" onClick={handleSave}>
            Сохранить
          </button>
        </div>
      </div>
    </div>
  )
}
