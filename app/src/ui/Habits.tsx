import { useMemo, useState, type FormEvent } from 'react'
import { rangeTitle, shiftAnchor, WEEKDAYS_SHORT } from '../domain/calendar'
import { type DateCtx, type DayKey, today } from '../domain/dates'
import { cycleStatus, habitStats, isActive, monthCells, scheduledDays, tapStatus } from '../domain/habits'
import { buildRule, ruleParts, WEEKDAYS, WEEKDAY_LABEL, type Weekday } from '../domain/repeat'
import type { CheckStatus, Habit, HabitCheckin } from '../domain/types'
import type { HabitPatch } from '../data/habits'

const COLORS = ['#7BC4FA', '#A0EFED', '#F18BEC', '#FF8585', '#6E81ED', '#F5C26B', '#8EDB8E', '#B79BFF']

interface Props {
  habits: Habit[]
  checkins: HabitCheckin[]
  ctx: DateCtx
  onCreate: (name: string) => void
  onUpdate: (id: string, patch: HabitPatch) => void
  onArchive: (id: string, archived: boolean) => void
  onDelete: (id: string) => void
  onSet: (habitId: string, day: DayKey, status: CheckStatus | undefined) => void
}

type Checks = Map<DayKey, CheckStatus>

export function Habits(props: Props) {
  const { habits, checkins, ctx } = props
  const now = today(ctx)
  const [openId, setOpenId] = useState<string | null>(null)
  const [showArchive, setShowArchive] = useState(false)
  const [name, setName] = useState('')

  const checksBy = useMemo(() => {
    const m = new Map<string, Checks>()
    for (const c of checkins) {
      if (!m.has(c.habitId)) m.set(c.habitId, new Map())
      m.get(c.habitId)!.set(c.day, c.status)
    }
    return m
  }, [checkins])

  const sorted = useMemo(() => [...habits].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'ru')), [habits])
  const active = sorted.filter(isActive)
  const archived = sorted.filter((h) => !isActive(h))
  const opened = openId ? habits.find((h) => h.id === openId) ?? null : null

  function create(e: FormEvent) {
    e.preventDefault()
    const text = name.trim()
    if (!text) return
    setName('')
    props.onCreate(text)
  }

  return (
    <>
      {active.length === 0 && archived.length === 0 ? (
        <p className="muted">Привычек нет</p>
      ) : (
        <ul className="tasks habits">
          {active.map((h) => (
            <HabitRow key={h.id} habit={h} checks={checksBy.get(h.id) ?? new Map()} now={now} onOpen={() => setOpenId(h.id)} onSet={props.onSet} />
          ))}
        </ul>
      )}

      {archived.length > 0 && (
        <>
          <button className="ghost archive-toggle" onClick={() => setShowArchive(!showArchive)}>
            Архив ({archived.length}) {showArchive ? '▴' : '▾'}
          </button>
          {showArchive && (
            <ul className="tasks habits archived">
              {archived.map((h) => (
                <HabitRow key={h.id} habit={h} checks={checksBy.get(h.id) ?? new Map()} now={now} onOpen={() => setOpenId(h.id)} onSet={props.onSet} readOnly />
              ))}
            </ul>
          )}
        </>
      )}

      <form className="add habit-add" onSubmit={create}>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Новая привычка" enterKeyHint="done" />
        <button className="primary" type="submit" aria-label="Добавить">
          +
        </button>
      </form>

      {opened && (
        <HabitSheet
          key={opened.id}
          habit={opened}
          checks={checksBy.get(opened.id) ?? new Map()}
          ctx={ctx}
          onUpdate={(patch) => props.onUpdate(opened.id, patch)}
          onArchive={(a) => props.onArchive(opened.id, a)}
          onDelete={() => {
            props.onDelete(opened.id)
            setOpenId(null)
          }}
          onSet={(day, status) => props.onSet(opened.id, day, status)}
          onClose={() => setOpenId(null)}
        />
      )}
    </>
  )
}

function HabitRow(props: {
  habit: Habit
  checks: Checks
  now: DayKey
  onOpen: () => void
  onSet: (habitId: string, day: DayKey, status: CheckStatus | undefined) => void
  readOnly?: boolean
}) {
  const { habit, checks, now } = props
  const stats = useMemo(() => habitStats(habit, checks, now), [habit, checks, now])
  const status = checks.get(now)
  const scheduledToday = scheduledDays(habit, now, now).has(now)

  return (
    <li>
      <span className="habit-icon" style={{ background: habit.color }} aria-hidden="true">
        {habit.name.trim().charAt(0).toUpperCase()}
      </span>
      <button className="row-main" onClick={props.onOpen}>
        <span className="title">{habit.name}</span>
        <span className="meta">
          <span className="due">
            серия {stats.currentStreak} · всего {stats.total}
          </span>
          {!scheduledToday && !props.readOnly && <span className="due">сегодня не по расписанию</span>}
        </span>
      </button>
      {!props.readOnly && (
        <button
          className={`habit-check ${status ?? ''}`}
          style={status === 'done' ? { background: habit.color, borderColor: habit.color } : undefined}
          onClick={() => props.onSet(habit.id, now, tapStatus(status))}
          aria-label={status === 'done' ? 'Снять отметку за сегодня' : 'Отметить за сегодня'}
          aria-pressed={status === 'done'}
        >
          {status === 'done' ? '✓' : status === 'failed' ? '✕' : ''}
        </button>
      )}
    </li>
  )
}

function HabitSheet(props: {
  habit: Habit
  checks: Checks
  ctx: DateCtx
  onUpdate: (patch: HabitPatch) => void
  onArchive: (archived: boolean) => void
  onDelete: () => void
  onSet: (day: DayKey, status: CheckStatus | undefined) => void
  onClose: () => void
}) {
  const { habit, checks, ctx } = props
  const now = today(ctx)
  const [anchor, setAnchor] = useState<DayKey>(now)
  const [name, setName] = useState(habit.name)
  const stats = habitStats(habit, checks, now)
  const cells = monthCells(habit, checks, anchor, now)

  const parts = habit.repeat ? ruleParts(habit.repeat) : null
  const days = new Set<Weekday>(parts?.freq === 'WEEKLY' ? parts.byday : WEEKDAYS)
  const everyDay = habit.repeat === null || (parts?.freq === 'WEEKLY' && parts.byday.length === 0)

  function setDays(next: Set<Weekday>) {
    if (next.size === 0) return // хотя бы один день должен остаться
    if (next.size === 7) props.onUpdate({ repeat: null })
    else props.onUpdate({ repeat: buildRule({ freq: 'WEEKLY', interval: 1, byday: WEEKDAYS.filter((d) => next.has(d)), bymonthday: null }) })
  }

  function toggleDay(d: Weekday) {
    const next = new Set(everyDay ? WEEKDAYS : days)
    if (next.has(d)) next.delete(d)
    else next.add(d)
    setDays(next)
  }

  function commitName() {
    const text = name.trim()
    if (!text) setName(habit.name)
    else if (text !== habit.name) props.onUpdate({ name: text })
  }

  return (
    <>
      <div className="scrim on" onClick={props.onClose} />
      <section className="sheet" role="dialog" aria-label="Привычка">
        <input
          className="sheet-title"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          aria-label="Название привычки"
        />

        <div className="stat-row">
          <div>
            <b>{stats.total}</b>
            <span className="muted">всего</span>
          </div>
          <div>
            <b>{stats.currentStreak}</b>
            <span className="muted">серия</span>
          </div>
          <div>
            <b>{stats.bestStreak}</b>
            <span className="muted">лучшая серия</span>
          </div>
        </div>

        <div className="hm-nav">
          <button className="ghost" onClick={() => setAnchor(shiftAnchor('month', anchor, -1))} aria-label="Предыдущий месяц">
            ‹
          </button>
          <span>{rangeTitle('month', anchor)}</span>
          <button className="ghost" onClick={() => setAnchor(shiftAnchor('month', anchor, 1))} aria-label="Следующий месяц">
            ›
          </button>
        </div>
        <div className="hm">
          {WEEKDAYS_SHORT.map((d) => (
            <span key={d} className="hm-head">
              {d}
            </span>
          ))}
          {cells.flat().map((c) => (
            <button
              key={c.day}
              disabled={c.future}
              className={`hm-cell${c.inMonth ? '' : ' other'}${c.scheduled ? '' : ' off'} ${c.status ?? (c.scheduled && !c.future && c.day < now ? 'miss' : '')}`}
              style={c.status === 'done' ? { background: habit.color, borderColor: habit.color } : undefined}
              onClick={() => props.onSet(c.day, cycleStatus(c.status))}
              aria-label={`${c.day}${c.status ? `, ${c.status === 'done' ? 'выполнено' : 'не выполнено'}` : ''}`}
            >
              {c.status === 'failed' ? '✕' : Number(c.day.slice(8))}
            </button>
          ))}
        </div>

        <div className="stages" role="group" aria-label="Дни недели">
          <button className={everyDay ? 'chip on' : 'chip'} onClick={() => props.onUpdate({ repeat: null })}>
            Каждый день
          </button>
          {WEEKDAYS.map((d) => (
            <button key={d} className={!everyDay && days.has(d) ? 'chip on' : 'chip'} onClick={() => toggleDay(d)}>
              {WEEKDAY_LABEL[d]}
            </button>
          ))}
        </div>

        <div className="fields">
          <label>
            Напоминание
            <input
              type="time"
              value={habit.reminders[0] ?? ''}
              onChange={(e) => props.onUpdate({ reminders: e.target.value ? [e.target.value] : [] })}
            />
          </label>
        </div>

        <div className="swatches" role="radiogroup" aria-label="Цвет">
          {COLORS.map((c) => (
            <button
              key={c}
              role="radio"
              aria-checked={habit.color === c}
              className={habit.color === c ? 'swatch on' : 'swatch'}
              style={{ background: c }}
              onClick={() => props.onUpdate({ color: c })}
              aria-label={c}
            />
          ))}
        </div>

        <div className="sheet-actions">
          <span className="actions-left">
            <button className="ghost" onClick={() => props.onArchive(isActive(habit))}>
              {isActive(habit) ? 'В архив' : 'Вернуть из архива'}
            </button>
            <button className="ghost danger" onClick={() => window.confirm(`Удалить привычку «${habit.name}»?`) && props.onDelete()}>
              Удалить
            </button>
          </span>
          <button className="primary" onClick={props.onClose}>
            Готово
          </button>
        </div>
      </section>
    </>
  )
}

