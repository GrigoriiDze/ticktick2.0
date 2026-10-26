import { useMemo, useState, useRef, useEffect, type FormEvent } from 'react'
import { formatDue, type DateCtx, type DayKey } from '../domain/dates'
import { boardByDay, boardByProject, type DeskColumn } from '../domain/deskboard'
import { buildBoard } from '../domain/kanban'
import type { BoardColumn, Project, Task } from '../domain/types'
import { AlarmIcon, NoteIcon, PinIcon, RepeatIcon } from './icons'
import type { RowActions } from './TaskList'
import { SwipeLeftTray, SwipeRightTray, SWIPE_WIDTH } from './TaskList'
import { playCompletionSound, triggerCompletionVibration } from '../platform/audio'

interface Props {
  mode: 'smart' | 'project'
  smartId?: 'today' | 'week'
  projectId?: string
  tasks: Task[]
  projects: Project[]
  columns: BoardColumn[]
  ctx: DateCtx
  actions: RowActions
  onAddColumn?: (name: string) => void
  onRenameColumn?: (id: string, name: string) => void
  onDeleteColumn?: (id: string) => void
  onMoveCard?: (taskId: string, columnId: string | null, index: number) => void
  onAddTask: (projectId?: string, columnId?: string | null, day?: DayKey | null) => void
  onPostponeOverdue?: (tasks: Task[]) => void
}

const LONG_PRESS_MS = 480

/**
 * Отдельная карточка задачи в стиле iOS:
 * - Залитый темный фон #1c1c1e (в темной теме) со скруглением 12px
 * - Скругленный квадратный чекбокс с цветной рамкой по приоритету
 * - Название задачи
 * - Справа: оранжевая/красная дата и ряд микроиконок (📝, ⏰, ↻)
 * - Свайпы: короткий -> [Изменить] [Удалить] [Дата], полный -> удаление с вибро
 */
function MobileBoardCard(props: {
  task: Task
  ctx: DateCtx
  actions: RowActions
  onDateClick?: () => void
}) {
  const { task, ctx, actions } = props
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const offsetRef = useRef(0)
  const li = useRef<HTMLDivElement>(null)
  const drag = useRef<{ x: number; y: number; base: number; moved: boolean; locked: 'h' | 'v' | null; timer: number | undefined } | null>(null)
  const ignoreClick = useRef(false)

  const done = task.status !== 'open'
  const due = formatDue(task, ctx)
  const isOverdue = due?.overdue
  const hasNote = Boolean(task.content && task.content.trim())
  const hasAlarm = Boolean(task.reminders && Object.keys(task.reminders).length > 0)
  const isRepeat = Boolean(task.repeat)
  const isPinned = task.pinnedAt !== null

  const rowW = li.current?.offsetWidth || 360
  const fullThresh = Math.max(260, rowW * 0.72)
  const isFullDelete = offset <= -fullThresh
  const isFullComplete = offset >= fullThresh

  const swallowClick = () => {
    ignoreClick.current = true
    window.setTimeout(() => (ignoreClick.current = false), 80)
  }

  function startGesture(clientX: number, clientY: number, target: HTMLElement) {
    if (target.closest('input, .swipe-actions')) return
    const timer = window.setTimeout(() => {
      if (drag.current && !drag.current.moved) {
        drag.current = null
        swallowClick()
        actions.menu(task)
      }
    }, LONG_PRESS_MS)
    drag.current = { x: clientX, y: clientY, base: offsetRef.current, moved: false, locked: null, timer }
  }

  function endGesture() {
    const d = drag.current
    drag.current = null
    if (!d) return
    window.clearTimeout(d.timer)
    if (d.moved) {
      swallowClick()
      setDragging(false)
      const w = li.current?.offsetWidth || 360
      const fullThresh = Math.max(260, w * 0.72)
      const cur = offsetRef.current
      if (cur >= fullThresh) {
        setOffset(w)
        triggerCompletionVibration(true)
        playCompletionSound()
        window.setTimeout(() => {
          setOffset(0)
          actions.toggle(task)
        }, 180)
      } else if (cur > 48) {
        setOffset(SWIPE_WIDTH)
      } else if (cur <= -fullThresh) {
        setOffset(-w)
        triggerCompletionVibration(true)
        window.setTimeout(() => {
          setOffset(0)
          actions.remove(task)
        }, 160)
      } else if (cur < -48) {
        setOffset(-SWIPE_WIDTH)
      } else {
        setOffset(0)
      }
    }
  }

  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]
    if (!t) return
    startGesture(t.clientX, t.clientY, e.target as HTMLElement)
  }

  function onTouchMove(e: React.TouchEvent) {
    const t = e.touches[0]
    if (!t) return
    const d = drag.current
    if (d && !d.locked) {
      const dx = t.clientX - d.x
      const dy = t.clientY - d.y
      if (Math.abs(dx) > 6 && Math.abs(dx) > Math.abs(dy)) {
        d.locked = 'h'
        d.moved = true
        window.clearTimeout(d.timer)
        setDragging(true)
      } else if (Math.abs(dy) > 6 && Math.abs(dy) >= Math.abs(dx)) {
        d.locked = 'v'
        drag.current = null
        return
      }
    }
    if (d && d.locked === 'h') {
      if (e.cancelable) e.preventDefault()
      e.stopPropagation()
      const w = li.current?.offsetWidth || 360
      const raw = d.base + (t.clientX - d.x)
      const next = Math.max(-w, Math.min(w, raw))
      offsetRef.current = next
      setOffset(next)
    }
  }

  function onTouchEnd() {
    endGesture()
  }

  function toggle(e: React.ChangeEvent<HTMLInputElement>) {
    e.stopPropagation()
    setLeaving(true)
    playCompletionSound()
    triggerCompletionVibration()
    window.setTimeout(() => {
      actions.toggle(task)
      setLeaving(false)
    }, 240)
  }

  function open() {
    if (ignoreClick.current) return
    if (offset !== 0) setOffset(0)
    else actions.open(task.id)
  }

  return (
    <div
      ref={li}
      className={`m-mb-card-wrap${leaving ? ' leaving' : ''}`}
      onContextMenu={(e) => {
        e.preventDefault()
        actions.menu(task)
      }}
    >
      {offset > 0 && (
        <SwipeRightTray
          visible={offset > 0}
          fullComplete={isFullComplete}
          isPinned={isPinned}
          onComplete={() => {
            setOffset(0)
            actions.toggle(task)
          }}
          onPin={() => {
            setOffset(0)
            actions.pin?.(task)
          }}
          onSkip={() => {
            setOffset(0)
            actions.skip(task)
          }}
        />
      )}
      {offset < 0 && (
        <SwipeLeftTray
          visible={offset < 0}
          fullDelete={isFullDelete}
          onEdit={() => {
            setOffset(0)
            actions.open(task.id)
          }}
          onDate={() => {
            setOffset(0)
            actions.reschedule(task)
          }}
          onDelete={() => {
            setOffset(0)
            actions.remove(task)
          }}
        />
      )}
      <div
        className={`m-mb-card${dragging ? ' dragging' : ''}`}
        style={offset ? { transform: `translateX(${offset}px)` } : undefined}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
        onClick={open}
      >
        <input
          type="checkbox"
          className={`m-mb-check p${task.priority}`}
          checked={leaving ? !done : done}
          onChange={toggle}
          aria-label={task.title}
        />
        <div className="m-mb-card-main">
          <span className={`m-mb-title${done ? ' done' : ''}`}>{task.title}</span>
        </div>
        <div className="m-mb-card-side">
          {due && (
            <span className={`m-mb-due${isOverdue ? ' over' : due.today ? ' today' : ''}`}>
              {due.text}
            </span>
          )}
          <div className="m-mb-icons">
            {isPinned && <PinIcon size={14} />}
            {hasNote && <NoteIcon size={14} />}
            {hasAlarm && <AlarmIcon size={14} />}
            {isRepeat && <RepeatIcon size={14} />}
          </div>
        </div>
      </div>

    </div>
  )
}

/**
 * Мобильная Канбан-доска (1-в-1 как в iOS TickTick):
 * - В «Сегодня»: горизонтальные пилюли проектов (`[Входящие]`, `[План окт—ноя 2026]`, `[Привычка]`),
 *   под выбранной пилюлей — задачи этого проекта, разбитые на секции (`Просрочено`, `Сегодня`),
 *   с кнопкой «Отложить. N ∨» для просроченных.
 * - Во «Входящие» и проектах: горизонтальные пилюли секций (`[несгруппированные]`, `[Секция 1]`... `[+]`),
 *   под выбранной — задачи колонки.
 */
export function MobileBoard(props: Props) {
  const { mode, smartId, projectId, tasks, projects, columns, ctx, actions, onAddColumn, onAddTask, onPostponeOverdue } = props
  const [activeKey, setActiveKey] = useState<string>('')
  const [collapsedSecs, setCollapsedSecs] = useState<Record<string, boolean>>({})
  const [addingCol, setAddingCol] = useState(false)
  const [newColName, setNewColName] = useState('')
  const [postponeConfirmTasks, setPostponeConfirmTasks] = useState<Task[] | null>(null)
  const stripRef = useRef<HTMLDivElement>(null)
  const boardDrag = useRef<{ x: number; y: number; locked: 'h' | 'v' | null } | null>(null)

  // 1. Колонки для умного списка («Сегодня» или «Следующие 7 дней»)
  const smartCols: DeskColumn[] = useMemo(() => {
    if (mode !== 'smart') return []
    return smartId === 'week' ? boardByDay(tasks, ctx) : boardByProject(tasks, projects, ctx)
  }, [mode, smartId, tasks, projects, ctx])

  // 2. Колонки для проекта / «Входящие»
  const projectBoard = useMemo(() => {
    if (mode !== 'project' || !projectId) return null
    return buildBoard(projectId, tasks, columns)
  }, [mode, projectId, tasks, columns])

  const projectCols = useMemo(() => {
    if (!projectBoard) return []
    const list: Array<{ key: string; title: string; count: number; tasks: Task[]; columnId: string | null }> = [
      {
        key: 'none',
        title: 'несгруппированные',
        count: projectBoard.none.length,
        tasks: projectBoard.none,
        columnId: null,
      },
      ...projectBoard.columns.map((c) => ({
        key: c.column.id,
        title: c.column.name,
        count: c.tasks.length,
        tasks: c.tasks,
        columnId: c.column.id,
      })),
    ]
    return list
  }, [projectBoard])

  // Текущая выбранная колонка
  const effectiveKey = useMemo(() => {
    if (mode === 'smart') {
      if (activeKey && smartCols.some((c) => c.key === activeKey)) return activeKey
      return smartCols[0]?.key ?? 'inbox'
    }
    if (activeKey && projectCols.some((c) => c.key === activeKey)) return activeKey
    return projectCols[0]?.key ?? 'none'
  }, [mode, activeKey, smartCols, projectCols])

  useEffect(() => {
    const pill = stripRef.current?.querySelector('.m-mb-pill.on')
    if (pill) {
      pill.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
    }
  }, [effectiveKey])

  function onBoardTouchStart(e: React.TouchEvent) {
    const t = e.touches[0]
    if (!t) return
    boardDrag.current = { x: t.clientX, y: t.clientY, locked: null }
  }

  function onBoardTouchMove(e: React.TouchEvent) {
    const d = boardDrag.current
    if (!d) return
    const t = e.touches[0]
    if (!t) return
    const dx = t.clientX - d.x
    const dy = t.clientY - d.y
    if (!d.locked) {
      if (Math.abs(dx) > 12 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        d.locked = 'h'
      } else if (Math.abs(dy) > 10) {
        d.locked = 'v'
      }
    }
  }

  function onBoardTouchEnd(e: React.TouchEvent) {
    const d = boardDrag.current
    boardDrag.current = null
    if (!d || d.locked !== 'h') return
    const t = e.changedTouches[0]
    if (!t) return
    const dx = t.clientX - d.x
    const dy = t.clientY - d.y
    if (Math.abs(dy) > Math.abs(dx) * 0.8) return

    const colsList = mode === 'smart' ? smartCols : projectCols
    const curIdx = colsList.findIndex((c) => c.key === effectiveKey)
    if (curIdx === -1) return

    if (dx < -45 && curIdx < colsList.length - 1) {
      setActiveKey(colsList[curIdx + 1].key)
    } else if (dx > 45 && curIdx > 0) {
      setActiveKey(colsList[curIdx - 1].key)
    }
  }

  const toggleSection = (secKey: string) => {
    setCollapsedSecs((prev) => ({ ...prev, [secKey]: !prev[secKey] }))
  }

  const handleCreateColumn = (e: FormEvent) => {
    e.preventDefault()
    const trimmed = newColName.trim()
    if (trimmed && onAddColumn) {
      onAddColumn(trimmed)
      setNewColName('')
      setAddingCol(false)
    }
  }

  return (
    <div className="m-mb-container">
      {/* Горизонтальная полоса пилюль (Pills Strip) 1-в-1 по скринам iOS */}
      <div className="m-mb-strip" ref={stripRef} role="tablist" aria-label="Секции доски">
        {mode === 'smart' ? (
          smartCols.length === 0 ? (
            <button className="m-mb-pill on" role="tab" aria-selected={true}>
              <span>Входящие</span>
            </button>
          ) : (
            smartCols.map((c) => {
              const on = c.key === effectiveKey
              return (
                <button
                  key={c.key}
                  className={`m-mb-pill${on ? ' on' : ''}`}
                  onClick={() => setActiveKey(c.key)}
                  role="tab"
                  aria-selected={on}
                >
                  <span className="m-mb-pill-text">{c.title}</span>
                  {c.count > 0 && <span className="m-mb-pill-count">{c.count}</span>}
                </button>
              )
            })
          )
        ) : (
          <>
            {projectCols.map((c) => {
              const on = c.key === effectiveKey
              return (
                <button
                  key={c.key}
                  className={`m-mb-pill${on ? ' on' : ''}`}
                  onClick={() => setActiveKey(c.key)}
                  role="tab"
                  aria-selected={on}
                >
                  <span className="m-mb-pill-text">{c.title}</span>
                  {c.count > 0 && <span className="m-mb-pill-count">{c.count}</span>}
                </button>
              )
            })}
            {onAddColumn && (
              <button
                className="m-mb-add-col-btn"
                onClick={() => setAddingCol(true)}
                aria-label="Добавить секцию"
                title="Добавить секцию"
              >
                +
              </button>
            )}
          </>
        )}
      </div>

      {/* Модальное поле создания новой секции */}
      {addingCol && (
        <form onSubmit={handleCreateColumn} className="m-mb-add-form">
          <input
            autoFocus
            type="text"
            className="m-mb-add-input"
            placeholder="Название секции..."
            value={newColName}
            onChange={(e) => setNewColName(e.target.value)}
            onBlur={() => {
              if (!newColName.trim()) setAddingCol(false)
            }}
          />
          <button type="submit" className="m-mb-add-submit" disabled={!newColName.trim()}>
            Готово
          </button>
          <button type="button" className="m-mb-add-cancel" onClick={() => setAddingCol(false)}>
            Отмена
          </button>
        </form>
      )}

      {/* Содержимое выбранной колонки */}
      <div className="m-mb-content" onTouchStart={onBoardTouchStart} onTouchMove={onBoardTouchMove} onTouchEnd={onBoardTouchEnd} onTouchCancel={onBoardTouchEnd}>
        {mode === 'smart' ? (
          (() => {
            const curCol = smartCols.find((c) => c.key === effectiveKey)
            if (!curCol || curCol.sections.length === 0) {
              return (
                <div className="m-mb-empty">
                  <span>В этом списке нет задач на сегодня</span>
                </div>
              )
            }
            return curCol.sections.map((sec) => {
              const collapsed = Boolean(collapsedSecs[sec.key])
              const isOverdue = sec.key === 'overdue'
              return (
                <div key={sec.key} className="m-mb-sec">
                  <div className="m-mb-sec-head" onClick={() => toggleSection(sec.key)}>
                    <div className="m-mb-sec-left">
                      <span className={`m-mb-sec-chev${collapsed ? ' closed' : ''}`}>›</span>
                      <span className="m-mb-sec-title">{sec.title}</span>
                    </div>
                    <div className="m-mb-sec-right">
                      {isOverdue && sec.tasks.length > 0 && (
                        <button
                          type="button"
                          className="m-mb-postpone-btn"
                          onClick={(e) => {
                            e.stopPropagation()
                            setPostponeConfirmTasks(sec.tasks)
                          }}
                        >
                          Отложить. {sec.tasks.length} ∨
                        </button>
                      )}
                      {!isOverdue && <span className="m-mb-sec-count">{sec.tasks.length}</span>}
                    </div>
                  </div>
                  {!collapsed && (
                    <div className="m-mb-cards-list">
                      {sec.tasks.map((t) => (
                        <MobileBoardCard key={t.id} task={t} ctx={ctx} actions={actions} />
                      ))}
                    </div>
                  )}
                </div>
              )
            })
          })()
        ) : (
          (() => {
            const curCol = projectCols.find((c) => c.key === effectiveKey)
            if (!curCol || curCol.tasks.length === 0) {
              return (
                <div className="m-mb-empty">
                  <span>В этой секции нет задач</span>
                  <button
                    className="m-mb-empty-add"
                    onClick={() => onAddTask(projectId, curCol?.columnId ?? null, null)}
                  >
                    + Добавить задачу
                  </button>
                </div>
              )
            }
            return (
              <div className="m-mb-cards-list">
                {curCol.tasks.map((t) => (
                  <MobileBoardCard key={t.id} task={t} ctx={ctx} actions={actions} />
                ))}
              </div>
            )
          })()
        )}
      </div>

      {postponeConfirmTasks && (
        <div className="m-confirm-overlay" onClick={() => setPostponeConfirmTasks(null)}>
          <div className="m-confirm-box" onClick={(e) => e.stopPropagation()}>
            <div className="m-confirm-title">Отложить задачи?</div>
            <div className="m-confirm-desc">
              {postponeConfirmTasks.length === 1
                ? 'Перенести 1 просроченную задачу на сегодня?'
                : `Перенести ${postponeConfirmTasks.length} просроченных задач на сегодня?`}
            </div>
            <div className="m-confirm-actions">
              <button
                type="button"
                className="m-confirm-cancel"
                onClick={() => setPostponeConfirmTasks(null)}
              >
                Отмена
              </button>
              <button
                type="button"
                className="m-confirm-ok"
                onClick={() => {
                  const list = postponeConfirmTasks
                  setPostponeConfirmTasks(null)
                  if (onPostponeOverdue && list) onPostponeOverdue(list)
                }}
              >
                Перенести
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
