import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent } from 'react'
import { dueDay, formatDue, hasTime, timeOf, type DateCtx, type DayKey } from '../domain/dates'
import { checklistProgress } from '../domain/extras'
import type { Group } from '../domain/groups'
import type { Task } from '../domain/types'
import { isStuck, waitingLabel } from '../domain/waiting'
import { deskDue, type ProjectInfo } from './Desk'
import { AlarmIcon, CalendarIcon, NoteIcon, PinIcon, RepeatIcon, SkipIcon, TrashIcon } from './icons'

/** Что можно сделать с задачей прямо из списка */
export interface RowActions {
  toggle: (task: Task) => void
  open: (id: string) => void
  skip: (task: Task) => void
  remove: (task: Task) => void
  reschedule: (task: Task) => void
  menu: (task: Task) => void
}

interface Props {
  tasks: Task[]
  groups: Group[] | null
  ctx: DateCtx
  /** Меняется при переходе на другой список: тогда задачи, уже лежавшие в нём, не считаются новыми */
  listKey: string
  actions: RowActions
  /** Список одного дня (в календаре): справа только время, дата не нужна, повторы показываются со своим временем */
  forDay?: DayKey
  /** Большой экран, общий список: справа подпись списка, слева полоска его цвета */
  projects?: ProjectInfo
}

const COLLAPSED_KEY = 'collapsed-groups'

function loadCollapsed(): Set<string> {
  try {
    const raw = localStorage.getItem(COLLAPSED_KEY)
    if (raw) return new Set(JSON.parse(raw) as string[])
  } catch {
    // хранилище недоступно, секции раскрыты
  }
  return new Set()
}

function saveCollapsed(set: Set<string>): void {
  try {
    localStorage.setItem(COLLAPSED_KEY, JSON.stringify([...set]))
  } catch {
    // не страшно
  }
}

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function TaskList({ tasks, groups, ctx, listKey, actions, forDay, projects }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(loadCollapsed)

  // Появление новой строки анимируем, а задачи, что уже были в списке при открытии, нет
  const seen = useRef<{ key: string; ids: Set<string> } | null>(null)
  const fresh = new Set<string>()
  if (!seen.current || seen.current.key !== listKey) seen.current = { key: listKey, ids: new Set(tasks.map((t) => t.id)) }
  else for (const t of tasks) if (!seen.current.ids.has(t.id)) fresh.add(t.id)
  useEffect(() => {
    for (const t of tasks) seen.current?.ids.add(t.id)
  })

  // Когда порядок строк поменялся (сортировка, правка срока), они плавно переезжают на новые места
  const root = useRef<HTMLDivElement>(null)
  const prev = useRef<{ order: string; set: string; tops: Map<string, number> } | null>(null)
  useLayoutEffect(() => {
    const els = [...(root.current?.querySelectorAll<HTMLElement>('li[data-id]') ?? [])]
    const ids = els.map((e) => e.dataset.id as string)
    const tops = new Map(els.map((e) => [e.dataset.id as string, e.offsetTop]))
    const order = ids.join('|')
    const set = [...ids].sort().join('|')
    const before = prev.current
    if (before && before.set === set && before.order !== order && !reduceMotion()) {
      for (const el of els) {
        const was = before.tops.get(el.dataset.id as string)
        const now = tops.get(el.dataset.id as string)
        if (was !== undefined && now !== undefined && Math.abs(was - now) > 1) {
          el.animate([{ transform: `translateY(${was - now}px)` }, { transform: 'none' }], { duration: 320, easing: 'cubic-bezier(0.22, 1, 0.36, 1)' })
        }
      }
    }
    prev.current = { order, set, tops }
  })

  const rows = (list: Task[]) => (
    <ul className="tasks">
      {list.map((t) => (
        <TaskRow key={t.id} task={t} ctx={ctx} fresh={fresh.has(t.id)} actions={actions} forDay={forDay} project={projects?.[t.projectId]} />
      ))}
    </ul>
  )

  if (!groups) return <div ref={root} style={{ display: 'contents' }}>{rows(tasks)}</div>

  return (
    <div ref={root} style={{ display: 'contents' }}>
      {groups.map((g) => {
        const open = !collapsed.has(g.key)
        return (
          <section key={g.key} className="group">
            <button
              className="group-head"
              aria-expanded={open}
              onClick={() => {
                const next = new Set(collapsed)
                if (open) next.add(g.key)
                else next.delete(g.key)
                setCollapsed(next)
                saveCollapsed(next)
              }}
            >
              <span className="group-title">{g.title}</span>
              <span className="group-meta">
                {g.tasks.length}
                <svg className={open ? 'chev open' : 'chev'} width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
            </button>
            {open && rows(g.tasks)}
          </section>
        )
      })}
    </div>
  )
}

/** Ширина трёх кнопок за свайпом: «не буду делать», «удалить», «дата» */
const SWIPE_WIDTH = 188
const LONG_PRESS_MS = 480

function TaskRow(props: { task: Task; ctx: DateCtx; fresh: boolean; actions: RowActions; forDay?: DayKey; project?: { name: string; color: string | null } }) {
  const { task, ctx, actions } = props
  const done = task.status !== 'open'
  const label = props.forDay ? dayRowLabel(task, props.forDay, ctx) : props.project ? deskDue(task, ctx) : formatDue(task, ctx)
  const wait = task.waiting ? { text: waitingLabel(task.waiting, ctx), stuck: isStuck(task, ctx) } : null
  const progress = checklistProgress(task.items)
  const hasNote = task.content.trim() !== ''
  const hasAlarm = Object.keys(task.reminders).length > 0

  // Перед закрытием строка успевает показать галочку и плавно уйти
  const [leaving, setLeaving] = useState(false)
  useEffect(() => setLeaving(false), [task.status, task.due])

  function toggle() {
    if (reduceMotion()) {
      actions.toggle(task)
      return
    }
    setLeaving(true)
    window.setTimeout(() => actions.toggle(task), 260)
  }

  // Свайп влево открывает кнопки, долгое нажатие открывает меню задачи
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const li = useRef<HTMLLIElement>(null)
  const drag = useRef<{ x: number; y: number; base: number; moved: boolean; timer: number | undefined } | null>(null)
  const ignoreClick = useRef(false)
  const gesturesOn = !done

  useEffect(() => {
    if (offset === 0) return
    const close = (e: Event) => {
      if (!li.current?.contains(e.target as Node)) setOffset(0)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [offset])

  const swallowClick = () => {
    ignoreClick.current = true
    window.setTimeout(() => (ignoreClick.current = false), 60)
  }

  function down(e: PointerEvent) {
    if (!gesturesOn || (e.target as HTMLElement).closest('input,.swipe-actions')) return
    const timer = window.setTimeout(() => {
      if (drag.current && !drag.current.moved) {
        drag.current = null
        swallowClick()
        actions.menu(task)
      }
    }, LONG_PRESS_MS)
    drag.current = { x: e.clientX, y: e.clientY, base: offset, moved: false, timer }
  }

  function move(e: PointerEvent) {
    const d = drag.current
    if (!d) return
    const dx = e.clientX - d.x
    const dy = e.clientY - d.y
    if (!d.moved) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
      window.clearTimeout(d.timer)
      if (Math.abs(dy) > Math.abs(dx)) {
        drag.current = null
        return
      }
      d.moved = true
      setDragging(true)
      ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    }
    setOffset(Math.max(-SWIPE_WIDTH, Math.min(0, d.base + dx)))
  }

  function up() {
    const d = drag.current
    drag.current = null
    if (!d) return
    window.clearTimeout(d.timer)
    if (d.moved) {
      swallowClick()
      setDragging(false)
      setOffset((o) => (o < -SWIPE_WIDTH / 2 ? -SWIPE_WIDTH : 0))
    }
  }

  function open() {
    if (ignoreClick.current) return
    if (offset !== 0) setOffset(0)
    else actions.open(task.id)
  }

  const run = (fn: (t: Task) => void) => () => {
    setOffset(0)
    fn(task)
  }

  const side = label || hasNote || hasAlarm || task.repeat || task.pinnedAt !== null || props.project
  const hasMeta = Boolean(wait || progress.total > 0 || task.tags.length > 0)
  const isLarge = hasMeta || Boolean(side)
  const isSubtask = Boolean(task.parentId)

  const cls = [
    done ? 'done' : '',
    leaving ? 'leaving' : '',
    props.fresh ? 'enter' : '',
    task.status === 'wontdo' ? 'skipped' : '',
    isSubtask ? 'subtask' : '',
    isLarge ? 'row-large' : '',
  ].filter(Boolean).join(' ')

  return (
    <li className={cls} ref={li} data-id={task.id} onContextMenu={(e) => (gesturesOn ? (e.preventDefault(), actions.menu(task)) : undefined)}>
      {props.project?.color && <i className="row-bar" style={{ background: props.project.color }} aria-hidden="true" />}
      {gesturesOn && (
        <div className="swipe-actions" aria-hidden={offset === 0}>
          <button className="sw sw-skip" onClick={run(actions.skip)} aria-label="Не буду делать" tabIndex={offset === 0 ? -1 : 0}>
            <SkipIcon size={22} />
          </button>
          <button className="sw sw-del" onClick={run(actions.remove)} aria-label="Удалить" tabIndex={offset === 0 ? -1 : 0}>
            <TrashIcon size={22} />
          </button>
          <button className="sw sw-date" onClick={run(actions.reschedule)} aria-label="Перенести" tabIndex={offset === 0 ? -1 : 0}>
            <CalendarIcon size={22} />
          </button>
        </div>
      )}
      <div
        className={dragging ? 'row-front dragging' : 'row-front'}
        style={offset ? { transform: `translateX(${offset}px)` } : undefined}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        <input type="checkbox" className={`p${task.priority}`} checked={leaving ? !done : done} onChange={toggle} aria-label={task.title} />
        <button className="row-main" onClick={open}>
          <span className="row-text">
            <span className="title">{task.title}</span>
            {(wait || progress.total > 0 || task.tags.length > 0) && (
              <span className="meta">
                {wait && <span className={wait.stuck ? 'due over' : 'due muted-due'}>{wait.text}</span>}
                {progress.total > 0 && (
                  <span className="due muted-due">
                    {progress.done}/{progress.total}
                  </span>
                )}
                {task.tags.map((t) => (
                  <span key={t} className="tag">
                    #{t}
                  </span>
                ))}
              </span>
            )}
          </span>
          {side && (
            <span className="row-side">
              {props.project && <span className="row-list">{props.project.name}</span>}
              {label &&<span className={label.overdue ? 'due over' : label.today ? 'due today' : 'due'}>{label.text}</span>}
              {(hasNote || hasAlarm || task.repeat || task.pinnedAt !== null) && (
                <span className="row-icons">
                  {task.pinnedAt !== null && <PinIcon size={16} />}
                  {hasNote && <NoteIcon size={16} />}
                  {hasAlarm && <AlarmIcon size={16} />}
                  {task.repeat && <RepeatIcon size={16} />}
                </span>
              )}
            </span>
          )}
        </button>
      </div>
    </li>
  )
}

/** Пустой список: свой рисунок и две строки */
export function Empty({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="empty">
      <svg width="120" height="96" viewBox="0 0 120 96" aria-hidden="true">
        <ellipse cx="60" cy="84" rx="38" ry="6" fill="currentColor" opacity="0.12" />
        <rect x="26" y="26" width="68" height="50" rx="10" fill="none" stroke="currentColor" strokeWidth="3" opacity="0.5" />
        <path d="M26 54h20l5 8h18l5-8h20" fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" opacity="0.5" />
        <path d="M52 14l8 -6 8 6" fill="none" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <strong>{title}</strong>
      {hint && <span className="muted">{hint}</span>}
    </div>
  )
}

/** Подпись справа в списке одного дня: время, если оно есть, у закрытых серых. Просрочку считаем только для самого срока задачи */
function dayRowLabel(task: Task, day: DayKey, ctx: DateCtx): { text: string; overdue: boolean; today: boolean } | null {
  if (!hasTime(task)) return null
  const own = dueDay(task, ctx.tz) === day
  const time = timeOf(task.due as number, ctx.tz)
  return { text: time, overdue: own && task.status === 'open' && (task.due as number) < ctx.now, today: false }
}
