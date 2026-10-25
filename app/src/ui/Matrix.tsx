import { useMemo } from 'react'
import { formatDue, type DateCtx } from '../domain/dates'
import { buildMatrix, QUADRANTS } from '../domain/matrix'
import type { Task } from '../domain/types'

interface Props {
  tasks: Task[]
  ctx: DateCtx
  onToggle: (task: Task) => void
  onOpen: (id: string) => void
}

/** Матрица Эйзенхауэра: четыре клетки по важности (приоритет) и срочности (срок сегодня или раньше) */
export function Matrix({ tasks, ctx, onToggle, onOpen }: Props) {
  const cells = useMemo(() => buildMatrix(tasks, ctx), [tasks, ctx])
  return (
    <div className="matrix">
      {QUADRANTS.map((q) => (
        <section key={q.id} className={`mx-cell ${q.id}`} aria-label={q.title}>
          <header>
            <strong>{q.title}</strong>
            <span className="muted">{cells[q.id].length || ''}</span>
          </header>
          <ul className="tasks">
            {cells[q.id].map((t) => {
              const due = formatDue(t, ctx)
              return (
                <li key={t.id}>
                  <input type="checkbox" className={`p${t.priority}`} checked={false} onChange={() => onToggle(t)} aria-label={t.title} />
                  <button className="mx-title" onClick={() => onOpen(t.id)}>
                    <span>{t.title}</span>
                    {due && <small className={due.overdue ? 'due over' : 'due'}>{due.text}</small>}
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}
