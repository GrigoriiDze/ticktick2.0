import { useEffect, useMemo, useRef, useState } from 'react'
import {
  DESKTOP_VIEWS,
  eventsByDay,
  monthGrid,
  sameMonth,
  shiftAnchor,
  threeDays,
  twoWeeks,
  weekDays,
  weekdayIndex,
  yearMonths,
  calTitle,
  type CalEvent,
  type CalView,
} from '../domain/calendar'
import { addDays, formatDay, today, type DateCtx, type DayKey } from '../domain/dates'
import type { Habit, HabitCheckin, Project, Task } from '../domain/types'
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
  sideOpen?: boolean
  projects?: Project[]
  habits?: Habit[]
  checkins?: HabitCheckin[]
}

/** Шапка календаря на большом экране: переключение панели, название периода, «+», выбор вида, переход по периодам */
export function DeskCalHeader(props: {
  view: CalView
  anchor: DayKey
  ctx: DateCtx
  showDone: boolean
  sideOpen?: boolean
  onToggleSide?: () => void
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
      {props.onToggleSide && (
        <button
          className="round side-toggle"
          onClick={props.onToggleSide}
          aria-label={props.sideOpen ? 'Скрыть панель' : 'Показать панель'}
          title={props.sideOpen ? 'Скрыть панель' : 'Показать панель'}
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M3 5h10M3 10h7M3 15h10" />
            <path d={props.sideOpen ? 'M17 7.5L14.5 10l2.5 2.5' : 'M14.5 7.5L17 10l-2.5 2.5'} />
          </svg>
        </button>
      )}
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

/** Мини-календарь в левой панели десктопного календаря */
function MiniCalendar({
  anchor,
  ctx,
  onAnchor,
}: {
  anchor: DayKey
  ctx: DateCtx
  onAnchor: (day: DayKey) => void
}) {
  const [miniMonth, setMiniMonth] = useState<DayKey>(anchor)
  useEffect(() => {
    if (!sameMonth(anchor, miniMonth)) {
      setMiniMonth(anchor)
    }
  }, [anchor])

  const now = today(ctx)
  const weeks = useMemo(() => monthGrid(miniMonth), [miniMonth])
  const m = Number(miniMonth.slice(5, 7)) - 1
  const year = miniMonth.slice(0, 4)

  return (
    <div className="dmini">
      <div className="dmini-head">
        <span className="dmini-title">{MONTH_NAMES[m]} {year}</span>
        <div className="dmini-nav">
          <button
            type="button"
            className="dmini-btn"
            onClick={() => setMiniMonth(shiftAnchor('month', miniMonth, -1))}
            aria-label="Предыдущий месяц"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            className="dmini-btn"
            onClick={() => setMiniMonth(shiftAnchor('month', miniMonth, 1))}
            aria-label="Следующий месяц"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
      <div className="dmini-wd">
        {['П', 'В', 'С', 'Ч', 'П', 'С', 'В'].map((wd, i) => (
          <span key={i} className="dmini-wd-col">{wd}</span>
        ))}
      </div>
      <div className="dmini-grid">
        {weeks.flat().map((day) => {
          const inMonth = sameMonth(day, miniMonth)
          const isSel = day === anchor
          const isToday = day === now
          return (
            <button
              type="button"
              key={day}
              className={`dmini-cell${inMonth ? '' : ' off'}${isSel ? ' sel' : ''}${isToday ? ' today' : ''}`}
              onClick={() => onAnchor(day)}
              aria-label={formatDay(day, ctx)}
            >
              <span>{Number(day.slice(8))}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Фильтр списков задач в левой панели */
function ProjectsFilter({
  projects,
  colors,
  tasks,
  visibleProjects,
  onToggleProject,
  onToggleAll,
}: {
  projects: Project[]
  colors: Record<string, string>
  tasks: Task[]
  visibleProjects: Set<string> | null
  onToggleProject: (projectId: string) => void
  onToggleAll: (selectAll: boolean) => void
}) {
  const taskCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const t of tasks) {
      if (t.status === 'open' && (t.start || t.due)) {
        counts[t.projectId] = (counts[t.projectId] ?? 0) + 1
      }
    }
    return counts
  }, [tasks])

  const allSelected = visibleProjects === null || projects.every((p) => visibleProjects.has(p.id))

  return (
    <div className="dcal-proj-sec">
      <div className="dcal-proj-head">
        <span className="dcal-proj-title">Списки</span>
        <button
          type="button"
          className="dcal-proj-all-btn"
          onClick={() => onToggleAll(!allSelected)}
        >
          {allSelected ? 'Снять все' : 'Выбрать все'}
        </button>
      </div>
      <div className="dcal-proj-list">
        {projects.map((p) => {
          const checked = visibleProjects === null || visibleProjects.has(p.id)
          const color = colors[p.id] || p.color || 'var(--accent)'
          const count = taskCounts[p.id] ?? 0
          return (
            <label key={p.id} className="dcal-proj-item">
              <input
                type="checkbox"
                checked={checked}
                onChange={() => onToggleProject(p.id)}
              />
              <span className="dcal-proj-dot" style={{ backgroundColor: color }} />
              <span className="dcal-proj-name">{p.name}</span>
              {count > 0 && <span className="dcal-proj-count">{count}</span>}
            </label>
          )
        })}
      </div>
    </div>
  )
}

/** Календарь для большого экрана: боковая панель + сетка */
export function CalendarDesktop(props: DeskProps) {
  const { tasks, ctx, view, anchor, showDone, sideOpen = true } = props

  const [visibleProjects, setVisibleProjects] = useState<Set<string> | null>(() => {
    try {
      const raw = localStorage.getItem('cal-filter-projects')
      return raw ? new Set(JSON.parse(raw)) : null
    } catch {
      return null
    }
  })

  function toggleProject(projectId: string) {
    setVisibleProjects((prev) => {
      const allIds = (props.projects ?? []).map((p) => p.id)
      const current = prev ? new Set(prev) : new Set(allIds)
      if (current.has(projectId)) {
        current.delete(projectId)
      } else {
        current.add(projectId)
      }
      try {
        localStorage.setItem('cal-filter-projects', JSON.stringify([...current]))
      } catch {}
      return current
    })
  }

  function toggleAll(selectAll: boolean) {
    const allIds = (props.projects ?? []).map((p) => p.id)
    const next = selectAll ? new Set(allIds) : new Set<string>()
    setVisibleProjects(next)
    try {
      localStorage.setItem('cal-filter-projects', JSON.stringify([...next]))
    } catch {}
  }

  const filteredTasks = useMemo(() => {
    if (!visibleProjects) return tasks
    return tasks.filter((t) => visibleProjects.has(t.projectId))
  }, [tasks, visibleProjects])

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

  const events = useMemo(() => eventsByDay(filteredTasks, ctx, range[0], range[1], showDone), [filteredTasks, ctx, range, showDone])

  const renderContent = () => {
    if (view === 'year') return <DeskYear {...props} tasks={filteredTasks} events={events} />
    if (view === 'agenda') return <DeskAgenda {...props} tasks={filteredTasks} events={events} />
    if (view === 'week' || view === 'day' || view === 'days3') {
      const days = view === 'week' ? weekDays(anchor) : view === 'days3' ? threeDays(anchor) : [anchor]
      return (
        <div className="dcal-time">
          <TimeGrid {...props} tasks={filteredTasks} days={days} events={events} />
        </div>
      )
    }
    const weeks = view === 'weeks2' ? twoWeeks(anchor) : monthGrid(props.anchor)
    return <DeskMonth {...props} tasks={filteredTasks} weeks={weeks} events={events} />
  }

  return (
    <div className="dcal-root">
      {sideOpen && (
        <aside className="dcal-side">
          <MiniCalendar anchor={anchor} ctx={ctx} onAnchor={props.onAnchor} />
          {props.projects && props.projects.length > 0 && (
            <ProjectsFilter
              projects={props.projects}
              colors={props.colors}
              tasks={tasks}
              visibleProjects={visibleProjects}
              onToggleProject={toggleProject}
              onToggleAll={toggleAll}
            />
          )}
        </aside>
      )}
      <div className="dcal-content">{renderContent()}</div>
    </div>
  )
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

  const habitMap = useMemo(() => new Map((props.habits ?? []).map((h) => [h.id, h])), [props.habits])
  const dayCheckins = useMemo(() => {
    const map = new Map<DayKey, Habit[]>()
    if (!props.checkins) return map
    for (const c of props.checkins) {
      if (c.status !== 'done') continue
      const h = habitMap.get(c.habitId)
      if (!h) continue
      const arr = map.get(c.day) ?? []
      arr.push(h)
      map.set(c.day, arr)
    }
    return map
  }, [props.checkins, habitMap])

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
              const doneHabits = dayCheckins.get(day)
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
                  <div className="dm-cell-top">
                    <span className={day === now ? 'dm-num today' : 'dm-num'}>
                      {num === 1 ? `${num} ${MONTH_SHORT[Number(day.slice(5, 7)) - 1]}` : num}
                    </span>
                    {doneHabits && doneHabits.length > 0 && (
                      <div className="dm-habits" title={`Привычки: ${doneHabits.map((h) => h.name).join(', ')}`}>
                        {doneHabits.slice(0, 3).map((h) => (
                          <span key={h.id} className="dm-hdot" style={{ backgroundColor: h.color || 'var(--accent)' }} />
                        ))}
                        {doneHabits.length > 3 && (
                          <span className="dm-hmore">+{doneHabits.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
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
