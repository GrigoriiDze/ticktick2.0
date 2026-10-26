import { useState, type FormEvent } from 'react'
import type { Habit } from '../../../domain/types'
import type { HabitPatch } from '../../../data/habits'
import { buildRule, ruleParts, WEEKDAYS, WEEKDAY_LABEL, type Weekday } from '../../../domain/repeat'
import { HabitIcon } from './HabitIcon'
import { HABIT_COLORS } from '../constants'

interface Props {
  habit: Habit | null
  onSave: (name: string, patch: Partial<HabitPatch>) => void
  onClose: () => void
}

export function HabitModal({ habit, onSave, onClose }: Props) {
  const [name, setName] = useState(habit?.name ?? '')
  const [color, setColor] = useState(habit?.color ?? HABIT_COLORS[0])
  const [reminder, setReminder] = useState(habit?.reminders[0] ?? '')
  const parts = habit?.repeat ? ruleParts(habit.repeat) : null
  const [selectedDays, setSelectedDays] = useState<Set<Weekday>>(() => new Set<Weekday>(parts?.freq === 'WEEKLY' ? parts.byday : WEEKDAYS))
  const [isEveryDay, setIsEveryDay] = useState(() => !habit?.repeat || (parts?.freq === 'WEEKLY' && parts.byday.length === 0))

  function toggleDay(d: Weekday) {
    const next = new Set(selectedDays)
    if (next.has(d)) next.delete(d)
    else next.add(d)
    if (next.size > 0) {
      setSelectedDays(next)
      setIsEveryDay(next.size === 7)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const text = name.trim()
    if (!text) return

    let repeat: string | null = null
    if (!isEveryDay && selectedDays.size > 0 && selectedDays.size < 7) {
      repeat = buildRule({ freq: 'WEEKLY', interval: 1, byday: WEEKDAYS.filter((d) => selectedDays.has(d)), bymonthday: null })
    }

    onSave(text, {
      color,
      repeat,
      reminders: reminder ? [reminder] : [],
    })
  }

  return (
    <>
      <div className="scrim on" onClick={onClose} />
      <div className="dialog hb-modal" role="dialog" aria-label={habit ? 'Редактировать привычку' : 'Новая привычка'}>
        <div className="hb-modal-header">
          <h3>{habit ? 'Редактировать привычку' : 'Новая привычка'}</h3>
          <button className="round" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="hb-modal-form">
          <div className="hb-modal-row">
            <div className="hb-icon-badge large" style={{ background: color }}>
              <HabitIcon name={name || 'Привычка'} size={24} />
            </div>
            <input
              autoFocus
              className="hb-modal-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Название привычки (например, Пить воду)"
            />
          </div>

          <div className="hb-form-group">
            <label className="hb-form-label">Цвет</label>
            <div className="hb-color-swatches">
              {HABIT_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  className={`hb-color-swatch${color === c ? ' on' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          <div className="hb-form-group">
            <label className="hb-form-label">Дни повторения</label>
            <div className="hb-repeat-chips">
              <button
                type="button"
                className={`chip${isEveryDay ? ' on' : ''}`}
                onClick={() => {
                  setIsEveryDay(true)
                  setSelectedDays(new Set(WEEKDAYS))
                }}
              >
                Каждый день
              </button>
              <button
                type="button"
                className={`chip${!isEveryDay && selectedDays.size === 5 && !selectedDays.has('SA') && !selectedDays.has('SU') ? ' on' : ''}`}
                onClick={() => {
                  setIsEveryDay(false)
                  setSelectedDays(new Set(['MO', 'TU', 'WE', 'TH', 'FR']))
                }}
              >
                По будням
              </button>
            </div>
            <div className="hb-weekday-picker">
              {WEEKDAYS.map((d) => (
                <button
                  type="button"
                  key={d}
                  className={`hb-day-chip${!isEveryDay && selectedDays.has(d) ? ' on' : ''}`}
                  onClick={() => toggleDay(d)}
                >
                  {WEEKDAY_LABEL[d]}
                </button>
              ))}
            </div>
          </div>

          <div className="hb-form-group">
            <label className="hb-form-label">Напоминание</label>
            <input
              type="time"
              className="hb-time-input"
              value={reminder}
              onChange={(e) => setReminder(e.target.value)}
            />
          </div>

          <div className="hb-modal-footer">
            <button type="button" className="ghost" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className="primary" disabled={!name.trim()}>
              {habit ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}

