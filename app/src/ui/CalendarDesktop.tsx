import { useEffect, useMemo, useRef, useState } from 'react'
import { DESKTOP_VIEWS, eventsByDay, monthGrid, sameMonth, threeDays, twoWeeks, weekDays, weekdayIndex, yearMonths, calTitle, type CalEvent, type CalView } from '../domain/calendar'
import { addDays, formatDay, today, type DateCtx, type DayKey } from '../domain/dates'
import { TimeGrid, type CalProps } from './Calendar'
import { ChevronLeft, ChevronRight } from './icons'

const WD_HEAD = ['Пон.', 'Втр.', 'Срд.', 'Чтв.', 'Птн.', 'Сбт.', 'Вск.']
const WD_YEAR = ['ПН.', 'ВТ.', 'СР.', 'ЧТ.', 'ПТ.', 'СБ.', 'ВС.']
const MONTH_NAMES = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь']
const MONTH_SHORT = ['янв.', 'февр.', 'март.', 'апр.', 'мая', 'июн.', 'июл.', 'авг.', 'сент.', 'окт.', 'нояб.', 'дек.']
const AGENDA_DAYS = 90

const pad = (n: number) => String(n).padStart(2, '0')
const hhmm = (min: number) => `${pad(Math.floor(min / 60))}:${pad(min % 60)}`

export interface DeskProps extends CalProps {
  /** Цвет списка по его id: события красятся цветом своего списка */
  colors: Record<string, string>
  /** Задачу перетащили на другой день (время остаётся) */
  onMoveDay: (taskId: string, day: DayKey) => void
}

/** Шапка календаря на большом экране: название периода, «+», выбор вида, переход по периодам */
export function DeskCalHeader(props: {
  view: CalView
  anchor: DayKey
  ctx: DateCtx
  showDone: boolean
  onShift: (dir: 1 | -1) => void
  onToday: () => void
  onView: (v: CalView) => void
  onAdd: () => void
  onToggleDone: () => void
}) {
  const { view, anchor, ctx } = props
  const [open, setOpen] = useState<'view' | 'more' | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const title = calTitle(view, anchor, ctx)
  const current = DESKTOP_VIEWS.find((v) => v.id === view) ?? DESKTOP_VIEWS[1]

  useEffect(() => {
    if (!open) return
    const close = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(null)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [open])

  return (
    <header className="dcal-head" ref={box}>
      <h1>{title.main.toLowerCase().startsWith('сегодня') ? title.small : title.main}</h1>
      <span className="dcal-spacer" />
      <button className="dcal-btn" onClick={props.onAdd} aria-label="Добавить задачу">
        +
      </button>
      <div className="dcal-dd">
        <button className="dcal-btn wide" onClick={() => setOpen(open === 'view' ? null : 'view')} aria-haspopup="menu" aria-expanded={open === 'view'} aria-label="Вид календаря">
          {current.title} ⌄
        </button>
        {open === 'view' && (
          <div className="dcal-menu" role="menu">
            {DESKTOP_VIEWS.map((v) => (
              <button key={v.id} role="menuitem" className={v.id === view ? 'on' : undefined} onClick={() => (props.onView(v.id), setOpen(null))}>
                {v.title}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="dcal-nav">
        <button onClick={() => props.onShift(-1)} aria-label="Назад">
          <ChevronLeft size={18} />
        </button>
        <button className="today" onClick={props.onToday}>
          Сегодня
        </button>
        <button onClick={() => props.onShift(1)} aria-label="Вперёд">
          <ChevronRight size={18} />
        </button>
      </div>
      <div className="dcal-dd">
        <button className="dcal-btn" onClick={() => setOpen(open === 'more' ? null : 'more')} aria-label="Меню календаря">
          ⋯
        </button>
        {open === 'more' && (
          <div className="dcal-menu right" role="menu">
            <button role="menuitem" className={props.showDone ? 'on' : undefined} onClick={() => (props.onToggleDone(), setOpen(null))}>
              Показывать выполненные
            </button>
          </div>
        )}
      </div>
    </header>
  )
}

/** Календарь для большого экрана. Для маленького есть свой, в Calendar.tsx */
export function CalendarDesktop(props: DeskProps) {
  const { tasks, ctx, view, anchor, showDone } = props

  const range = useMemo((): [DayKey, DayKey] => {
    if (view === 'year') return [`${anchor.slice(0, 4)}-01-01`, `${anchor.slice(0, 4)}-12-31`]
    if (view === 'month') {
      const g = monthGrid(anchor).flat()
      return [g[0], g[g.length - 1]]
    }
    if (view === 'weeks2') {
      const g = twoWeeks(anchor).flat()
      return [g[0], g[13]]
    }
    if (view === 'days3') {
      const d = threeDays(anchor)
      return [d[0], d[2]]
    }
    if (view === 'day') return [anchor, anchor]
    if (view === 'agenda') return [anchor, addDays(anchor, AGENDA_DAYS)]
    const w = weekDays(anchor)
    return [w[0], w[6]]
  }, [view, anchor])
  const events = useMemo(() => eventsByDay(tasks, ctx, range[0], range[1], showDone), [tasks, ctx, range, showDone])

  if (view === 'year') return <DeskYear {...props} events={events} />
  if (view === 'agenda') return <DeskAgenda {...props} events={events} />
  if (view === 'week' || view === 'day' || view === 'days3') {
    const days = view === 'week' ? weekDays(anchor) : view === 'days3' ? threeDays(anchor) : [anchor]
    return (
      <div className="dcal-time">
        <TimeGrid {...props} days={days} events={events} />
      </div>
    )
  }
  const weeks = view === 'weeks2' ? twoWeeks(anchor) : monthGrid(props.anchor)
  return <DeskMonth {...props} weeks={weeks} events={events} />
}

type EventMap = Map<DayKey, CalEvent[]>

/** Сколько плашек влезает в ячейку: считаем по её высоте, лишние уходят в «+N» */
function useCapacity(ref: React.RefObject<HTMLElement | null>, deps: unknown[]): number {
  const [cap, setCap] = useState(3)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const measure = () => {
      const cell = el.querySelector<HTMLElement>('.dm-cell')
      if (cell) setCap(Math.max(1, Math.floor((cell.clientHeight - 30) / 25)))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
  return cap
}

function DeskMonth(props: DeskProps & { weeks: DayKey[][]; events: EventMap }) {
  const { ctx, anchor, weeks, events, colors, actions } = props
  const now = today(ctx)
  const grid = useRef<HTMLDivElement>(null)
  const cap = useCapacity(grid, [weeks.length])
  const [more, setMore] = useState<DayKey | null>(null)

  const chip = (e: CalEvent) => {
    const t = e.task
    const done = t.status === 'done'
    return (
      <button
        key={`${t.id}-${e.day}-${e.startMin}`}
        className={`dchip${done ? ' done' : ''}${e.virtual ? ' virtual' : ''}`}
        style={{ ['--c' as string]: colors[t.projectId] ?? 'var(--accent)' }}
        draggable={!e.virtual && !done}
        onDragStart={(ev) => ev.dataTransfer.setData('text/plain', t.id)}
        onClick={(ev) => {
          ev.stopPropagation()
          actions.open(t.id)
        }}
      >
        <span
          className="dchk"
          role="checkbox"
          aria-checked={done}
          aria-label={t.title}
          onClick={(ev) => {
            ev.stopPropagation()
            actions.toggle(t)
          }}
        />
        <span className="dchip-title">{t.title}</span>
        {e.startMin !== null && <span className="dchip-time">{hhmm(e.startMin)}</span>}
      </button>
    )
  }

  return (
    <div className="dmonth">
      <div className="dm-head">
        {WD_HEAD.map((d) => (
          <span key={d}>{d}</span>
        ))}
      </div>
      <div className="dm-grid" ref={grid} style={{ gridTemplateRows: `repeat(${weeks.length}, 1fr)` }}>
        {weeks.map((week) => (
          <div className="dm-week" key={week[0]}>
            {week.map((day) => {
              const list = events.get(day) ?? []
              const shown = list.length > cap ? list.slice(0, cap - 1) : list
              const rest = list.length - shown.length
              const num = Number(day.slice(8))
              return (
                <div
                  key={day}
                  className={`dm-cell${sameMonth(day, anchor) || weeks.length === 2 ? '' : ' other'}`}
                  onClick={() => props.onSlot({ day, minutes: null })}
                  onDragOver={(ev) => ev.preventDefault()}
                  onDrop={(ev) => {
                    ev.preventDefault()
                    const id = ev.dataTransfer.getData('text/plain')
                    if (id) props.onMoveDay(id, day)
                  }}
                >
                  <span className={day === now ? 'dm-num today' : 'dm-num'}>{num === 1 ? `${num} ${MONTH_SHORT[Number(day.slice(5, 7)) - 1]}` : num}</span>
                  {shown.map(chip)}
                  {rest > 0 && (
                    <button
                      className="dchip more"
                      onClick={(ev) => {
                        ev.stopPropagation()
                        setMore(day)
                      }}
                    >
                      +{rest}
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>
      {more && (
        <>
          <div className="scrim on" onClick={() => setMore(null)} />
          <section className="dm-more" role="dialog" aria-label={formatDay(more, ctx)}>
            <h3>{formatDay(more, ctx)}</h3>
            <div className="dm-more-list">{(events.get(more) ?? []).map(chip)}</div>
          </section>
        </>
      )}
    </div>
  )
}

function DeskYear(props: DeskProps & { events: EventMap }) {
  const { ctx, anchor, events } = props
  const now = today(ctx)
  return (
    <div className="dyear">
      {yearMonths(anchor).map((first) => {
        const m = Number(first.slice(5, 7)) - 1
        return (
          <section key={first} className="dy-month">
            <button
              className="dy-name"
              onClick={() => {
                props.onAnchor(sameMonth(now, first) ? now : first)
                props.onView('month')
              }}
            >
              {MONTH_NAMES[m]}
            </button>
            <div className="dy-grid">
              {WD_YEAR.map((d) => (
                <span key={d} className="dy-wd">
                  {d}
                </span>
              ))}
              {monthGrid(first)
                .flat()
                .map((d) => {
                  const inMonth = sameMonth(d, first)
                  const n = (events.get(d) ?? []).length
                  return (
                    <button
                      key={d}
                      className={`dy-day${inMonth ? '' : ' off'}${n > 0 && inMonth ? ' has' : ''}${d === now && inMonth ? ' today' : ''}`}
                      disabled={!inMonth}
                      aria-label={formatDay(d, ctx)}
                      onClick={() => {
                        props.onAnchor(d)
                        props.onView('day')
                      }}
                    >
                      {Number(d.slice(8))}
                    </button>
                  )
                })}
            </div>
          </section>
        )
      })}
    </div>
  )
}

function DeskAgenda(props: DeskProps & { events: EventMap }) {
  const { ctx, anchor, events, colors, actions } = props
  const now = today(ctx)
  const days = useMemo(() => [...events.keys()].sort(), [events])

  if (days.length === 0) return <p className="muted dagenda-empty">На ближайшие три месяца задач нет</p>

  return (
    <div className="dagenda">
      {days.map((day) => (
        <section key={day} className="da-day">
          <div className={day === now ? 'da-date today' : 'da-date'}>
            <strong>{Number(day.slice(8))}</strong>
            <span>{WD_HEAD[weekdayIndex(day)].toLowerCase().replace('.', '')}</span>
          </div>
          <ul>
            {(events.get(day) ?? []).map((e) => (
              <li key={`${e.task.id}-${e.startMin}`}>
                <span className="da-time">{e.startMin === null ? '' : hhmm(e.startMin)}</span>
                <button className={`da-card${e.task.status === 'done' ? ' done' : ''}`} style={{ ['--c' as string]: colors[e.task.projectId] ?? 'var(--accent)' }} onClick={() => actions.open(e.task.id)}>
                  <span className="da-card-time">{e.startMin === null ? 'Весь день' : `${hhmm(e.startMin)} - ${hhmm(e.endMin ?? e.startMin)}`}</span>
                  <span>{e.task.title}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="muted dagenda-foot">{anchor === now ? 'Показаны ближайшие три месяца' : `Начиная с ${formatDay(anchor, ctx)}`}</p>
    </div>
  )
}

