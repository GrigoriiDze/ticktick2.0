import { useEffect, useMemo, useRef, useState, type PointerEvent, type TouchEvent } from 'react'
import type { DayKey } from '../../../domain/dates'
import { habitStats } from '../../../domain/habits'
import type { Habit } from '../../../domain/types'
import { playCompletionSound, triggerCompletionVibration } from '../../../platform/audio'
import { SWIPE_WIDTH, SwipeActionsTray, SwipeCompleteTray } from '../../../ui/TaskList'
import { HabitIcon } from './HabitIcon'
import type { Checks } from '../types'

interface Props {
  habit: Habit
  checks: Checks
  day: DayKey
  now: DayKey
  onOpen: () => void
  onEdit: () => void
  onDelete: () => void
  onToggleDay: () => void
  onOpenLog: () => void
}

export function MobileHabitRow(props: Props) {
  const { habit, checks, day, now } = props
  const stats = useMemo(() => habitStats(habit, checks, now), [habit, checks, now])
  const dayStatus = checks.get(day)
  const isDone = dayStatus === 'done'

  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const offsetRef = useRef(0)
  offsetRef.current = offset
  const drag = useRef<{ x: number; y: number; base: number; moved: boolean; locked: 'h' | 'v' | null } | null>(null)
  const ignoreClick = useRef(false)

  useEffect(() => {
    if (offset === 0) return
    const close = (e: Event) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOffset(0)
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

  function start(clientX: number, clientY: number, target: HTMLElement) {
    if (target.closest('.swipe-actions')) return
    drag.current = { x: clientX, y: clientY, base: offsetRef.current, moved: false, locked: null }
  }

  function move(clientX: number, clientY: number, stopProp?: () => void) {
    const d = drag.current
    if (!d) return
    const dx = clientX - d.x
    const dy = clientY - d.y
    if (!d.locked) {
      if (Math.abs(dx) < 7 && Math.abs(dy) < 7) return
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
      const rowW = wrapRef.current?.offsetWidth || 340
      const raw = d.base + dx
      const next = raw > 0 ? (raw > 120 ? 120 + (raw - 120) * 0.35 : raw) : Math.max(-rowW, raw)
      offsetRef.current = next
      setOffset(next)
    }
  }

  function end() {
    const d = drag.current
    drag.current = null
    if (!d || !d.moved) return
    swallowClick()
    setDragging(false)
    const rowW = wrapRef.current?.offsetWidth || 340
    const fullThresh = -Math.max(225, rowW * 0.65)
    const cur = offsetRef.current

    if (cur >= 75) {
      setOffset(rowW)
      triggerCompletionVibration(true)
      playCompletionSound()
      window.setTimeout(() => {
        setOffset(0)
        props.onToggleDay()
      }, 160)
    } else if (cur <= fullThresh) {
      setOffset(-rowW)
      window.setTimeout(() => {
        setOffset(0)
        props.onDelete()
      }, 160)
    } else if (cur < -56) {
      setOffset(-SWIPE_WIDTH)
    } else {
      setOffset(0)
    }
  }

  const rowW = wrapRef.current?.offsetWidth || 340
  const isFullDelete = offset <= -Math.max(225, rowW * 0.65)

  return (
    <div className="m-cal-swipe-wrap" ref={wrapRef}>
      {offset > 0 && <SwipeCompleteTray visible={offset > 0} ready={offset >= 75} />}
      {offset < 0 && (
        <SwipeActionsTray
          visible={offset < 0}
          fullDelete={isFullDelete}
          onEdit={() => {
            setOffset(0)
            props.onEdit()
          }}
          onDelete={() => {
            setOffset(0)
            props.onDelete()
          }}
          onDate={() => {
            setOffset(0)
            props.onOpen()
          }}
        />
      )}
      <div
        className={`m-hb-row${dragging ? ' dragging' : ''}`}
        style={offset ? { transform: `translateX(${offset}px)` } : undefined}
        onTouchStart={(e: TouchEvent) => {
          const t = e.touches[0]
          if (t) start(t.clientX, t.clientY, e.target as HTMLElement)
        }}
        onTouchMove={(e: TouchEvent) => {
          const t = e.touches[0]
          if (t) move(t.clientX, t.clientY, () => e.stopPropagation())
        }}
        onTouchEnd={end}
        onTouchCancel={end}
        onPointerDown={(e: PointerEvent) => {
          if (e.pointerType !== 'touch') start(e.clientX, e.clientY, e.target as HTMLElement)
        }}
        onPointerMove={(e: PointerEvent) => {
          if (e.pointerType !== 'touch') move(e.clientX, e.clientY, () => e.stopPropagation())
        }}
        onPointerUp={(e: PointerEvent) => {
          if (e.pointerType !== 'touch') end()
        }}
        onPointerCancel={(e: PointerEvent) => {
          if (e.pointerType !== 'touch') end()
        }}
        onClick={() => {
          if (ignoreClick.current) return
          if (offset !== 0) setOffset(0)
          else props.onOpen()
        }}
      >
        <button
          type="button"
          className={`m-hb-avatar${isDone ? ' done' : ''}`}
          style={{ background: habit.color }}
          onClick={(e) => {
            e.stopPropagation()
            props.onToggleDay()
          }}
          aria-label={isDone ? 'Отмечено' : 'Отметить выполнение'}
        >
          <HabitIcon name={habit.name} size={24} />
          {isDone && (
            <span className="m-hb-avatar-check">
              <svg width="10" height="10" viewBox="0 0 20 20" fill="none" stroke="#ffffff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 10.5l4 4 8-8.5" />
              </svg>
            </span>
          )}
        </button>

        <span className="m-hb-row-name">{habit.name}</span>

        <div className="m-hb-row-stats">
          <span className="m-hb-row-days">{stats.total}</span>
          <span className="m-hb-row-label">Всего дней</span>
        </div>

        <button
          type="button"
          className="m-hb-log-btn"
          onClick={(e) => {
            e.stopPropagation()
            props.onOpenLog()
          }}
          aria-label="Заметка к привычке"
          title="Заметка к привычке"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 20h9" />
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
          </svg>
        </button>
      </div>
    </div>
  )
}

