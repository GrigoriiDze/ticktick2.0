import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { DateCtx, DayKey } from '../domain/dates'
import type { Group } from '../domain/groups'
import type { Task } from '../domain/types'
import { StorageService, STORAGE_KEYS } from '../platform/storage'
import type { ProjectInfo } from './Desk'
import { TaskRow, type RowActions } from './tasks/TaskRow'

export { SwipeActionsTray, SwipeCompleteTray, SwipeLeftTray, SwipeRightTray, SWIPE_WIDTH } from './tasks/SwipeTrays'
export { TaskRow, type RowActions, type TaskRowProps } from './tasks/TaskRow'

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

function loadCollapsed(): Set<string> {
  const list = StorageService.get<string[]>(STORAGE_KEYS.COLLAPSED_GROUPS, [])
  return new Set(list)
}

function saveCollapsed(set: Set<string>): void {
  StorageService.set(STORAGE_KEYS.COLLAPSED_GROUPS, [...set])
}

const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

export function TaskList({ tasks, groups, ctx, listKey, actions, forDay, projects }: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(loadCollapsed)

  // Появление новой строки анимируем, а задачи, что уже были в списке при открытии, нет
  const seen = useRef<{ key: string; ids: Set<string> } | null>(null)
  const fresh = new Set<string>()
  if (!seen.current || seen.current.key !== listKey) {
    seen.current = { key: listKey, ids: new Set(tasks.map((t) => t.id)) }
  } else {
    for (const t of tasks) if (!seen.current.ids.has(t.id)) fresh.add(t.id)
  }

  useEffect(() => {
    for (const t of tasks) seen.current?.ids.add(t.id)
  }, [tasks])

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
          el.animate([{ transform: `translateY(${was - now}px)` }, { transform: 'none' }], {
            duration: 320,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          })
        }
      }
    }
    prev.current = { order, set, tops }
  }, [tasks])

  const rows = (list: Task[]) => (
    <ul className="tasks">
      {list.map((t) => (
        <TaskRow
          key={t.id}
          task={t}
          ctx={ctx}
          fresh={fresh.has(t.id)}
          actions={actions}
          forDay={forDay}
          project={projects?.[t.projectId]}
        />
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
                setCollapsed((cur) => {
                  const next = new Set(cur)
                  if (next.has(g.key)) next.delete(g.key)
                  else next.add(g.key)
                  saveCollapsed(next)
                  return next
                })
              }}
            >
              <span className="arrow">{open ? '▾' : '▸'}</span>
              <span className="title">{g.title}</span>
              <span className="count">{g.tasks.length}</span>
            </button>
            {open && rows(g.tasks)}
          </section>
        )
      })}
    </div>
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
