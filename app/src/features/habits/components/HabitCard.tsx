import { useMemo } from 'react'
import type { DayKey } from '../../../domain/dates'
import { habitStats, tapStatus } from '../../../domain/habits'
import type { CheckStatus, Habit } from '../../../domain/types'
import { HabitIcon } from './HabitIcon'
import type { Checks } from '../types'

interface Props {
  habit: Habit
  checks: Checks
  now: DayKey
  week: DayKey[]
  wide?: boolean
  selected?: boolean
  readOnly?: boolean
  onSelect: () => void
  onSet: (habitId: string, day: DayKey, status: CheckStatus | undefined, note?: string | null) => void
}

export function HabitCard(props: Props) {
  const { habit, checks, now, week, selected, readOnly } = props
  const stats = useMemo(() => habitStats(habit, checks, now), [habit, checks, now])

  return (
    <li className={`hb-card${selected ? ' selected' : ''}`} onClick={props.onSelect}>
      <div className="hb-icon-badge" style={{ background: habit.color }}>
        <HabitIcon name={habit.name} size={20} />
      </div>

      <div className="hb-card-info">
        <div className="hb-card-title">{habit.name}</div>
        <div className="hb-card-meta">
          <span>⚡ {stats.total} дней</span>
          <span>🔥 День {stats.currentStreak}</span>
        </div>
      </div>

      <div className="hb-card-dots" onClick={(e) => e.stopPropagation()}>
        {week.map((day) => {
          const isFuture = day > now
          const isToday = day === now
          const status = checks.get(day)
          const isDone = status === 'done'

          return (
            <button
              key={day}
              disabled={isFuture || readOnly}
              className={`hb-dot-btn${isDone ? ' done' : isToday && !status ? ' today-pending' : ''}`}
              style={isDone ? { background: habit.color, borderColor: habit.color } : undefined}
              onClick={() => props.onSet(habit.id, day, tapStatus(status))}
              aria-label={`${day}: ${isDone ? 'Выполнено' : 'Отметить'}`}
              title={`${day}: ${isDone ? 'Выполнено' : 'Отметить'}`}
            >
              {isDone ? '✓' : ''}
            </button>
          )
        })}
      </div>
    </li>
  )
}

