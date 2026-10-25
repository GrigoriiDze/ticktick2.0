import { useEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import {
  CAL_VIEWS,
  calTitle,
  doneOnDay,
  eventsByDay,
  layoutColumns,
  monthGrid,
  sameMonth,
  shiftAnchor,
  threeDays,
  tightTransfers,
  WEEKDAYS_SHORT,
  weekdayIndex,
  weekDays,
  yearMonths,
  type CalEvent,
  type CalView,
} from '../domain/calendar'
import { formatDay, today, type DateCtx, type DayKey } from '../domain/dates'
import type { Task } from '../domain/types'
import { ChevronLeft, ChevronRight, ViewIcon } from './icons'
import { PopMenu, type PopItem } from './PopMenu'
import { TaskList, type RowActions } from './TaskList'

const HOUR_PX = 52
const SLOT_MIN = 30
const MONTH_NAMES = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь']

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
  /** Задачу перетащили на другое время или день сетки */
  onMove?: (taskId: string, day: DayKey, minutes: number) => void
  actions: RowActions
  /** Цвет списка по его id. Нет значения: цвет акцента */
  colors?: Record<string, string>
}
type Props = CalProps

const pad = (n: number) => String(n).padStart(2, '0')
const hhmm = (min: number) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`

/** Идёт перетаскивание события или только что закончилось: нажатия и свайпы в этот момент не считаются */
let dragLive = false
let dragJustEnded = false

/** Свайп по горизонтали: влево следующий период, вправо прошлый. Вертикальную прокрутку не мешает */
function useSwipe(onShift: (dir: 1 | -1) => void) {
  const start = useRef<{ x: number; y: number } | null>(null)
  return {
    onPointerDown: (e: PointerEvent) => {
      start.current = { x: e.clientX, y: e.clientY }
    },
    onPointerUp: (e: PointerEvent) => {
      const s = start.current
      start.current = null
      if (!s || dragLive || dragJustEnded) return
      const dx = e.clientX - s.x
      const dy = e.clientY - s.y
      if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 2) onShift(dx < 0 ? 1 : -1)
    },
    onPointerCancel: () => {
      start.current = null
    },
  }
}

/** Шапка календаря: «сегодня», заголовок со стрелками, выбор вида и меню */
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
  const { view, anchor, ctx, onMenu } = props
  const [menu, setMenu] = useState<'view' | 'more' | null>(null)
  const title = calTitle(view, anchor, ctx)
  const viewItems: PopItem[] = CAL_VIEWS.map((v) => ({ key: v.id, title: v.title, checked: v.id === view, onPick: () => props.onView(v.id) }))
  const moreItems: PopItem[] = [{ key: 'done', title: 'Показывать выполненные', checked: props.showDone, onPick: props.onToggleDone }]

  return (
    <header className="cal-head">
      <div className="cal-head-left">
        {onMenu && (
          <button className="round menu-btn" onClick={onMenu} aria-label="Списки">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        )}
        <div className="cal-title">
          <button className="ghost" onClick={() => props.onShift(-1)} aria-label="Назад">
            <ChevronLeft size={18} />
          </button>
          <button className="cal-title-text" onClick={() => props.onView(view === 'list' ? 'month' : 'list')} aria-label={view === 'list' ? 'Открыть месяц' : 'Вернуться к списку дня'}>
            {title.small && <span className="cal-small">{title.small}</span>}
            <strong>{title.main}</strong>
          </button>
          <button className="ghost" onClick={() => props.onShift(1)} aria-label="Вперёд">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div className="cal-head-right">
        <button
          className="cal-action-btn today-btn"
          onClick={() => {
            if (props.anchor === today(ctx) && view === 'list') props.onView('month')
            else props.onToday()
          }}
          aria-label="Сегодня"
          title="Сегодня"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
            <rect x="3.5" y="4.8" width="17" height="15.7" rx="3.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M8 2.8v3.6M16 2.8v3.6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            <text x="12" y="16.5" textAnchor="middle" fontSize="9" fontWeight="700" fill="currentColor">
              {Number(today(ctx).slice(8))}
            </text>
          </svg>
        </button>
        <button className="cal-action-btn" onClick={() => setMenu('view')} aria-label="Вид календаря" title="Вид">
          <ViewIcon size={20} />
        </button>
        <button className="cal-action-btn" onClick={() => setMenu('more')} aria-label="Меню календаря" title="Ещё">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="5" cy="12" r="1.8" fill="currentColor" />
            <circle cx="12" cy="12" r="1.8" fill="currentColor" />
            <circle cx="19" cy="12" r="1.8" fill="currentColor" />
          </svg>
        </button>
      </div>

      {menu === 'view' && <PopMenu label="Вид календаря" items={viewItems} onClose={() => setMenu(null)} />}
      {menu === 'more' && <PopMenu label="Меню календаря" items={moreItems} onClose={() => setMenu(null)} />}
    </header>
  )
}

export function Calendar(props: Props) {
  const { tasks, ctx, view, anchor } = props

  // Диапазон дней, для которых нужны события
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
  const events = useMemo(() => eventsByDay(tasks, ctx, range[0], range[1]), [tasks, ctx, range])
  const shift = (dir: 1 | -1) => props.onAnchor(shiftAnchor(view, anchor, dir))
  const swipe = useSwipe(shift)

  if (view === 'week' || view === 'days3' || view === 'day') {
    const days = view === 'week' ? weekDays(anchor) : view === 'days3' ? threeDays(anchor) : [anchor]
    return (
      <div className="cal time" {...swipe}>
        <TimeGrid {...props} days={days} events={events} />
      </div>
    )
  }

  if (view === 'year') return <YearView {...props} events={events} />

  return (
    <div className="cal" {...swipe}>
      {view === 'list' ? <WeekStrip {...props} events={events} /> : <MonthGrid {...props} events={events} />}
      <DayCards {...props} events={events} />
    </div>
  )
}

function WeekStrip({ ctx, anchor, events, onAnchor, colors }: Props & { events: Map<DayKey, CalEvent[]> }) {
  const now = today(ctx)
  return (
    <div className="strip">
      {weekDays(anchor).map((d) => {
        const evs = events.get(d) ?? []
        return (
          <button key={d} className={`strip-day${d === anchor ? ' sel' : ''}${d === now ? ' today' : ''}`} onClick={() => onAnchor(d)} aria-label={formatDay(d, ctx)} aria-pressed={d === anchor}>
            <span className="strip-wd">{WEEKDAYS_SHORT[weekdayIndex(d)]}</span>
            <span className="strip-num">{Number(d.slice(8))}</span>
            <span className="cal-dots">
              {evs.slice(0, 3).map((e, idx) => (
                <span key={idx} className={`cal-dot p${e.task.priority}`} style={{ backgroundColor: colors?.[e.task.projectId] || undefined }} />
              ))}
            </span>
          </button>
        )
      })}
    </div>
  )
}

function MonthGrid({ ctx, anchor, events, onAnchor, colors }: Props & { events: Map<DayKey, CalEvent[]> }) {
  const weeks = useMemo(() => monthGrid(anchor), [anchor])
  const now = today(ctx)
  return (
    <div className="month">
      <div className="month-head">
        {WEEKDAYS_SHORT.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      {weeks.map((week) => (
        <div className="month-week" key={week[0]}>
          {week.map((day) => {
            const evs = events.get(day) ?? []
            return (
              <button
                key={day}
                className={`month-cell${sameMonth(day, anchor) ? '' : ' other'}${day === anchor ? ' sel' : ''}${day === now ? ' today' : ''}`}
                onClick={() => onAnchor(day)}
                aria-label={formatDay(day, ctx)}
                aria-pressed={day === anchor}
              >
                <span className="num">{Number(day.slice(8))}</span>
                <span className="cal-dots">
                  {evs.slice(0, 3).map((e, idx) => (
                    <span key={idx} className={`cal-dot p${e.task.priority}`} style={{ backgroundColor: colors?.[e.task.projectId] || undefined }} />
                  ))}
                </span>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

/** Задачи выбранного дня одной карточкой, закрытые в этот день отдельной */
function DayCards({ ctx, anchor, events, tasks, showDone, actions, onSlot }: Props & { events: Map<DayKey, CalEvent[]> }) {
  const list = useMemo(() => {
    const seen = new Set<string>()
    const out: Task[] = []
    for (const e of events.get(anchor) ?? []) {
      if (seen.has(e.task.id)) continue
      seen.add(e.task.id)
      out.push(e.task)
    }
    return out
  }, [events, anchor])
  const done = useMemo(() => (showDone ? doneOnDay(tasks, anchor, ctx) : []), [showDone, tasks, anchor, ctx])

  return (
    <>
      <section className="group day-card">
        <div className="day-head-row">
          <h3 className="day-title">{formatDay(anchor, ctx)}</h3>
          <button className="cal-day-add-btn" onClick={() => onSlot({ day: anchor, minutes: null })} aria-label="Добавить задачу" title="Добавить задачу">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>Добавить</span>
          </button>
        </div>
        {list.length ? <TaskList tasks={list} groups={null} ctx={ctx} listKey={`cal:${anchor}`} actions={actions} forDay={anchor} /> : <p className="muted day-empty">Нет задач</p>}
      </section>
      {done.length > 0 && (
        <section className="group day-card">
          <h3 className="day-title">Выполнено</h3>
          <TaskList tasks={done} groups={null} ctx={ctx} listKey={`cal-done:${anchor}`} actions={actions} forDay={anchor} />
        </section>
      )}
    </>
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
          aria-label={`${MONTH_NAMES[Number(first.slice(5, 7)) - 1]} ${first.slice(0, 4)}`}
          onClick={() => {
            onAnchor(sameMonth(now, first) ? now : first)
            onView('month')
          }}
        >
          <span className="year-name">{MONTH_NAMES[Number(first.slice(5, 7)) - 1]}</span>
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

function chipClass(e: CalEvent): string {
  return `ev-chip p${e.task.priority}${e.virtual ? ' virtual' : ''}`
}

export function TimeGrid({
  ctx,
  view,
  days,
  events,
  actions,
  onSlot,
  onMove,
  colors,
  onAnchor,
  onView,
}: Props & { days: DayKey[]; events: Map<DayKey, CalEvent[]> }) {
  const scroller = useRef<HTMLDivElement>(null)
  const [drag, setDrag] = useState<{ title: string; x: number; y: number; w: number; h: number; label: string } | null>(null)

  /** Долгое нажатие поднимает событие, дальше его несут пальцем: по вертикали время (шаг 15 минут), по горизонтали день */
  function pressEvent(down: PointerEvent<HTMLElement>, e: CalEvent) {
    if (!onMove || e.virtual || e.task.repeat || e.startMin === null) return
    const el = down.currentTarget
    const rect = el.getBoundingClientRect()
    const grab = down.clientY - rect.top
    const startX = down.clientX
    const startY = down.clientY
    let active = false
    let last = { x: startX, y: startY }
    const spot = (x: number, y: number) => {
      const col = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>('.tg-col[data-day]')
      if (!col) return null
      const r = col.getBoundingClientRect()
      const raw = ((y - grab - r.top) / HOUR_PX) * 60
      const minutes = Math.min(1440 - 15, Math.max(0, Math.round(raw / 15) * 15))
      return { day: col.dataset.day as DayKey, minutes }
    }
    const show = (x: number, y: number) => {
      const s = spot(x, y)
      setDrag({ title: e.task.title, x, y: y - grab, w: rect.width, h: rect.height, label: s ? hhmm(s.minutes) : '' })
    }
    const block = (ev: Event) => ev.preventDefault()
    const stop = () => {
      dragLive = false
      window.clearTimeout(timer)
      window.clearInterval(scrollTimer)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
      window.removeEventListener('touchmove', block)
    }
    const move = (ev: globalThis.PointerEvent) => {
      last = { x: ev.clientX, y: ev.clientY }
      if (active) show(ev.clientX, ev.clientY)
      else if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > 8) stop()
    }
    const cancel = () => {
      stop()
      setDrag(null)
    }
    const up = (ev: globalThis.PointerEvent) => {
      const wasActive = active
      stop()
      if (!wasActive) return
      dragJustEnded = true
      window.setTimeout(() => (dragJustEnded = false), 60)
      const s = spot(ev.clientX, ev.clientY)
      setDrag(null)
      if (s) onMove?.(e.task.id, s.day, s.minutes)
    }
    const timer = window.setTimeout(() => {
      active = true
      dragLive = true
      window.addEventListener('touchmove', block, { passive: false })
      show(last.x, last.y)
    }, 400)
    // У верхнего и нижнего края сетка сама прокручивается
    const scrollTimer = window.setInterval(() => {
      const box = scroller.current
      if (!active || !box) return
      const r = box.getBoundingClientRect()
      if (last.y > r.bottom - 48) box.scrollTop += 10
      else if (last.y < r.top + 48) box.scrollTop -= 10
      else return
      show(last.x, last.y)
    }, 16)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
  }
  const now = today(ctx)
  const nowMin = useMemo(() => {
    const d = new Date(ctx.now)
    const t = new Intl.DateTimeFormat('en-GB', { timeZone: ctx.tz, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d)
    const [h, m] = t.split(':').map(Number)
    return h * 60 + m
  }, [ctx])

  // При открытии прокручиваем к началу рабочего дня или чуть раньше текущего времени
  useEffect(() => {
    if (!scroller.current) return
    const startHour = days.includes(now) ? Math.max(0, Math.floor(nowMin / 60) - 2) : 7
    scroller.current.scrollTop = startHour * HOUR_PX
  }, [view, days[0]]) // eslint-disable-line react-hooks/exhaustive-deps

  const cols = days.length
  const template = { gridTemplateColumns: `38px repeat(${cols}, 1fr)` }

  return (
    <div className="tg">
      <div className="tg-head" style={template}>
        <span />
        {days.map((d) => (
          <button
            key={d}
            className={d === now ? 'tg-day today' : 'tg-day'}
            onClick={() => {
              if (view !== 'day') {
                onAnchor(d)
                onView('day')
              }
            }}
          >
            <span className="muted">{WEEKDAYS_SHORT[weekdayIndex(d)]}</span>
            <span className="num">{Number(d.slice(8))}</span>
          </button>
        ))}
      </div>

      <div className="tg-allday" style={template}>
        <span />
        {days.map((d) => (
          <div key={d} className="tg-allcell" onClick={() => onSlot({ day: d, minutes: null })}>
            {(events.get(d) ?? [])
              .filter((e) => e.startMin === null)
              .map((e) => (
                <button
                  key={`${e.task.id}-${d}`}
                  className={chipClass(e)}
                  onClick={(ev) => {
                    ev.stopPropagation()
                    actions.open(e.task.id)
                  }}
                >
                  {e.task.title}
                </button>
              ))}
          </div>
        ))}
      </div>

      <div className="tg-scroll" ref={scroller}>
        <div className="tg-body" style={{ ...template, height: HOUR_PX * 24 }}>
          <div className="tg-hours">
            {Array.from({ length: 24 }, (_, h) => (
              <span key={h} style={{ top: h * HOUR_PX }}>
                {h === 0 ? '' : `${pad(h)}:00`}
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
              onOpenTask={(id) => {
                if (!dragJustEnded) actions.open(id)
              }}
              onSlot={(minutes) => onSlot({ day: d, minutes })}
              onPress={pressEvent}
            />
          ))}
        </div>
      </div>
      {drag && (
        <div className="ev-ghost" style={{ left: drag.x, top: drag.y, width: drag.w, minHeight: drag.h }} aria-hidden="true">
          <strong>{drag.label}</strong> {drag.title}
        </div>
      )}
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
  onPress: (down: PointerEvent<HTMLElement>, e: CalEvent) => void
}) {
  const placed = useMemo(() => layoutColumns(props.events), [props.events])
  const tight = useMemo(() => tightTransfers(props.events), [props.events])

  return (
    <div
      className="tg-col"
      data-day={props.day}
      onClick={(e) => {
        if (dragJustEnded) return
        const rect = e.currentTarget.getBoundingClientRect()
        const raw = ((e.clientY - rect.top) / HOUR_PX) * 60
        props.onSlot(Math.min(1440 - SLOT_MIN, Math.max(0, Math.floor(raw / SLOT_MIN) * SLOT_MIN)))
      }}
    >
      {placed.map(({ event: e, col, cols }) => {
        const top = (e.startMin! / 60) * HOUR_PX
        const height = Math.max(((e.endMin! - e.startMin!) / 60) * HOUR_PX - 2, 22)
        return (
          <button
            key={`${e.task.id}-${e.startMin}`}
            className={`ev p${e.task.priority}${e.virtual ? ' virtual' : ''}${tight.has(e.task.id) ? ' tight' : ''}${e.task.status === 'done' ? ' done' : ''}`}
            style={{ ['--ev' as string]: props.colors?.[e.task.projectId], top, height, left: `${(col / cols) * 100}%`, width: `calc(${100 / cols}% - 2px)` }}
            onPointerDown={(down) => props.onPress(down, e)}
            onClick={(ev) => {
              ev.stopPropagation()
              props.onOpenTask(e.task.id)
            }}
            title={tight.has(e.task.id) ? 'Между встречами мало времени на дорогу' : undefined}
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

