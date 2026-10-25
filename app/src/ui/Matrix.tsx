import { useState, useMemo, type FormEvent } from 'react'
import { formatDue, type DateCtx } from '../domain/dates'
import { buildMatrix, QUADRANTS, type Quadrant } from '../domain/matrix'
import type { Task } from '../domain/types'

interface Props {
  tasks: Task[]
  ctx: DateCtx
  onToggle: (task: Task) => void
  onOpen: (id: string) => void
  onAdd?: (title: string, quadrant: Quadrant) => void
  onMoveQuadrant?: (taskId: string, target: Quadrant) => void
}

/** Быстрое добавление задачи прямо в нужный квадрант матрицы */
function QuadrantAddBar({
  onAdd,
  placeholder,
}: {
  onAdd: (title: string) => void
  placeholder: string
}) {
  const [text, setText] = useState('')
  const [active, setActive] = useState(false)

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    onAdd(text.trim())
    setText('')
  }

  return (
    <form className={`mx-addbar${active ? ' on' : ''}`} onSubmit={submit}>
      <span className="mx-add-plus" aria-hidden="true">
        +
      </span>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => setActive(true)}
        onBlur={() => !text && setActive(false)}
        placeholder={placeholder}
        aria-label={placeholder}
      />
    </form>
  )
}

/** Матрица Эйзенхауэра: четыре квадранта с drag-and-drop и быстрым добавлением */
export function Matrix({ tasks, ctx, onToggle, onOpen, onAdd, onMoveQuadrant }: Props) {
  const cells = useMemo(() => buildMatrix(tasks, ctx), [tasks, ctx])
  const [dragOverQuadrant, setDragOverQuadrant] = useState<Quadrant | null>(null)

  return (
    <div className="matrix">
      {QUADRANTS.map((q) => {
        const list = cells[q.id]
        const isOver = dragOverQuadrant === q.id
        return (
          <section
            key={q.id}
            className={`mx-cell ${q.id}${isOver ? ' drag-over' : ''}`}
            aria-label={q.title}
            onDragOver={(e) => {
              e.preventDefault()
              if (dragOverQuadrant !== q.id) setDragOverQuadrant(q.id)
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setDragOverQuadrant(null)
              }
            }}
            onDrop={(e) => {
              e.preventDefault()
              setDragOverQuadrant(null)
              const id = e.dataTransfer.getData('text/plain')
              if (id && onMoveQuadrant) {
                onMoveQuadrant(id, q.id)
              }
            }}
          >
            <header className="mx-head">
              <div className="mx-head-info">
                <span className="mx-indicator" />
                <strong className="mx-title-text">{q.title}</strong>
                <span className="mx-hint-text">{q.hint}</span>
              </div>
              <span className="mx-badge">{list.length || ''}</span>
            </header>

            {onAdd && (
              <QuadrantAddBar
                onAdd={(title) => onAdd(title, q.id)}
                placeholder={`Добавить в «${q.title}»`}
              />
            )}

            <div className="mx-list-wrap">
              {list.length === 0 ? (
                <div className="mx-empty">
                  <span>Нет задач</span>
                </div>
              ) : (
                <ul className="tasks mx-tasks">
                  {list.map((t) => {
                    const due = formatDue(t, ctx)
                    return (
                      <li
                        key={t.id}
                        className="mx-task-item"
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', t.id)
                          e.dataTransfer.effectAllowed = 'move'
                        }}
                      >
                        <input
                          type="checkbox"
                          className={`p${t.priority}`}
                          checked={false}
                          onChange={() => onToggle(t)}
                          aria-label={t.title}
                        />
                        <button className="mx-title" onClick={() => onOpen(t.id)}>
                          <span className="mx-task-title">{t.title}</span>
                          {due && <small className={due.overdue ? 'due over' : 'due'}>{due.text}</small>}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </section>
        )
      })}
    </div>
  )
}
