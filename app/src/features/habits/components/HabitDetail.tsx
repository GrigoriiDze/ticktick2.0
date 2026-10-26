import { useMemo, useState } from 'react'
import { rangeTitle, shiftAnchor } from '../../../domain/calendar'
import { type DateCtx, type DayKey, today } from '../../../domain/dates'
import { cycleStatus, habitStats, isActive, monthCells } from '../../../domain/habits'
import type { CheckStatus, Habit } from '../../../domain/types'
import { HabitIcon } from './HabitIcon'
import { RU_WEEKDAYS_SHORT } from '../constants'
import type { Checks } from '../types'

interface Props {
  habit: Habit
  checks: Checks
  ctx: DateCtx
  onEdit: () => void
  onArchive: (archived: boolean) => void
  onDelete: () => void
  onSet: (day: DayKey, status: CheckStatus | undefined) => void
}

export function HabitDetail(props: Props) {
  const { habit, checks, ctx } = props
  const now = today(ctx)
  const [anchor, setAnchor] = useState<DayKey>(now)
  const stats = useMemo(() => habitStats(habit, checks, now), [habit, checks, now])
  const cells = useMemo(() => monthCells(habit, checks, anchor, now), [habit, checks, anchor, now])

  const monthDoneCount = useMemo(() => {
    return cells.flat().filter((c) => c.inMonth && c.status === 'done').length
  }, [cells])
  const monthScheduledCount = useMemo(() => {
    return cells.flat().filter((c) => c.inMonth && c.scheduled).length
  }, [cells])
  const monthRate = monthScheduledCount > 0 ? Math.round((monthDoneCount / monthScheduledCount) * 100) : 0

  return (
    <div className="hb-detail">
      <div className="hb-detail-header">
        <div className="hb-icon-badge large" style={{ background: habit.color }}>
          <HabitIcon name={habit.name} size={24} />
        </div>
        <div className="hb-detail-title-wrap">
          <h2 className="hb-detail-title">{habit.name}</h2>
          <span className="hb-detail-subtitle">{habit.repeat ? 'По расписанию' : 'Каждый день'}</span>
        </div>
        <div className="hb-detail-actions">
          <button className="round" onClick={props.onEdit} title="Редактировать">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M14.5 2.5l3 3L6 17H3v-3L14.5 2.5z" />
            </svg>
          </button>
          <button className="round" onClick={() => props.onArchive(isActive(habit))} title={isActive(habit) ? 'В архив' : 'Из архива'}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M3 5h14v12H3zM2 2h16v3H2zM8 9h4" />
            </svg>
          </button>
          <button className="round danger" onClick={() => window.confirm(`Удалить привычку «${habit.name}»?`) && props.onDelete()} title="Удалить">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M4 6h12M7 6V4h6v2M6 6v11h8V6" />
            </svg>
          </button>
        </div>
      </div>

      <div className="hb-stats-grid">
        <div className="hb-stat-card">
          <span className="hb-stat-icon">⚡</span>
          <span className="hb-stat-value">{stats.total}</span>
          <span className="hb-stat-label">Всего дней</span>
        </div>
        <div className="hb-stat-card">
          <span className="hb-stat-icon">🔥</span>
          <span className="hb-stat-value">{stats.currentStreak}</span>
          <span className="hb-stat-label">Текущая серия</span>
        </div>
        <div className="hb-stat-card">
          <span className="hb-stat-icon">🏆</span>
          <span className="hb-stat-value">{stats.bestStreak}</span>
          <span className="hb-stat-label">Лучшая серия</span>
        </div>
        <div className="hb-stat-card">
          <span className="hb-stat-icon">🎯</span>
          <span className="hb-stat-value">{monthRate}%</span>
          <span className="hb-stat-label">В этом месяце</span>
        </div>
      </div>

      <div className="hb-calendar-box">
        <div className="hm-nav">
          <button className="ghost" onClick={() => setAnchor(shiftAnchor('month', anchor, -1))} aria-label="Предыдущий месяц">
            ‹
          </button>
          <span className="hm-month-title">{rangeTitle('month', anchor)}</span>
          <button className="ghost" onClick={() => setAnchor(shiftAnchor('month', anchor, 1))} aria-label="Следующий месяц">
            ›
          </button>
        </div>

        <div className="hm">
          {RU_WEEKDAYS_SHORT.map((d) => (
            <span key={d} className="hm-head">
              {d}
            </span>
          ))}
          {cells.flat().map((c) => (
            <button
              key={c.day}
              disabled={c.future}
              className={`hm-cell${c.inMonth ? '' : ' other'}${c.scheduled ? '' : ' off'} ${c.status ?? (c.scheduled && !c.future && c.day < now ? 'miss' : '')}`}
              style={c.status === 'done' ? { background: habit.color, borderColor: habit.color, color: '#fff' } : undefined}
              onClick={() => props.onSet(c.day, cycleStatus(c.status))}
              aria-label={`${c.day}${c.status ? `, ${c.status === 'done' ? 'выполнено' : 'не выполнено'}` : ''}`}
            >
              {c.status === 'failed' ? '✕' : Number(c.day.slice(8))}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

