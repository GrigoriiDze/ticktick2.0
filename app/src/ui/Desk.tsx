import { useState, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { dueDay, formatDue, formatRowDay, type DateCtx, type DayKey } from '../domain/dates'
import type { DeskColumn } from '../domain/deskboard'
import type { Task } from '../domain/types'
import { AlarmIcon, NoteIcon, RepeatIcon } from './icons'

/** Название и цвет списка, чтобы подписать задачу в общих списках («Сегодня», «Все») */
export type ProjectInfo = Record<string, { name: string; color: string | null }>

/** Срок как в веб-версии TickTick: сегодня время, другой день только дата */
export function deskDue(task: Task, ctx: DateCtx): { text: string; overdue: boolean; today: boolean } | null {
  const due = formatDue(task, ctx)
  if (!due || due.today) return due
  return { ...due, text: formatRowDay(dueDay(task, ctx.tz) as DayKey, ctx) }
}

/** Строка под названием задачи: срок, значки описания, повтора и напоминания, список */
export function CardMeta({ task, ctx, project }: { task: Task; ctx: DateCtx; project?: { name: string; color: string | null } }) {
  const due = deskDue(task, ctx)
  const hasNote = task.content.trim() !== ''
  const hasAlarm = Object.keys(task.reminders).length > 0
  if (!due && !hasNote && !hasAlarm && !task.repeat && !project) return null
  return (
    <span className="cm">
      {due && <span className={due.overdue ? 'cm-due over' : 'cm-due'}>{due.text}</span>}
      {hasNote && <NoteIcon size={14} />}
      {task.repeat && <RepeatIcon size={14} />}
      {hasAlarm && <AlarmIcon size={14} />}
      {project && (
        <span className="cm-list">
          {project.color && <i style={{ background: project.color }} />}
          {project.name}
        </span>
      )}
    </span>
  )
}

/** Карточка задачи на доске, как в веб-версии TickTick: флажок, название, ниже срок и значки */
export function DeskCard(props: { task: Task; ctx: DateCtx; project?: { name: string; color: string | null }; onToggle: (t: Task) => void; onOpen: (id: string) => void; extra?: ReactNode; onPointerDown?: (e: ReactPointerEvent<HTMLLIElement>) => void }) {
  const { task, ctx } = props
  const [leaving, setLeaving] = useState(false)
  return (
    <li className={leaving ? 'dk-card leaving' : 'dk-card'} data-card={task.id} onPointerDown={props.onPointerDown}>
      <input
        type="checkbox"
        className={`p${task.priority}`}
        checked={leaving}
        onChange={() => {
          setLeaving(true)
          window.setTimeout(() => props.onToggle(task), 240)
        }}
        aria-label={task.title}
      />
      <button className="dk-body" onClick={() => props.onOpen(task.id)}>
        <span className="dk-title">{task.title}</span>
        <CardMeta task={task} ctx={ctx} project={props.project} />
      </button>
      {props.extra}
    </li>
  )
}

const Triangle = ({ open }: { open: boolean }) => (
  <svg className={open ? 'tri open' : 'tri'} width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
    <path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/** Сворачиваемая подсекция: треугольник, название, число задач */
export function SectionHead({ title, count, open, onToggle, extra }: { title: string; count: number; open: boolean; onToggle: () => void; extra?: ReactNode }) {
  return (
    <div className="dk-sec">
      <button className="dk-sec-btn" onClick={onToggle} aria-expanded={open}>
        <Triangle open={open} />
        <span className="dk-sec-title">{title}</span>
        <span className="dk-count">{count}</span>
      </button>
      {extra}
    </div>
  )
}

/** Доска умного списка на большом экране: колонки по спискам («Сегодня») или по дням («7 дней») */
export function DeskBoard(props: { columns: DeskColumn[]; ctx: DateCtx; projects: ProjectInfo; showProject: boolean; onToggle: (t: Task) => void; onOpen: (id: string) => void; onAdd: (projectId: string | null, day: DayKey | null) => void }) {
  const [closed, setClosed] = useState<Set<string>>(new Set())
  const flip = (k: string) => setClosed((s) => {
    const n = new Set(s)
    if (n.has(k)) n.delete(k)
    else n.add(k)
    return n
  })
  return (
    <div className="dk-board">
      {props.columns.map((col) => (
        <section key={col.key} className="dk-col" aria-label={col.title}>
          <div className="dk-col-head">
            <h5>{col.title}</h5>
            <span className="dk-count">{col.count}</span>
            {col.key !== 'overdue' && (
              <button className="dk-icon" onClick={() => props.onAdd(col.projectId, col.day)} aria-label={`Добавить задачу в «${col.title}»`}>
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path d="M9 3v12M3 9h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>
          <div className="dk-col-body">
            {col.sections.map((s) => {
              const k = `${col.key}/${s.key}`
              const open = !closed.has(k)
              return (
                <div key={s.key}>
                  {s.title && <SectionHead title={s.title} count={s.tasks.length} open={open} onToggle={() => flip(k)} />}
                  {open && (
                    <ul className="dk-cards">
                      {s.tasks.map((t) => (
                        <DeskCard key={t.id} task={t} ctx={props.ctx} project={props.showProject ? props.projects[t.projectId] : undefined} onToggle={props.onToggle} onOpen={props.onOpen} />
                      ))}
                    </ul>
                  )}
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

/** Значки бокового меню на большом экране. Нарисованы для этого приложения */
const s = { width: 20, height: 20, viewBox: '0 0 20 20', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
export const SideIcon = {
  all: () => (
    <svg {...s}>
      <rect x="3" y="6" width="14" height="10.5" rx="2.5" />
      <path d="M5.5 3.5h9" />
    </svg>
  ),
  today: (day: number) => (
    <svg {...s}>
      <rect x="2.75" y="3.5" width="14.5" height="13.5" rx="2.5" />
      <text x="10" y="14" textAnchor="middle" fontSize="7.5" fontWeight="700" fill="currentColor" stroke="none">
        {day}
      </text>
    </svg>
  ),
  week: () => (
    <svg {...s}>
      <rect x="2.75" y="3.5" width="14.5" height="13.5" rx="2.5" />
      <path d="M6 8.5h8M6 11.5h5M6 14h3" />
    </svg>
  ),
  inbox: () => (
    <svg {...s}>
      <path d="M3 11l2-6.5h10L17 11v4a1.8 1.8 0 0 1-1.8 1.8H4.8A1.8 1.8 0 0 1 3 15z" />
      <path d="M3 11h4l1 1.8h4l1-1.8h4" />
    </svg>
  ),
  priority: () => (
    <svg {...s}>
      <path d="M4 17V3M4 4h9l-1.5 4L13 12H4" fill="#e5484d" stroke="#e5484d" strokeWidth="1.2" />
    </svg>
  ),
  nodate: () => (
    <svg {...s}>
      <rect x="2.75" y="3.5" width="14.5" height="13.5" rx="2.5" />
      <path d="M6 10.5h8" strokeWidth="1.5" />
    </svg>
  ),
  list: () => (
    <svg {...s}>
      <path d="M3.5 5.5h13M3.5 10h13M3.5 14.5h13" />
    </svg>
  ),
  done: () => (
    <svg {...s}>
      <rect x="3" y="3" width="14" height="14" rx="3" />
      <path d="M6.8 10.2l2.2 2.2 4.2-4.6" />
    </svg>
  ),
  wontdo: () => (
    <svg {...s}>
      <rect x="3" y="3" width="14" height="14" rx="3" />
      <path d="M7.5 7.5l5 5M12.5 7.5l-5 5" />
    </svg>
  ),
  trash: () => (
    <svg {...s}>
      <path d="M4 5.5h12M8 5.5V4h4v1.5M5.5 5.5l.8 11h7.4l.8-11M8.5 8.5v5M11.5 8.5v5" />
    </svg>
  ),
  tag: () => (
    <svg {...s}>
      <path d="M3.5 10.2V4.5a1 1 0 0 1 1-1h5.7l6.3 6.3-6.7 6.7z" />
      <circle cx="7" cy="7" r="1.2" />
    </svg>
  ),
  folder: () => (
    <svg {...s}>
      <path d="M3 6a1.5 1.5 0 0 1 1.5-1.5h3.3l1.6 1.8h6.1A1.5 1.5 0 0 1 17 7.8v7.2a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 3 15z" />
    </svg>
  ),
}
export { Triangle }
