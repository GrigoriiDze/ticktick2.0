import { useMemo, useState } from 'react'
import { shiftAnchor } from '../../../domain/calendar'
import { type DateCtx, type DayKey, today } from '../../../domain/dates'
import { cycleStatus, habitStats, isActive, monthCells, tapStatus } from '../../../domain/habits'
import type { CheckStatus, Habit } from '../../../domain/types'
import { PopMenu, type PopItem } from '../../../ui/PopMenu'
import { HabitIcon } from './HabitIcon'
import { MONTHS_LOWER_RU, RU_WEEKDAYS_LOWER, habitQuote } from '../constants'
import type { Checks } from '../types'

interface Props {
  habit: Habit
  checks: Checks
  ctx: DateCtx
  selectedDay: DayKey
  onClose: () => void
  onEdit: () => void
  onArchive: (archived: boolean) => void
  onDelete: () => void
  onSet: (day: DayKey, status: CheckStatus | undefined) => void
}

export function MobileHabitDetailScreen(props: Props) {
  const { habit, checks, ctx, selectedDay } = props
  const now = today(ctx)
  const [anchor, setAnchor] = useState<DayKey>(selectedDay || now)
  const [menuOpen, setMenuOpen] = useState(false)

  const stats = useMemo(() => habitStats(habit, checks, now), [habit, checks, now])
  const cells = useMemo(() => monthCells(habit, checks, anchor, now), [habit, checks, anchor, now])
  const todayDone = checks.get(selectedDay) === 'done'

  const monthIdx = Number(anchor.slice(5, 7)) - 1
  const monthName = MONTHS_LOWER_RU[monthIdx] || 'октября'

  const monthDoneCount = useMemo(
    () => cells.flat().filter((c) => c.inMonth && c.status === 'done').length,
    [cells],
  )
  const monthScheduledCount = useMemo(
    () => cells.flat().filter((c) => c.inMonth && c.scheduled).length,
    [cells],
  )
  const monthRate = monthScheduledCount > 0 ? Math.round((monthDoneCount / monthScheduledCount) * 100) : 0

  const menuItems: PopItem[] = [
    { key: 'edit', title: 'Редактировать', onPick: props.onEdit },
    {
      key: 'archive',
      title: isActive(habit) ? 'В архив' : 'Восстановить из архива',
      onPick: () => props.onArchive(isActive(habit)),
    },
    {
      key: 'delete',
      title: 'Удалить',
      danger: true,
      onPick: () => props.onDelete(),
    },
  ]

  return (
    <div className="m-hb-detail-screen" style={{ background: habit.color || '#FF949E' }}>
      <header className="m-hb-detail-top">
        <button type="button" className="m-hb-detail-iconbtn" onClick={props.onClose} aria-label="Назад">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="m-hb-detail-top-title">{habit.name}</h2>
        <button type="button" className="m-hb-detail-iconbtn" onClick={() => setMenuOpen(true)} aria-label="Опции">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="#ffffff">
            <circle cx="12" cy="5.5" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="12" cy="18.5" r="1.8" />
          </svg>
        </button>
      </header>

      <div className="m-hb-detail-scroll">
        <div className="m-hb-hero">
          <div className="m-hb-hero-art">
            <HabitIcon name={habit.name} size={92} />
          </div>
          <h3 className="m-hb-hero-title">{habit.name}</h3>
          <p className="m-hb-hero-quote">{habitQuote(habit.name)}</p>

          <button
            type="button"
            className={`m-hb-check-track${todayDone ? ' done' : ''}`}
            onClick={() => props.onSet(selectedDay, tapStatus(checks.get(selectedDay)))}
            aria-label={todayDone ? 'Отмечено' : 'Отметить выполнение'}
          >
            <span className="m-hb-check-knob" style={{ color: habit.color || '#FF949E' }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12.5l4.5 4.5 9.5-9.5" />
              </svg>
            </span>
          </button>
        </div>

        <div className="m-hb-white-card">
          <div className="m-hb-cal-nav">
            <button type="button" className="m-hb-cal-arrow" onClick={() => setAnchor(shiftAnchor('month', anchor, -1))} aria-label="Предыдущий месяц">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <span className="m-hb-cal-month">{monthName}</span>
            <button type="button" className="m-hb-cal-arrow" onClick={() => setAnchor(shiftAnchor('month', anchor, 1))} aria-label="Следующий месяц">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

          <div className="m-hb-cal-grid">
            {RU_WEEKDAYS_LOWER.map((d) => (
              <span key={d} className="m-hb-cal-wd">
                {d}
              </span>
            ))}
            {cells.flat().map((c) => {
              const isToday = c.day === now
              const isDone = c.status === 'done'
              return (
                <button
                  type="button"
                  key={c.day}
                  disabled={c.future}
                  className={`m-hb-cal-day${c.inMonth ? '' : ' off'}${isToday ? ' today' : ''}${isDone ? ' done' : ''}`}
                  style={isDone ? { background: habit.color, color: '#ffffff' } : undefined}
                  onClick={() => props.onSet(c.day, cycleStatus(c.status))}
                >
                  {Number(c.day.slice(8))}
                </button>
              )
            })}
          </div>
        </div>

        <div className="m-hb-white-card">
          <div className="m-hb-section-head">
            <span className="m-hb-section-title">Статистика чек-инов.</span>
            <span className="m-hb-section-more">Больше ›</span>
          </div>

          <div className="m-hb-stats-2x2">
            <div className="m-hb-stat-box">
              <div className="m-hb-stat-top">
                <span className="m-hb-stat-dot" style={{ background: '#10b981' }}>✓</span>
                <span className="m-hb-stat-caption">Ежемесячная р...</span>
              </div>
              <div className="m-hb-stat-val">
                <strong>{monthDoneCount}</strong> <span>дней</span>
              </div>
            </div>

            <div className="m-hb-stat-box">
              <div className="m-hb-stat-top">
                <span className="m-hb-stat-dot" style={{ background: '#10b981' }}>📅</span>
                <span className="m-hb-stat-caption">Всего регистра...</span>
              </div>
              <div className="m-hb-stat-val">
                <strong>{stats.total}</strong> <span>дней</span>
              </div>
            </div>

            <div className="m-hb-stat-box">
              <div className="m-hb-stat-top">
                <span className="m-hb-stat-dot" style={{ background: '#f59e0b' }}>%</span>
                <span className="m-hb-stat-caption">Ежемесячный...</span>
              </div>
              <div className="m-hb-stat-val">
                <strong>{monthRate}</strong> <span>%</span>
              </div>
            </div>

            <div className="m-hb-stat-box">
              <div className="m-hb-stat-top">
                <span className="m-hb-stat-dot" style={{ background: '#4772fa' }}>↗</span>
                <span className="m-hb-stat-caption">Текущая сер...</span>
              </div>
              <div className="m-hb-stat-val">
                <strong>{stats.currentStreak}</strong> <span>дней</span>
              </div>
            </div>
          </div>
        </div>

        <div className="m-hb-white-card">
          <div className="m-hb-section-head">
            <span className="m-hb-section-title">Журнал привычки в {monthName}</span>
          </div>
          <p className="m-hb-journal-empty">
            В этом месяце пока нет зарегистрированных мыслей, которыми можно поделиться
          </p>
        </div>
      </div>

      {menuOpen && <PopMenu label="Опции привычки" items={menuItems} onClose={() => setMenuOpen(false)} />}
    </div>
  )
}

