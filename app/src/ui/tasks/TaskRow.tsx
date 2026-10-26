import { memo, useEffect, useRef, useState, type PointerEvent, type TouchEvent } from 'react'
import { dueDay, formatDue, hasTime, timeOf, type DateCtx, type DayKey } from '../../domain/dates'
import { checklistProgress } from '../../domain/extras'
import type { Task } from '../../domain/types'
import { isStuck, waitingLabel } from '../../domain/waiting'
import { playCompletionSound, triggerCompletionVibration } from '../../platform/audio'
import { deskDue } from '../Desk'
import { AlarmIcon, NoteIcon, PinIcon, RepeatIcon } from '../icons'
import { SwipeLeftTray, SwipeRightTray, SWIPE_WIDTH } from './SwipeTrays'

export interface RowActions {
  toggle: (task: Task) => void
  open: (id: string) => void
  skip: (task: Task) => void
  remove: (task: Task) => void
  reschedule: (task: Task) => void
  menu: (task: Task) => void
  pin?: (task: Task) => void
}

export interface TaskRowProps {
  task: Task
  ctx: DateCtx
  fresh: boolean
  actions: RowActions
  forDay?: DayKey
  project?: { name: string; color: string | null }
}

const LONG_PRESS_MS = 480
const reduceMotion = () => typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function dayRowLabel(task: Task, day: DayKey, ctx: DateCtx): { text: string; overdue: boolean; today: boolean } | null {
  if (!hasTime(task)) return null
  const own = dueDay(task, ctx.tz) === day
  const time = timeOf(task.due as number, ctx.tz)
  return { text: time, overdue: own && task.status === 'open' && (task.due as number) < ctx.now, today: false }
}

function TaskRowComponent(props: TaskRowProps) {
  const { task, ctx, actions } = props
  const done = task.status !== 'open'
  const label = props.forDay ? dayRowLabel(task, props.forDay, ctx) : props.project ? deskDue(task, ctx) : formatDue(task, ctx)
  const wait = task.waiting ? { text: waitingLabel(task.waiting, ctx), stuck: isStuck(task, ctx) } : null
  const progress = checklistProgress(task.items)
  const hasNote = task.content.trim() !== ''
  const hasAlarm = Object.keys(task.reminders).length > 0

  const [leaving, setLeaving] = useState(false)
  useEffect(() => setLeaving(false), [task.status, task.due])

  function toggle() {
    if (reduceMotion()) {
      actions.toggle(task)
      return
    }
    setLeaving(true)
    playCompletionSound()
    triggerCompletionVibration()
    window.setTimeout(() => actions.toggle(task), 260)
  }

  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const li = useRef<HTMLLIElement>(null)
  const offsetRef = useRef(0)
  offsetRef.current = offset
  const drag = useRef<{ x: number; y: number; base: number; moved: boolean; locked: 'h' | 'v' | null; timer: number | undefined } | null>(null)
  const ignoreClick = useRef(false)
  const gesturesOn = true

  useEffect(() => {
    if (offset === 0) return
    const close = (e: Event) => {
      if (!li.current?.contains(e.target as Node)) setOffset(0)
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('touchstart', close, { passive: true })
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('touchstart', close)
    }
  }, [offset])

  const swallowClick = () => {
    ignoreClick.current = true
    window.setTimeout(() => (ignoreClick.current = false), 80)
  }

  function startGesture(clientX: number, clientY: number, target: HTMLElement) {
    if (!gesturesOn || target.closest('input,.swipe-actions,.swipe-complete')) return
    const timer = window.setTimeout(() => {
      if (drag.current && !drag.current.moved) {
        drag.current = null
        swallowClick()
        actions.menu(task)
      }
    }, LONG_PRESS_MS)
    drag.current = { x: clientX, y: clientY, base: offsetRef.current, moved: false, locked: null, timer }
  }

  function moveGesture(clientX: number, clientY: number, stopProp?: () => void) {
    const d = drag.current
    if (!d) return
    const dx = clientX - d.x
    const dy = clientY - d.y
    if (!d.locked) {
      if (Math.abs(dx) < 7 && Math.abs(dy) < 7) return
      window.clearTimeout(d.timer)
      if (Math.abs(dy) > Math.abs(dx)) {
        d.locked = 'v'
        drag.current = null
        return
      }
      d.locked = 'h'
      d.moved = true
      setDragging(true)
    }
    if (d.locked === 'h') {
      stopProp?.()
      const rowW = li.current?.offsetWidth || 360
      const raw = d.base + dx
      const next = Math.max(-rowW, Math.min(rowW, raw))
      offsetRef.current = next
      setOffset(next)
    }
  }

  function endGesture() {
    const d = drag.current
    drag.current = null
    if (!d) return
    window.clearTimeout(d.timer)
    if (d.moved) {
      swallowClick()
      setDragging(false)
      const rowW = li.current?.offsetWidth || 360
      const fullThresh = Math.max(260, rowW * 0.72)
      const cur = offsetRef.current

      if (cur >= fullThresh) {
        // Длинный свайп вправо: моментальное выполнение задачи
        setOffset(rowW)
        triggerCompletionVibration(true)
        playCompletionSound()
        window.setTimeout(() => {
          setOffset(0)
          actions.toggle(task)
        }, 180)
      } else if (cur > 48) {
        // Короткий свайп вправо: открыть 3 кнопки (Выполнено, Закрепить, Пропустить)
        setOffset(SWIPE_WIDTH)
      } else if (cur <= -fullThresh) {
        // Длинный свайп влево: моментальное удаление задачи
        setOffset(-rowW)
        triggerCompletionVibration(true)
        window.setTimeout(() => {
          setOffset(0)
          actions.remove(task)
        }, 160)
      } else if (cur < -48) {
        // Короткий свайп влево: открыть 3 кнопки (Изменить, Дата, Удалить)
        setOffset(-SWIPE_WIDTH)
      } else {
        setOffset(0)
      }
    }
  }

  function onTouchStart(e: TouchEvent) {
    const t = e.touches[0]
    if (!t) return
    startGesture(t.clientX, t.clientY, e.target as HTMLElement)
  }

  function onTouchMove(e: TouchEvent) {
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
      const rowW = li.current?.offsetWidth || 360
      const raw = d.base + (t.clientX - d.x)
      const next = Math.max(-rowW, Math.min(rowW, raw))
      offsetRef.current = next
      setOffset(next)
    }
  }

  function onTouchEnd() {
    endGesture()
  }

  function down(e: PointerEvent) {
    if (e.pointerType === 'touch') return
    startGesture(e.clientX, e.clientY, e.target as HTMLElement)
  }

  function move(e: PointerEvent) {
    if (e.pointerType === 'touch') return
    if (drag.current && !drag.current.moved && Math.abs(e.clientX - drag.current.x) >= 7) {
      ;(e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId)
    }
    moveGesture(e.clientX, e.clientY, () => e.stopPropagation())
  }

  function up(e: PointerEvent) {
    if (e.pointerType === 'touch') return
    endGesture()
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

  const rowW = li.current?.offsetWidth || 360
  const fullThresh = Math.max(260, rowW * 0.72)
  const isFullDelete = offset <= -fullThresh
  const isFullComplete = offset >= fullThresh

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
      {gesturesOn && offset > 0 && (
        <SwipeRightTray
          visible={offset > 0}
          fullComplete={isFullComplete}
          isPinned={task.pinnedAt !== null}
          onComplete={() => {
            setOffset(0)
            toggle()
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
      {gesturesOn && offset < 0 && (
        <SwipeLeftTray
          visible={offset < 0}
          fullDelete={isFullDelete}
          onEdit={() => {
            setOffset(0)
            actions.open(task.id)
          }}
          onDate={run(actions.reschedule)}
          onDelete={run(actions.remove)}
        />
      )}
      <div
        className={dragging ? 'row-front dragging' : 'row-front'}
        style={offset ? { transform: `translateX(${offset}px)` } : undefined}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={onTouchEnd}
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
              {label && <span className={label.overdue ? 'due over' : label.today ? 'due today' : 'due'}>{label.text}</span>}
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

export const TaskRow = memo(TaskRowComponent, (prev, next) => {
  if (prev.task !== next.task) return false
  if (prev.fresh !== next.fresh) return false
  if (prev.forDay !== next.forDay) return false
  if (prev.ctx.now !== next.ctx.now || prev.ctx.tz !== next.ctx.tz) return false
  if (prev.actions !== next.actions) return false
  if (prev.project?.name !== next.project?.name || prev.project?.color !== next.project?.color) return false
  return true
})

