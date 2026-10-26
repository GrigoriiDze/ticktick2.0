import { useState } from 'react'
import type { Habit } from '../../../domain/types'
import type { HabitPatch } from '../../../data/habits'
import { buildRule, ruleParts, WEEKDAYS, type Weekday } from '../../../domain/repeat'
import { HabitIcon } from './HabitIcon'
import {
  GALLERY_TEMPLATES,
  HABIT_COLORS,
  ICON_PRESETS,
  RU_WEEKDAYS_UPPER,
  habitQuote,
} from '../constants'

interface Props {
  habit: Habit | null
  prefill: { name: string; color: string; quote: string } | null
  onBack: () => void
  onSave: (name: string, patch: Partial<HabitPatch>) => void
}

export function MobileHabitFormScreen(props: Props) {
  const { habit, prefill } = props
  const [name, setName] = useState(habit?.name ?? prefill?.name ?? '')
  const [color, setColor] = useState(habit?.color ?? prefill?.color ?? HABIT_COLORS[0])
  const [quote, setQuote] = useState(prefill?.quote ?? habitQuote(habit?.name ?? prefill?.name ?? ''))
  const [section, setSection] = useState<'day' | 'night' | 'other'>('other')
  const [reminder, setReminder] = useState(habit?.reminders[0] ?? '')
  const parts = habit?.repeat ? ruleParts(habit.repeat) : null
  const [selectedDays, setSelectedDays] = useState<Set<Weekday>>(
    () => new Set<Weekday>(parts?.freq === 'WEEKLY' && parts.byday.length > 0 ? parts.byday : WEEKDAYS),
  )
  const [freqTab, setFreqTab] = useState<'daily' | 'weekly' | 'interval'>('daily')

  function toggleDay(d: Weekday) {
    const next = new Set(selectedDays)
    if (next.has(d)) {
      if (next.size > 1) next.delete(d)
    } else {
      next.add(d)
    }
    setSelectedDays(next)
  }

  function handleSave() {
    const text = (name.trim() || prefill?.name || 'Ежедневная проверка').trim()
    let repeat: string | null = null
    if (selectedDays.size > 0 && selectedDays.size < 7) {
      repeat = buildRule({ freq: 'WEEKLY', interval: 1, byday: WEEKDAYS.filter((d) => selectedDays.has(d)), bymonthday: null })
    }
    props.onSave(text, {
      color,
      repeat,
      reminders: reminder ? [reminder] : [],
    })
  }

  return (
    <div className="m-hb-subscreen">
      <header className="m-hb-subhead">
        <button type="button" className="m-hb-back-btn" onClick={props.onBack} aria-label="Назад">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="m-hb-subtitle">{habit ? 'Редактировать привычку' : 'Новая привычка'}</h2>
      </header>

      <div className="m-hb-form-scroll">
        <div className="m-hb-form-card">
          <div className="m-hb-form-title">Название</div>
          <input
            className="m-hb-gray-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ежедневная проверка"
          />
        </div>

        <div className="m-hb-form-card">
          <div className="m-hb-form-title">Значок</div>
          <div className="m-hb-icon-preview-row">
            <div className="m-hb-avatar large" style={{ background: color }}>
              <HabitIcon name={name || 'Ежедневная проверка'} size={30} />
            </div>
            <div className="m-hb-letter-badge">
              {(name.trim() || 'А').slice(0, 1).toUpperCase()}
            </div>
          </div>

          <div className="m-hb-icon-grid">
            {ICON_PRESETS.map((p, idx) => {
              const active = color === p.color && (name === p.key || (!name && idx === 0))
              return (
                <button
                  type="button"
                  key={p.key}
                  className={`m-hb-preset-btn${active ? ' on' : ''}`}
                  style={{ background: p.color }}
                  onClick={() => {
                    setColor(p.color)
                    if (!name.trim()) setName(p.key)
                  }}
                  title={p.hint}
                >
                  <HabitIcon name={p.key} size={22} />
                  {active && <span className="m-hb-preset-check">✓</span>}
                </button>
              )
            })}
          </div>
        </div>

        <div className="m-hb-form-card">
          <div className="m-hb-form-head-row">
            <span className="m-hb-form-title">Цитата</span>
            <button
              type="button"
              className="m-hb-refresh-btn"
              onClick={() => {
                const random = GALLERY_TEMPLATES[Math.floor(Math.random() * GALLERY_TEMPLATES.length)]
                setQuote(random.quote)
              }}
              aria-label="Сменить цитату"
            >
              ↻
            </button>
          </div>
          <input
            className="m-hb-gray-input"
            value={quote}
            onChange={(e) => setQuote(e.target.value)}
            placeholder="Маленькие шаги каждый день..."
          />
        </div>

        <div className="m-hb-form-card">
          <div className="m-hb-form-title">Частота</div>
          <div className="m-hb-freq-tabs">
            <button
              type="button"
              className={`m-hb-freq-tab${freqTab === 'daily' ? ' on' : ''}`}
              onClick={() => {
                setFreqTab('daily')
                setSelectedDays(new Set(WEEKDAYS))
              }}
            >
              ЕЖЕДНЕВНО
            </button>
            <button
              type="button"
              className={`m-hb-freq-tab${freqTab === 'weekly' ? ' on' : ''}`}
              onClick={() => {
                setFreqTab('weekly')
                setSelectedDays(new Set(['MO', 'TU', 'WE', 'TH', 'FR']))
              }}
            >
              ЕЖЕНЕДЕЛЬНО
            </button>
            <button
              type="button"
              className={`m-hb-freq-tab${freqTab === 'interval' ? ' on' : ''}`}
              onClick={() => setFreqTab('interval')}
            >
              ПОВТОР
            </button>
          </div>

          <div className="m-hb-weekday-circles">
            {WEEKDAYS.map((d) => {
              const on = selectedDays.has(d)
              return (
                <button
                  type="button"
                  key={d}
                  className={`m-hb-wd-circle${on ? ' on' : ''}`}
                  onClick={() => toggleDay(d)}
                >
                  {RU_WEEKDAYS_UPPER[d]}
                </button>
              )
            })}
          </div>
        </div>

        <div className="m-hb-form-card">
          <div className="m-hb-kv-row">
            <span className="m-hb-kv-label">Цель</span>
            <span className="m-hb-kv-val">Достигните всего этого ›</span>
          </div>
          <div className="m-hb-kv-row">
            <span className="m-hb-kv-label">Дата начала</span>
            <span className="m-hb-kv-val">Сегодня ›</span>
          </div>
          <div className="m-hb-kv-row">
            <span className="m-hb-kv-label">Цель в днях.</span>
            <span className="m-hb-kv-val">Вечно. ›</span>
          </div>
        </div>

        <div className="m-hb-form-card">
          <div className="m-hb-form-title">Раздел</div>
          <div className="m-hb-section-pills">
            <button
              type="button"
              className={`m-hb-sec-pill${section === 'day' ? ' on' : ''}`}
              onClick={() => setSection('day')}
            >
              День
            </button>
            <button
              type="button"
              className={`m-hb-sec-pill${section === 'night' ? ' on' : ''}`}
              onClick={() => setSection('night')}
            >
              Ночь
            </button>
            <button
              type="button"
              className={`m-hb-sec-pill${section === 'other' ? ' on' : ''}`}
              onClick={() => setSection('other')}
            >
              Другие
            </button>
          </div>
        </div>

        <div className="m-hb-form-card">
          <div className="m-hb-form-title">Уведомление</div>
          <div className="m-hb-rem-row">
            <input
              type="time"
              className="m-hb-rem-input"
              value={reminder}
              onChange={(e) => setReminder(e.target.value)}
            />
            {reminder && (
              <button type="button" className="ghost" onClick={() => setReminder('')}>
                Сбросить
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="m-hb-bottom-bar">
        <button type="button" className="m-hb-primary-pill" onClick={handleSave}>
          Сохранить
        </button>
      </div>
    </div>
  )
}

