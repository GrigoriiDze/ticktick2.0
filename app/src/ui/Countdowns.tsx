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

/** Обратный отсчёт: до свадьбы, сдачи объекта, поставки. Крупное число дней и подпись, как в TickTick */
export function Countdowns({ list, today, editing, onEdit: setEditing, onCreate, onUpdate, onDelete }: Props) {
  const form = useExit(editing)
  const sorted = sortCountdowns(list, today)
  const target = form.value && form.value !== 'new' ? list.find((c) => c.id === form.value) ?? null : null

  return (
    <div className="countdowns">
      {sorted.length === 0 && <p className="muted cd-empty">Событий нет. Добавьте дату, до которой считаем дни</p>}
      <ul>
        {sorted.map((c) => {
          const days = daysUntil(c.date, today)
          return (
            <li key={c.id} className={days < 0 ? 'cd past' : 'cd'}>
              <button className="cd-main" onClick={() => setEditing(c.id)} aria-label={`${c.name}, ${countdownLabel(days)}`}>
                <span className="cd-name">{c.name}</span>
                <span className="cd-date muted">{c.date.split('-').reverse().join('.')}</span>
              </button>
              <span className="cd-days" aria-hidden="true">
                <strong>{days === 0 ? '0' : Math.abs(days)}</strong>
                <small>{countdownLabel(days).split(' ')[0]}</small>
              </span>
            </li>
          )
        })}
      </ul>

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
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Название события" aria-label="Название события" enterKeyHint="done" />
        <label className="cd-field">
          <span className="muted">Дата</span>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Дата события" />
        </label>
        <div className="cd-actions">
          {onDelete && (
            <button type="button" className="danger" onClick={onDelete}>
              Удалить
            </button>
          )}
          <span className="qt-spacer" />
          <button type="submit" className="primary" disabled={!name.trim() || !date}>
            Сохранить
          </button>
        </div>
      </form>
    </>
  )
}
