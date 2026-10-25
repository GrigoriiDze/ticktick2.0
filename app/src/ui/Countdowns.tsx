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

const CD_PALETTE = ['#4772FA', '#E5484D', '#2FAA6B', '#F5A623', '#8A63E6', '#2BB0B0', '#D6559D']

/** Обратный отсчёт: до важного события, свадьбы, сдачи объекта, отпуска. Карточки с крупным числом дней */
export function Countdowns({ list, today, editing, onEdit: setEditing, onCreate, onUpdate, onDelete }: Props) {
  const form = useExit(editing)
  const sorted = sortCountdowns(list, today)
  const target = form.value && form.value !== 'new' ? list.find((c) => c.id === form.value) ?? null : null

  return (
    <div className="countdowns">
      {sorted.length === 0 && <p className="muted cd-empty">Событий нет. Нажмите «+», чтобы добавить дату, до которой считаем дни</p>}
      <div className="cd-grid">
        {sorted.map((c, idx) => {
          const days = daysUntil(c.date, today)
          const isPast = days < 0
          const color = CD_PALETTE[idx % CD_PALETTE.length]
          return (
            <div key={c.id} className={`cd-card${isPast ? ' past' : ''}`} style={{ ['--cd-accent' as string]: color }}>
              <div className="cd-stripe" />
              <button
                type="button"
                className="cd-main"
                onClick={() => setEditing(c.id)}
                aria-label={`${c.name}, ${countdownLabel(days)}`}
              >
                <div className="cd-body">
                  <div className="cd-info">
                    <span className="cd-name">{c.name}</span>
                    <span className="cd-date muted">{c.date.split('-').reverse().join('.')}</span>
                  </div>
                  <div className="cd-days-box" aria-hidden="true">
                    <span className="cd-big-number">{days === 0 ? '0' : Math.abs(days)}</span>
                    <span className="cd-days-label">
                      {days === 0 ? 'сегодня' : isPast ? 'дней прошло' : 'дней осталось'}
                    </span>
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
