import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import {
  CAL_VIEWS,
  eventsByDay,
  layoutColumns,
  monthGrid,
  sameMonth,
  shiftAnchor,
  threeDays,
  weekdayIndex,
  weekDays,
  yearMonths,
  type CalEvent,
  type CalView,
} from '../domain/calendar'
import { today, type DateCtx, type DayKey } from '../domain/dates'
import type { Task } from '../domain/types'
import { PopMenu, type PopItem } from './PopMenu'
import type { RowActions } from './TaskList'

const HOUR_PX = 56
const SLOT_MIN = 30
const SHORT_MONTHS_RU = ['ЯНВ.', 'ФЕВ.', 'МАР.', 'АПР.', 'МАЙ', 'ИЮН.', 'ИЮЛ.', 'АВГ.', 'СЕНТ.', 'ОКТ.', 'НОЯБ.', 'ДЕК.']
const WEEKDAYS_LOWER = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']

export interface QuickAddRequest {
  day: DayKey
  /** Минуты от полуночи, null для задачи на весь день */
  minutes: number | null
}

export interface CalProps {
  tasks: Task[]
  ctx: DateCtx
  view: CalView
  anchor: DayKey
  showDone: boolean
  onAnchor: (day: DayKey) => void
  onView: (v: CalView) => void
  onSlot: (req: QuickAddRequest) => void
  onMove?: (taskId: string, day: DayKey, minutes: number) => void
  actions: RowActions
  colors?: Record<string, string>
}
type Props = CalProps

const pad = (n: number) => String(n).padStart(2, '0')
const hhmm = (min: number) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`

function useSwipe(onShift: (dir: 1 | -1) => void) {
  const start = useRef<{ x: number; y: number } | null>(null)
  return {
    onPointerDown: (e: PointerEvent) => {
      start.current = { x: e.clientX, y: e.clientY }
    },
    onPointerUp: (e: PointerEvent) => {
      const s = start.current
      start.current = null
      if (!s) return
      const dx = e.clientX - s.x
      const dy = e.clientY - s.y
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) onShift(dx < 0 ? 1 : -1)
    },
    onPointerCancel: () => {
      start.current = null
    },
  }
}

/** Шапка мобильного календаря 1-в-1 по Photo 1 и Photo 2 с кнопкой бокового меню */
export function CalendarHeader(props: {
  view: CalView
  anchor: DayKey
  ctx: DateCtx
  showDone: boolean
  onMenu?: () => void
  onShift: (dir: 1 | -1) => void
  onToday: () => void
  onView: (v: CalView) => void
  onToggleDone: () => void
}) {
  const { view, anchor, onToday, onView } = props
  const [menu, setMenu] = useState<'view' | 'more' | null>(null)
  const monthIdx = Number(anchor.slice(5, 7)) - 1
  const monthLabel = SHORT_MONTHS_RU[monthIdx] || 'МЕСЯЦ'

  const viewItems: PopItem[] = CAL_VIEWS.map((v) => ({
    key: v.id,
    title: v.title,
    checked: v.id === view,
    onPick: () => onView(v.id),
  }))
  const moreItems: PopItem[] = [
    { key: 'today', title: 'Сегодня', onPick: onToday },
    { key: 'done', title: 'Показывать выполненные', checked: props.showDone, onPick: props.onToggleDone },
  ]

  const isMonth = view === 'month'

  return (
    <header className="m-cal-head">
      <div className="m-cal-head-left">
        {props.onMenu && (
          <button className="round menu" onClick={props.onMenu} aria-label="Списки" style={{ marginRight: 6 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}
        <h2 className="m-cal-month-title">{monthLabel}</h2>
      </div>

      <div className="m-cal-head-right">
        {!isMonth && (
          <button
            className="m-cal-btn"
            onClick={() => onView('month')}
            aria-label="Месяц"
            title="Месяц"
          >
            {/* Иконка перекидного календаря с пружинами */}
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3.5" y="4.5" width="17" height="16" rx="3.5" />
              <path d="M8 2.5v3.5M16 2.5v3.5M3.5 9.5h17" />
            </svg>
          </button>
        )}

        <button
          className="m-cal-btn"
          onClick={() => setMenu('view')}
          aria-label="Вид календаря"
          title="Вид"
        >
          {isMonth ? (
            /* 2x2 сетка (Photo 1) */
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
              <rect x="13.5" y="3.5" width="7" height="7" rx="1.5" />
              <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
              <rect x="13.5" y="13.5" width="7" height="7" rx="1.5" />
            </svg>
          ) : (
            /* 3 колонки сетки (Photo 2) */
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <rect x="4" y="3.5" width="3.8" height="17" rx="1" />
              <rect x="10.1" y="3.5" width="3.8" height="17" rx="1" />
              <rect x="16.2" y="3.5" width="3.8" height="17" rx="1" />
            </svg>
          )}
        </button>

        <button
          className="m-cal-btn"
          onClick={() => setMenu('more')}
          aria-label="Опции"
          title="Опции"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5" r="1.8" />
            <circle cx="12" cy="12" r="1.8" />
            <circle cx="12" cy="19" r="1.8" />
          </svg>
        </button>
      </div>

      {menu === 'view' && <PopMenu label="Вид календаря" items={viewItems} onClose={() => setMenu(null)} />}
      {menu === 'more' && <PopMenu label="Опции" items={moreItems} onClose={() => setMenu(null)} />}
    </header>
  )
}

export function Calendar(props: Props) {
  const { tasks, ctx, view, anchor } = props

  const range = useMemo((): [DayKey, DayKey] => {
    if (view === 'month') {
      const g = monthGrid(anchor).flat()
      return [g[0], g[g.length - 1]]
    }
    if (view === 'year') return [`${anchor.slice(0, 4)}-01-01`, `${anchor.slice(0, 4)}-12-31`]
    if (view === 'days3') {
      const d = threeDays(anchor)
      return [d[0], d[2]]
    }
    if (view === 'day') return [anchor, anchor]
    const w = weekDays(anchor)
    return [w[0], w[6]]
  }, [view, anchor])

  const events = useMemo(
    () => eventsByDay(tasks, ctx, range[0], range[1], props.showDone),
    [tasks, ctx.now, ctx.tz, range[0], range[1], props.showDone],
  )
  const shift = (dir: 1 | -1) => props.onAnchor(shiftAnchor(view, anchor, dir))
  const swipe = useSwipe(shift)

  if (view === 'week' || view === 'days3' || view === 'day') {
    const days = view === 'week' ? weekDays(anchor) : view === 'days3' ? threeDays(anchor) : [anchor]
    return (
      <div className="cal time">
        <TimeGrid {...props} days={days} events={events} />
      </div>
    )
  }

  if (view === 'year') return <YearView {...props} events={events} />

  // Полноэкранный месяц 1-в-1 по Photo 1
  return (
    <div className="m-cal-month-screen" {...swipe}>
      <div className="m-cal-weekdays">
        {WEEKDAYS_LOWER.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <MonthFullGrid {...props} events={events} />
    </div>
  )
}

/** Сетка месяца на весь экран с плашками задач внутри (Photo 1) */
function MonthFullGrid({ ctx, anchor, events, onAnchor, onView, actions, colors }: Props & { events: Map<DayKey, CalEvent[]> }) {
  const weeks = useMemo(() => monthGrid(anchor), [anchor])
  const now = today(ctx)

  return (
    <div className="m-cal-grid">
      {weeks.map((week) => (
        <div className="m-cal-row" key={week[0]}>
          {week.map((day) => {
            const evs = events.get(day) ?? []
            const isToday = day === now
            const isCurMonth = sameMonth(day, anchor)
            const isSel = day === anchor

            return (
              <div
                key={day}
                className={`m-cal-cell${!isCurMonth ? ' off' : ''}${isSel ? ' sel' : ''}`}
                onClick={() => {
                  onAnchor(day)
                }}
                onDoubleClick={() => {
                  onAnchor(day)
                  onView('day')
                }}
              >
                <div className="m-cal-num-wrap">
                  <span className={`m-cal-num${isToday ? ' today' : ''}`}>
                    {Number(day.slice(8))}
                  </span>
                </div>

                <div className="m-cal-chips-stack">
                  {evs.slice(0, 3).map((e) => {
                    const customBg = colors?.[e.task.projectId]
                    return (
                      <div
                        key={e.task.id}
                        className={`m-task-chip p${e.task.priority}${e.task.status === 'done' ? ' done' : ''}`}
                        style={{
                          backgroundColor: customBg ? `${customBg}2e` : undefined,
                          color: customBg || undefined,
                        }}
                        onClick={(ev) => {
                          ev.stopPropagation()
                          actions.open(e.task.id)
                        }}
                      >
                        {e.task.title}
                      </div>
                    )
                  })}
                  {evs.length > 3 && (
                    <div className="m-task-chip-more">+{evs.length - 3}</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function YearView({ ctx, anchor, events, onAnchor, onView }: Props & { events: Map<DayKey, CalEvent[]> }) {
  const now = today(ctx)
  const swipe = useSwipe((dir) => onAnchor(shiftAnchor('year', anchor, dir)))
  return (
    <div className="year" {...swipe}>
      {yearMonths(anchor).map((first) => (
        <button
          key={first}
          className="year-month"
          onClick={() => {
            onAnchor(sameMonth(now, first) ? now : first)
            onView('month')
          }}
        >
          <span className="year-name">{SHORT_MONTHS_RU[Number(first.slice(5, 7)) - 1]}</span>
          <span className="year-grid">
            {monthGrid(first)
              .flat()
              .map((d) =>
                sameMonth(d, first) ? (
                  <span key={d} className={`year-day${d === now ? ' today' : ''}${events.has(d) ? ' has' : ''}`}>
                    {Number(d.slice(8))}
                  </span>
                ) : (
                  <span key={d} className="year-day off" />
                ),
              )}
          </span>
        </button>
      ))}
    </div>
  )
}

/** Почасовая сетка с лентой дней и секцией All-Day 1-в-1 по Photo 2 */
export function TimeGrid({
  ctx,
  view,
  days,
  events,
  actions,
  onSlot,
  colors,
  onAnchor,
  onView,
}: Props & { days: DayKey[]; events: Map<DayKey, CalEvent[]> }) {
  const scroller = useRef<HTMLDivElement>(null)

  const now = today(ctx)
  const nowMin = useMemo(() => {
    const d = new Date(ctx.now)
    const t = new Intl.DateTimeFormat('en-GB', { timeZone: ctx.tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d)
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }, [ctx.now, ctx.tz])

  useEffect(() => {
    if (!scroller.current) return
    const startHour = days.includes(now) ? Math.max(0, Math.floor(nowMin / 60) - 2) : 9
    scroller.current.scrollTop = startHour * HOUR_PX
  }, [view, days[0]])

  const cols = days.length
  const template = { gridTemplateColumns: `36px repeat(${cols}, 1fr)` }

  return (
    <div className="tg">
      {/* Лента дней недели Photo 2: сб 24, вс 25 (синий кружок)... */}
      <div className="m-tg-date-strip" style={template}>
        <span />
        {days.map((d) => {
          const isToday = d === now
          const wd = WEEKDAYS_LOWER[weekdayIndex(d)]
          return (
            <button
              key={d}
              className="m-tg-day-btn"
              onClick={() => {
                onAnchor(d)
                if (view !== 'day') onView('day')
              }}
            >
              <span className="m-tg-wd">{wd}</span>
              <span className={`m-tg-num${isToday ? ' today' : ''}`}>
                {Number(d.slice(8))}
              </span>
            </button>
          )
        })}
      </div>

      {/* Секция задач на весь день Photo 2 */}
      <div className="m-tg-allday-row" style={template}>
        <span />
        {days.map((d) => (
          <div key={d} className="m-tg-allcell" onClick={() => onSlot({ day: d, minutes: null })}>
            {(events.get(d) ?? [])
              .filter((e) => e.startMin === null)
              .map((e) => {
                const bg = colors?.[e.task.projectId]
                return (
                  <button
                    key={`${e.task.id}-${d}`}
                    className={`m-task-chip p${e.task.priority}${e.task.status === 'done' ? ' done' : ''}`}
                    style={{ backgroundColor: bg ? `${bg}2e` : undefined, color: bg || undefined }}
                    onClick={(ev) => {
                      ev.stopPropagation()
                      actions.open(e.task.id)
                    }}
                  >
                    {e.task.title}
                  </button>
                )
              })}
          </div>
        ))}
      </div>

      {/* Почасовая сетка с часами слева: 10, 11, 12, 13... */}
      <div className="tg-scroll" ref={scroller}>
        <div className="tg-body" style={{ ...template, height: HOUR_PX * 24 }}>
          <div className="m-tg-hours-col">
            {Array.from({ length: 24 }, (_, h) => (
              <span key={h} className="m-tg-hour-label" style={{ top: h * HOUR_PX }}>
                {h}
              </span>
            ))}
          </div>
          {days.map((d) => (
            <DayColumn
              key={d}
              events={events.get(d) ?? []}
              isToday={d === now}
              nowMin={nowMin}
              detailed={view === 'day'}
              day={d}
              colors={colors}
              onOpenTask={(id) => actions.open(id)}
              onSlot={(minutes) => onSlot({ day: d, minutes })}
            />
          ))}
        </div>
      </div>
    </div>
  )
}

function DayColumn(props: {
  events: CalEvent[]
  isToday: boolean
  nowMin: number
  detailed: boolean
  day: DayKey
  colors?: Record<string, string>
  onOpenTask: (id: string) => void
  onSlot: (minutes: number) => void
}) {
  const placed = useMemo(() => layoutColumns(props.events), [props.events])

  return (
    <div
      className="tg-col"
      data-day={props.day}
      onClick={(e) => {
        const rect = e.currentTarget.getBoundingClientRect()
        const raw = ((e.clientY - rect.top) / HOUR_PX) * 60
        props.onSlot(Math.min(1440 - SLOT_MIN, Math.max(0, Math.floor(raw / SLOT_MIN) * SLOT_MIN)))
      }}
    >
      {placed.map(({ event: e, col, cols }) => {
        const top = (e.startMin! / 60) * HOUR_PX
        const height = Math.max(((e.endMin! - e.startMin!) / 60) * HOUR_PX - 2, 24)
        const customColor = props.colors?.[e.task.projectId]
        return (
          <button
            key={`${e.task.id}-${e.startMin}`}
            className={`ev p${e.task.priority}${e.virtual ? ' virtual' : ''}${e.task.status === 'done' ? ' done' : ''}`}
            style={{
              backgroundColor: customColor ? `${customColor}26` : undefined,
              borderColor: customColor || undefined,
              color: customColor || undefined,
              top,
              height,
              left: `${(col / cols) * 100}%`,
              width: `calc(${100 / cols}% - 2px)`,
            }}
            onClick={(ev) => {
              ev.stopPropagation()
              props.onOpenTask(e.task.id)
            }}
          >
            <span className="ev-title">{e.task.title}</span>
            {props.detailed && (
              <span className="ev-sub">
                {hhmm(e.startMin!)}
                {e.task.address ? `, ${e.task.address}` : ''}
              </span>
            )}
          </button>
        )
      })}
      {props.isToday && <span className="now-line" style={{ top: (props.nowMin / 60) * HOUR_PX }} />}
    </div>
  )
}
