import { useEffect, useMemo, useRef, useState, type PointerEvent, type TouchEvent } from 'react'
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
import { isActive } from '../domain/habits'
import type { Habit, Task } from '../domain/types'
import { HabitIcon } from './Habits'
import { PopMenu, type PopItem } from './PopMenu'
import { SWIPE_WIDTH, SwipeActionsTray, type RowActions } from './TaskList'

const HOUR_PX = 56
const SLOT_MIN = 30
const MONTHS_LOWER_RU = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
]
const SHORT_MONTHS_RU = ['ЯНВ.', 'ФЕВ.', 'МАР.', 'АПР.', 'МАЙ', 'ИЮН.', 'ИЮЛ.', 'АВГ.', 'СЕНТ.', 'ОКТ.', 'НОЯБ.', 'ДЕК.']
const WEEKDAYS_LOWER = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']

export interface QuickAddRequest {
  day: DayKey
  /** Минуты от полуночи, null для задачи на весь день */
  minutes: number | null
}

export interface CalProps {
  tasks: Task[]
  habits?: Habit[]
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
      if ((e.target as HTMLElement).closest('.m-cal-swipe-wrap')) return
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

/** Шапка мобильного календаря 1-в-1 по photo_1, photo_2, photo_3, photo_4, photo_8, photo_31 */
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

  useEffect(() => {
    if (!menu) return
    const onBack = (e: Event) => {
      e.preventDefault()
      setMenu(null)
    }
    window.addEventListener('tt-back-request', onBack)
    return () => window.removeEventListener('tt-back-request', onBack)
  }, [menu])
  const monthIdx = Number(anchor.slice(5, 7)) - 1
  const monthLabel = MONTHS_LOWER_RU[monthIdx] || 'октября'

  const viewItems: PopItem[] = CAL_VIEWS.map((v) => ({
    key: v.id,
    title: v.title,
    checked: v.id === view,
    onPick: () => onView(v.id),
  }))

  const moreItems: PopItem[] = [
    {
      key: 'filter',
      title: 'Обзор фильтра',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 5h16l-6.5 7.5v6l-3-1.5v-4.5L4 5z" />
        </svg>
      ),
      onPick: () => onToday(),
    },
    {
      key: 'done',
      title: 'Параметры просмотра',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
          <circle cx="12" cy="12" r="2.5" />
        </svg>
      ),
      onPick: props.onToggleDone,
    },
    {
      key: 'arrange',
      title: 'Выстроить задачу',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3.5" y="4.5" width="17" height="16" rx="3" />
          <path d="M8 2.5v3M16 2.5v3M8 11h8M8 15h5" />
        </svg>
      ),
      onPick: () => onView('week'),
    },
    {
      key: 'sub',
      title: 'Подписка на календарь',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3.5" y="4.5" width="17" height="16" rx="3" />
          <path d="M8 2.5v3M16 2.5v3M8 16a1 1 0 100-2 1 1 0 000 2zm0-4.5a4.5 4.5 0 014.5 4.5" />
        </svg>
      ),
      onPick: () => {},
    },
    {
      key: 'share',
      title: 'Поделиться',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 4h6v6M20 4l-9 9M19 13v5a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h5" />
        </svg>
      ),
      onPick: () => {},
    },
    {
      key: 'select',
      title: 'Выбрать',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 7l2 2 3.5-3.5M4 15l2 2 3.5-3.5M12 7h8M12 12h8M12 17h8" />
        </svg>
      ),
      onPick: () => {},
    },
  ]

  const isMonth = view === 'month'
  const isList = view === 'list'
  const isDay = view === 'day'

  return (
    <>
      <header className="m-cal-head">
        <div className="m-cal-head-left">
          <h2 className="m-cal-month-title" onClick={onToday} style={{ cursor: 'pointer' }}>
            {monthLabel}
          </h2>
        </div>

        <div className="m-cal-head-right">
          {isList ? (
            <button
              className="m-cal-btn"
              onClick={props.onToggleDone}
              aria-label="Обзор фильтра"
              title="Обзор фильтра"
            >
              {/* Иконка фильтров-ползунков со списком (photo_8, photo_41) */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <line x1="6" y1="5" x2="6" y2="19" />
                <circle cx="6" cy="9" r="2" fill="var(--bg)" />
                <circle cx="6" cy="15" r="2" fill="var(--bg)" />
                <rect x="11" y="6" width="8" height="4.5" rx="1.2" />
                <rect x="11" y="13.5" width="8" height="4.5" rx="1.2" />
              </svg>
            </button>
          ) : !isMonth ? (
            <button
              className="m-cal-btn"
              onClick={() => onView('month')}
              aria-label="Месяц"
              title="Месяц"
            >
              {/* Иконка перекидного календаря (photo_2, photo_3, photo_4) */}
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3.5" y="4.5" width="17" height="16" rx="4" />
                <path d="M8.5 2.5v3.2M15.5 2.5v3.2M3.5 9.5h17" />
              </svg>
            </button>
          ) : null}

          <button
            className="m-cal-btn"
            onClick={() => setMenu('view')}
            aria-label="Вид календаря"
            title="Вид"
          >
            {isMonth ? (
              /* Скругленный квадрат, разделенный крестом на 4 ячейки (photo_1) */
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
                <line x1="12" y1="3.5" x2="12" y2="20.5" />
                <line x1="3.5" y1="12" x2="20.5" y2="12" />
              </svg>
            ) : isList ? (
              /* Иконка вида списка календаря (photo_8, photo_41) */
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3.5" y="4" width="17" height="6" rx="2" />
                <line x1="8" y1="4" x2="8" y2="10" />
                <line x1="16" y1="4" x2="16" y2="10" />
                <line x1="4" y1="14.5" x2="20" y2="14.5" />
                <line x1="4" y1="19" x2="20" y2="19" />
              </svg>
            ) : isDay ? (
              /* Иконка вида дня: скругленный квадрат с вертикальной полоской (photo_4) */
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
                <line x1="8.5" y1="7.5" x2="8.5" y2="16.5" />
              </svg>
            ) : (
              /* 3 вертикальные колонки (photo_2, photo_3) */
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3.8" y="3.5" width="4" height="17" rx="1.2" />
                <rect x="10" y="3.5" width="4" height="17" rx="1.2" />
                <rect x="16.2" y="3.5" width="4" height="17" rx="1.2" />
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
              <circle cx="12" cy="5.5" r="1.7" />
              <circle cx="12" cy="12" r="1.7" />
              <circle cx="12" cy="18.5" r="1.7" />
            </svg>
          </button>
        </div>
      </header>

      {menu === 'view' && <PopMenu label="Вид календаря" items={viewItems} onClose={() => setMenu(null)} />}
      {menu === 'more' && <PopMenu label="Опции" items={moreItems} onClose={() => setMenu(null)} />}
    </>
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

  if (view === 'list') {
    return <CalListView {...props} events={events} onShift={shift} />
  }

  if (view === 'week' || view === 'days3' || view === 'day') {
    const days = view === 'week' ? weekDays(anchor) : view === 'days3' ? threeDays(anchor) : [anchor]
    return (
      <div className="cal time">
        <TimeGrid {...props} days={days} events={events} />
      </div>
    )
  }

  if (view === 'year') return <YearView {...props} events={events} />

  // Полноэкранный месяц 1-в-1 по photo_1
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

/** Строка задачи в списке календаря с коротким свайпом (3 пилюли) и полным свайпом до конца (удаление) */
function CalListSwipeRow({ event, actions }: { event: CalEvent; actions: RowActions }) {
  const { task } = event
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const offsetRef = useRef(0)
  offsetRef.current = offset
  const drag = useRef<{ x: number; y: number; base: number; moved: boolean; locked: 'h' | 'v' | null } | null>(null)
  const ignoreClick = useRef(false)

  useEffect(() => {
    if (offset === 0) return
    const close = (e: Event) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOffset(0)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('touchstart', close, { passive: true })
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('touchstart', close)
    }
  }, [offset])

  const swallowClick = () => {
    ignoreClick.current = true
    window.setTimeout(() => (ignoreClick.current = false), 80)
  }

  function start(clientX: number, clientY: number, target: HTMLElement) {
    if (target.closest('input,.swipe-actions')) return
    drag.current = { x: clientX, y: clientY, base: offsetRef.current, moved: false, locked: null }
  }

  function move(clientX: number, clientY: number, stopProp?: () => void) {
    const d = drag.current
    if (!d) return
    const dx = clientX - d.x
    const dy = clientY - d.y
    if (!d.locked) {
      if (Math.abs(dx) < 7 && Math.abs(dy) < 7) return
      if (Math.abs(dy) > Math.abs(dx)) {
        d.locked = 'v'
        drag.current = null
        return
      }
      d.locked = 'h'
      d.moved = true
      setDragging(true)
    }
    if (d.locked === 'h') {
      stopProp?.()
      const rowW = wrapRef.current?.offsetWidth || 340
      const next = Math.max(-rowW, Math.min(0, d.base + dx))
      offsetRef.current = next
      setOffset(next)
    }
  }

  function end() {
    const d = drag.current
    drag.current = null
    if (!d || !d.moved) return
    swallowClick()
    setDragging(false)
    const rowW = wrapRef.current?.offsetWidth || 340
    const fullThresh = -Math.max(225, rowW * 0.65)
    const cur = offsetRef.current
    if (cur <= fullThresh) {
      setOffset(-rowW)
      window.setTimeout(() => {
        setOffset(0)
        actions.remove(task)
      }, 160)
    } else if (cur < -56) {
      setOffset(-SWIPE_WIDTH)
    } else {
      setOffset(0)
    }
  }

  const rowW = wrapRef.current?.offsetWidth || 340
  const isFullDelete = offset <= -Math.max(225, rowW * 0.65)

  return (
    <div className="m-cal-swipe-wrap" ref={wrapRef}>
      <SwipeActionsTray
        visible={offset !== 0}
        fullDelete={isFullDelete}
        onEdit={() => {
          setOffset(0)
          actions.open(task.id)
        }}
        onDelete={() => {
          setOffset(0)
          actions.remove(task)
        }}
        onDate={() => {
          setOffset(0)
          actions.reschedule(task)
        }}
      />
      <div
        className={`m-cal-list-row${dragging ? ' dragging' : ''}`}
        style={offset ? { transform: `translateX(${offset}px)` } : undefined}
        onTouchStart={(e: TouchEvent) => {
          const t = e.touches[0]
          if (t) start(t.clientX, t.clientY, e.target as HTMLElement)
        }}
        onTouchMove={(e: TouchEvent) => {
          const t = e.touches[0]
          if (t) move(t.clientX, t.clientY, () => e.stopPropagation())
        }}
        onTouchEnd={end}
        onTouchCancel={end}
        onPointerDown={(e) => {
          if (e.pointerType !== 'touch') start(e.clientX, e.clientY, e.target as HTMLElement)
        }}
        onPointerMove={(e) => {
          if (e.pointerType !== 'touch') move(e.clientX, e.clientY, () => e.stopPropagation())
        }}
        onPointerUp={(e) => {
          if (e.pointerType !== 'touch') end()
        }}
        onPointerCancel={(e) => {
          if (e.pointerType !== 'touch') end()
        }}
        onClick={() => {
          if (ignoreClick.current) return
          if (offset !== 0) setOffset(0)
          else actions.open(task.id)
        }}
      >
        <input
          type="checkbox"
          className={`m-cal-list-check p${task.priority}`}
          checked={task.status === 'done'}
          onClick={(ev) => ev.stopPropagation()}
          onChange={() => actions.toggle(task)}
        />
        <span className={`m-cal-list-item-name${task.status === 'done' ? ' done' : ''}`}>
          {task.title}
        </span>
        <span className="m-cal-list-right-blue">
          {event.startMin !== null ? hhmm(event.startMin) : 'Сегодня'}
        </span>
      </div>
    </div>
  )
}

/** Вид «Список» календаря 1-в-1 по photo_8 и photo_41 */
function CalListView({
  ctx,
  anchor,
  events,
  habits,
  onAnchor,
  actions,
  onShift,
}: Props & { events: Map<DayKey, CalEvent[]>; onShift: (dir: 1 | -1) => void }) {
  const days = useMemo(() => weekDays(anchor), [anchor])
  const now = today(ctx)
  const swipe = useSwipe(onShift)
  const dayEvents = events.get(anchor) ?? []
  const isToday = anchor === now
  const activeHabits = useMemo(() => (habits ?? []).filter(isActive), [habits])

  return (
    <div className="m-cal-list-screen" {...swipe}>
      <div className="m-cal-list-strip">
        {days.map((d) => {
          const dToday = d === now
          const dSel = d === anchor
          const wd = WEEKDAYS_LOWER[weekdayIndex(d)]
          return (
            <button
              key={d}
              className="m-tg-day-btn"
              onClick={() => onAnchor(d)}
            >
              <span className={`m-tg-wd${dToday ? ' today-wd' : ''}`}>{wd}</span>
              <span className={`m-tg-num${dToday ? ' today' : dSel ? ' sel' : ''}`}>
                {Number(d.slice(8))}
              </span>
            </button>
          )
        })}
      </div>

      <div className="m-cal-list-body">
        {/* Карточка обратного отсчета (photo_8, photo_41) */}
        <div className="m-cal-list-card">
          <div className="m-cal-list-card-title">обратный отсчет</div>
          <div className="m-cal-list-row">
            <span className="m-cal-cd-badge" aria-hidden="true">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="16" rx="3" fill="#ffffff" />
                <rect x="3" y="4" width="18" height="5" rx="2" fill="#4772fa" />
                <circle cx="9" cy="14" r="2" fill="#f5a623" />
                <path d="M13 14h5" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </span>
            <span className="m-cal-list-item-name">Используйте TickTick</span>
            <span className="m-cal-list-right-blue">Сегодня</span>
          </div>
        </div>

        {/* Карточка задач выбранного дня (photo_8, photo_41) */}
        <div className="m-cal-list-card">
          <div className="m-cal-list-card-title">
            {isToday ? 'Сегодня' : `${Number(anchor.slice(8))} ${MONTHS_LOWER_RU[Number(anchor.slice(5, 7)) - 1]}`}
          </div>
          {dayEvents.length === 0 ? (
            <div className="m-cal-list-empty">Нет задач на этот день</div>
          ) : (
            dayEvents.map((e) => <CalListSwipeRow key={e.task.id} event={e} actions={actions} />)
          )}
        </div>

        {/* Карточка привычек (photo_41) */}
        {activeHabits.length > 0 && (
          <div className="m-cal-list-card">
            <div className="m-cal-list-card-title">Привычка</div>
            {activeHabits.map((h) => (
              <div key={h.id} className="m-cal-list-row">
                <span className="m-cal-hb-badge" style={{ background: h.color }} aria-hidden="true">
                  <HabitIcon name={h.name} size={18} />
                </span>
                <span className="m-cal-list-item-name">{h.name}</span>
                <span className="m-cal-list-right-blue">Сегодня</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

/** Сетка месяца на весь экран с плашками задач внутри (photo_1) */
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
            const isSel = day === anchor && !isToday

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
                  <span className={`m-cal-num${isToday ? ' today' : isSel ? ' sel-num' : ''}`}>
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
                          backgroundColor: customBg ? customBg : undefined,
                          color: customBg ? '#ffffff' : undefined,
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

/** Почасовая сетка с лентой дней и белой скругленной карточкой сетки (photo_2, photo_3, photo_4) */
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
    const startHour = days.includes(now) ? Math.max(0, Math.floor(nowMin / 60) - 4) : 9
    scroller.current.scrollTop = startHour * HOUR_PX
  }, [view, days[0]])

  const cols = days.length
  const template = { gridTemplateColumns: `42px repeat(${cols}, 1fr)` }
  const hasAllDay = days.some((d) => (events.get(d) ?? []).some((e) => e.startMin === null))

  return (
    <div className="tg">
      {/* Лента дней недели photo_2, photo_3, photo_4 */}
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
              <span className={`m-tg-wd${isToday ? ' today-wd' : ''}`}>{wd}</span>
              <span className={`m-tg-num${isToday ? ' today' : ''}`}>
                {Number(d.slice(8))}
              </span>
            </button>
          )
        })}
      </div>

      {/* Секция задач на весь день (если есть задачи без времени) */}
      {hasAllDay && (
        <div className="m-tg-allday-row" style={{ ...template, gridAutoRows: 'minmax(0, 1fr)' }}>
          <span className="m-tg-allday-axis" />
          {days.map((d, idx) => (
            <div
              key={d}
              className={`m-tg-allcell${idx === 0 ? ' first' : ''}${idx === days.length - 1 ? ' last' : ''}`}
              style={{ minHeight: 0 }}
              onClick={() => onSlot({ day: d, minutes: null })}
            >
              {(events.get(d) ?? [])
                .filter((e) => e.startMin === null)
                .map((e) => {
                  const bg = colors?.[e.task.projectId]
                  return (
                    <button
                      key={`${e.task.id}-${d}`}
                      className={`m-task-chip allday-chip p${e.task.priority}${e.task.status === 'done' ? ' done' : ''}`}
                      style={{ backgroundColor: bg ? bg : undefined, color: bg ? '#ffffff' : undefined }}
                      onClick={(ev) => {
                        ev.stopPropagation()
                        actions.open(e.task.id)
                      }}
                    >
                      <span className="m-chip-checkbox" aria-hidden="true" />
                      <span className="m-chip-text">{e.task.title}</span>
                    </button>
                  )
                })}
            </div>
          ))}
        </div>
      )}

      {/* Почасовая сетка с часами слева на сером фоне и белой карточкой справа (photo_2, photo_3, photo_4) */}
      <div className="tg-scroll" ref={scroller}>
        <div className="tg-body" style={{ ...template, height: HOUR_PX * 24 }}>
          <div className="m-tg-hours-col">
            {Array.from({ length: 24 }, (_, h) => (
              <span key={h} className="m-tg-hour-label" style={{ top: h * HOUR_PX }}>
                {pad(h)}
              </span>
            ))}
          </div>
          {days.map((d, idx) => (
            <DayColumn
              key={d}
              events={events.get(d) ?? []}
              isToday={d === now}
              isFirst={idx === 0 && !hasAllDay}
              isLast={idx === days.length - 1 && !hasAllDay}
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
  isFirst?: boolean
  isLast?: boolean
  nowMin: number
  detailed: boolean
  day: DayKey
  colors?: Record<string, string>
  onOpenTask: (id: string) => void
  onSlot: (minutes: number) => void
}) {
  const placed = useMemo(() => layoutColumns(props.events), [props.events])
  const colClass = `tg-col${props.isFirst ? ' first-col' : ''}${props.isLast ? ' last-col' : ''}`

  return (
    <div
      className={colClass}
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
              backgroundColor: customColor ? `${customColor}24` : undefined,
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
      {props.isToday && (
        <span className="now-line" style={{ top: (props.nowMin / 60) * HOUR_PX }}>
          <i className="now-dot" />
        </span>
      )}
    </div>
  )
}
