import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { dueDay, formatDue, today, type DateCtx } from '../domain/dates'
import { buildMatrix, QUADRANTS, type Quadrant } from '../domain/matrix'
import type { Task } from '../domain/types'
import { ChevronLeft } from './icons'

interface Props {
  tasks: Task[]
  ctx: DateCtx
  onToggle: (task: Task) => void
  onOpen: (id: string) => void
  onAdd?: (title: string, quadrant: Quadrant) => void
  onMoveQuadrant?: (taskId: string, target: Quadrant) => void
}

const ROMAN_MAP: Record<Quadrant, string> = {
  q1: 'I',
  q2: 'II',
  q3: 'III',
  q4: 'IV',
}

const MOBILE_TITLES: Record<Quadrant, string> = {
  q1: 'Срочно и важно',
  q2: 'Не срочно, но важно',
  q3: 'Срочно, но не важно',
  q4: 'Не срочно и не важно',
}

/** Быстрое добавление задачи прямо в нужный квадрант матрицы (для десктопа) */
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

/**
 * Матрица Эйзенхауэра 1-в-1 по photo_9, photo_10, photo_11 и item_custom_grid_project.xml / activity_matrix_detail_list.xml.
 * Нажатие на заголовок квадранта (или пустую область) открывает полноэкранный список квадранта как на photo_11.
 */
export function Matrix({ tasks, ctx, onToggle, onOpen, onAdd, onMoveQuadrant }: Props) {
  const cells = useMemo(() => buildMatrix(tasks, ctx), [tasks, ctx])
  const [dragOverQuadrant, setDragOverQuadrant] = useState<Quadrant | null>(null)
  const [detailQuadrant, setDetailQuadrant] = useState<Quadrant | null>(null)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickTitle, setQuickTitle] = useState('')

  useEffect(() => {
    if (!detailQuadrant && !quickAddOpen) return
    const onBack = (e: Event) => {
      if (quickAddOpen) {
        e.preventDefault()
        setQuickAddOpen(false)
        return
      }
      if (detailQuadrant) {
        e.preventDefault()
        setDetailQuadrant(null)
      }
    }
    window.addEventListener('tt-back-request', onBack)
    return () => window.removeEventListener('tt-back-request', onBack)
  }, [detailQuadrant, quickAddOpen])

  // Полноэкранный список квадранта (photo_11_2026-10-25_21-29-46.jpg)
  if (detailQuadrant) {
    const qList = cells[detailQuadrant]
    const qTitle = MOBILE_TITLES[detailQuadrant]
    const nowDay = today(ctx)
    const todayGroup = qList.filter((t) => {
      const d = dueDay(t, ctx.tz)
      return d !== null && d <= nowDay
    })
    const laterGroup = qList.filter((t) => {
      const d = dueDay(t, ctx.tz)
      return d !== null && d > nowDay
    })
    const noDateGroup = qList.filter((t) => dueDay(t, ctx.tz) === null)

    const sections = [
      ...(todayGroup.length > 0 ? [{ id: 'today', title: 'Сегодня', items: todayGroup }] : []),
      ...(laterGroup.length > 0 ? [{ id: 'later', title: 'Предстоящие', items: laterGroup }] : []),
      ...(noDateGroup.length > 0 ? [{ id: 'nodate', title: 'Нет даты', items: noDateGroup }] : []),
    ]

    return (
      <div className="mx-detail-screen">
        <header className="mx-detail-head">
          <button
            type="button"
            className="mx-detail-back"
            onClick={() => setDetailQuadrant(null)}
            aria-label="Назад к матрице"
          >
            <ChevronLeft size={24} />
          </button>
          <h2 className="mx-detail-title">{qTitle}</h2>
          <button
            type="button"
            className="mx-detail-more"
            onClick={() => setQuickAddOpen(true)}
            aria-label="Ещё"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5.5" r="1.8" />
              <circle cx="12" cy="12" r="1.8" />
              <circle cx="12" cy="18.5" r="1.8" />
            </svg>
          </button>
        </header>

        <div className="mx-detail-body">
          {sections.length === 0 ? (
            <div className="mx-detail-empty">Нет задач</div>
          ) : (
            sections.map((sec) => (
              <div key={sec.id} className="mx-detail-group-card">
                <div className="mx-detail-group-head">
                  <strong>{sec.title}</strong>
                  <span>{sec.items.length} ⌄</span>
                </div>
                <ul className="mx-detail-list">
                  {sec.items.map((t) => {
                    const due = formatDue(t, ctx)
                    return (
                      <li key={t.id} className="mx-detail-row">
                        <input
                          type="checkbox"
                          className={`p${t.priority}`}
                          checked={false}
                          onChange={() => onToggle(t)}
                          aria-label={t.title}
                        />
                        <button type="button" className="mx-detail-row-main" onClick={() => onOpen(t.id)}>
                          <span className="mx-detail-row-title">{t.title}</span>
                          {due && (
                            <span className={due.overdue ? 'mx-detail-row-due over' : 'mx-detail-row-due'}>
                              {due.text}
                            </span>
                          )}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ))
          )}
        </div>

        {onAdd && (
          <button
            type="button"
            className="primary fab"
            onClick={() => setQuickAddOpen(true)}
            aria-label="Добавить задачу в квадрант"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
        )}

        {quickAddOpen && onAdd && (
          <div className="tt-modal-backdrop" onClick={() => setQuickAddOpen(false)}>
            <form
              className="tt-modal-sheet"
              onClick={(e) => e.stopPropagation()}
              onSubmit={(e) => {
                e.preventDefault()
                if (!quickTitle.trim()) return
                onAdd(quickTitle.trim(), detailQuadrant)
                setQuickTitle('')
                setQuickAddOpen(false)
              }}
            >
              <h3 className="tt-modal-title">{qTitle}</h3>
              <div style={{ padding: '4px 16px 14px' }}>
                <input
                  autoFocus
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  placeholder="Что нужно сделать?"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--line)',
                    fontSize: 16,
                    background: 'var(--bg)',
                    color: 'var(--text)',
                  }}
                />
              </div>
              <div className="tt-modal-footer" style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="tt-modal-cancel" onClick={() => setQuickAddOpen(false)}>
                  Отмена
                </button>
                <button type="submit" className="primary" style={{ flex: 1, borderRadius: 10, padding: '10px 16px' }}>
                  Добавить
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="matrix">
      {QUADRANTS.map((q) => {
        const list = cells[q.id]
        const isOver = dragOverQuadrant === q.id
        const title = MOBILE_TITLES[q.id] || q.title
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
            <header
              className="mx-head"
              onClick={() => setDetailQuadrant(q.id)}
              role="button"
              tabIndex={0}
            >
              <div className="mx-head-info">
                <span className="mx-roman" aria-hidden="true">
                  {ROMAN_MAP[q.id]}
                </span>
                <strong className="mx-title-text">{title}</strong>
              </div>
            </header>

            {onAdd && (
              <QuadrantAddBar
                onAdd={(titleText) => onAdd(titleText, q.id)}
                placeholder="+ Добавить"
              />
            )}

            <div className="mx-list-wrap">
              {list.length === 0 ? (
                <div
                  className="mx-empty"
                  onClick={() => setDetailQuadrant(q.id)}
                  role="button"
                  tabIndex={0}
                >
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
