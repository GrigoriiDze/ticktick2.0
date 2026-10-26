import { useState, type FormEvent } from 'react'
import { countdownLabel, daysUntil, sortCountdowns } from '../domain/countdown'
import { addDays, type DayKey } from '../domain/dates'
import type { Countdown } from '../domain/types'
import { useExit } from './useExit'

interface Props {
  list: Countdown[]
  today: DayKey
  /** null: форма закрыта, 'new': новое событие, иначе id изменяемого. Состояние живёт выше, чтобы кнопка «+» стояла в общем месте */
  editing: 'new' | string | null
  onEdit: (editing: 'new' | string | null) => void
  onCreate: (name: string, date: DayKey) => void
  onUpdate: (id: string, patch: { name: string; date: DayKey }) => void
  onDelete: (id: string) => void
}

function CountdownBadge({ name, idx }: { name: string; idx: number }) {
  const lower = name.toLowerCase()
  if (lower.includes('ticktick') || lower.includes('тиктик')) {
    return (
      <span className="m-cd-icon" style={{ background: '#95de64' }} aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="3" y="4" width="18" height="16" rx="3" fill="#ffffff" />
          <rect x="3" y="4" width="18" height="5" rx="2" fill="#4772fa" />
          <circle cx="9" cy="14" r="2" fill="#f5a623" />
          <path d="M13 14h5" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </span>
    )
  }
  if (lower.includes('нов') || lower.includes('год') || lower.includes('праздн') || lower.includes('рожд')) {
    return (
      <span className="m-cd-icon" style={{ background: '#ff949e' }} aria-hidden="true">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round">
          <path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M18.4 5.6l-2.8 2.8M8.4 15.6l-2.8 2.8" />
          <circle cx="12" cy="12" r="2" fill="#fde047" stroke="none" />
        </svg>
      </span>
    )
  }
  const bg = ['#91caff', '#95de64', '#ff949e', '#ffd666', '#b37feb'][idx % 5]
  return (
    <span className="m-cd-icon" style={{ background: bg }} aria-hidden="true">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path d="M7 4h10M7 20h10M8 4v4l4 4-4 4v4h8v-4l-4-4 4-4V4H8z" fill="#ffffff" stroke="#3b82f6" strokeWidth="1.6" strokeLinejoin="round" />
      </svg>
    </span>
  )
}

/** Обратный отсчёт 1-в-1 по photo_19: белые карточки с круглой иконкой слева и синим числом дней справа */
export function Countdowns({ list, today, editing, onEdit: setEditing, onCreate, onUpdate, onDelete }: Props) {
  const form = useExit(editing)
  const sorted = sortCountdowns(list, today)
  const target = form.value && form.value !== 'new' ? list.find((c) => c.id === form.value) ?? null : null

  return (
    <div className="countdowns">
      <div className="cd-grid">
        {/* Встроенная карточка «Используйте TickTick» как в photo_19 */}
        <div className="cd-card">
          <div className="cd-body">
            <CountdownBadge name="TickTick" idx={0} />
            <div className="cd-info">
              <span className="cd-name">Используйте TickTick</span>
            </div>
            <div className="cd-days-box">
              <span className="cd-today-text">Сегодня</span>
            </div>
          </div>
        </div>

        {sorted.map((c, idx) => {
          const days = daysUntil(c.date, today)
          const isPast = days < 0
          return (
            <div key={c.id} className={`cd-card${isPast ? ' past' : ''}`}>
              <button
                type="button"
                className="cd-main"
                onClick={() => setEditing(c.id)}
                aria-label={`${c.name}, ${countdownLabel(days)}`}
              >
                <div className="cd-body">
                  <CountdownBadge name={c.name} idx={idx} />
                  <div className="cd-info">
                    <span className="cd-name">{c.name}</span>
                  </div>
                  <div className="cd-days-box" aria-hidden="true">
                    {days === 0 ? (
                      <span className="cd-today-text">Сегодня</span>
                    ) : (
                      <>
                        <span className="cd-big-number">{Math.abs(days)}</span>
                        <span className="cd-days-label">
                          {isPast ? 'Дней прошло' : 'Дней до'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </button>
            </div>
          )
        })}
      </div>

      {form.value && (
        <CountdownForm
          key={form.value}
          leaving={form.leaving}
          item={target}
          today={today}
          onSave={(name, date) => {
            if (target) onUpdate(target.id, { name, date })
            else onCreate(name, date)
            setEditing(null)
          }}
          onDelete={
            target
              ? () => {
                  onDelete(target.id)
                  setEditing(null)
                }
              : undefined
          }
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}

function CountdownForm({
  item,
  today,
  leaving,
  onSave,
  onDelete,
  onClose,
}: {
  item: Countdown | null
  today: DayKey
  leaving: boolean
  onSave: (name: string, date: DayKey) => void
  onDelete?: () => void
  onClose: () => void
}) {
  const [name, setName] = useState(item?.name ?? '')
  const [date, setDate] = useState<string>(item?.date ?? addDays(today, 30))

  function submit(e: FormEvent) {
    e.preventDefault()
    if (name.trim() && date) onSave(name.trim(), date)
  }

  return (
    <>
      <div className={leaving ? 'scrim on leaving' : 'scrim on'} onClick={onClose} />
      <form className={leaving ? 'sheet cd-form leaving' : 'sheet cd-form'} onSubmit={submit} aria-label="Событие">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Название события"
          aria-label="Название события"
          enterKeyHint="done"
        />
        <label className="cd-field">
          <span className="muted">Целевая дата</span>
          <input
            className="plain-select"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            aria-label="Дата события"
          />
        </label>
        <div className="cd-actions">
          {onDelete && (
            <button type="button" className="ghost danger" onClick={onDelete}>
              Удалить
            </button>
          )}
          <span className="cd-spacer" />
          <button type="button" className="ghost" onClick={onClose}>
            Отмена
          </button>
          <button type="submit" className="primary" disabled={!name.trim() || !date}>
            Сохранить
          </button>
        </div>
      </form>
    </>
  )
}
