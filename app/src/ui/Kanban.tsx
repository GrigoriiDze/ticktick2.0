import { useMemo, useRef, useState, type FormEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react'
import { formatDue, type DateCtx } from '../domain/dates'
import { buildBoard } from '../domain/kanban'
import type { BoardColumn, Task } from '../domain/types'
import { DeskCard } from './Desk'
import { PopMenu, type PopItem } from './PopMenu'

interface Props {
  /** Большой экран: карточки как в веб-версии TickTick, колонки называются секциями */
  wide?: boolean
  projectId: string
  tasks: Task[]
  columns: BoardColumn[]
  ctx: DateCtx
  onToggle: (task: Task) => void
  onOpen: (id: string) => void
  /** columnId null: полоса «Без колонки» */
  onAddTask: (columnId: string | null) => void
  onMove: (taskId: string, columnId: string | null, index: number) => void
  onAddColumn: (name: string) => void
  onRenameColumn: (id: string, name: string) => void
  onDeleteColumn: (id: string) => void
}

const HOLD_MS = 350
const NONE = 'none'

interface Drag {
  task: Task
  x: number
  y: number
  w: number
  /** Куда встанет карточка: полоса и место среди карточек */
  lane: string | null
  index: number
}

/**
 * Канбан-доска списка: полосы-колонки с карточками. Карточку берут долгим нажатием и переносят
 * в другую колонку или на другое место. Нажатие открывает задачу
 */
export function Kanban({ wide, projectId, tasks, columns, ctx, onToggle, onOpen, onAddTask, onMove, onAddColumn, onRenameColumn, onDeleteColumn }: Props) {
  const board = useMemo(() => buildBoard(projectId, tasks, columns), [projectId, tasks, columns])
  const [drag, setDrag] = useState<Drag | null>(null)
  const [menu, setMenu] = useState<BoardColumn | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameText, setRenameText] = useState('')
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const suppressClick = useRef(false)

  function target(x: number, y: number, id: string): { lane: string | null; index: number } | null {
    const laneEl = (document.elementFromPoint(x, y) as HTMLElement | null)?.closest<HTMLElement>('[data-lane]')
    if (!laneEl) return null
    const lane = laneEl.dataset.lane === NONE ? null : (laneEl.dataset.lane as string)
    const cards = [...laneEl.querySelectorAll<HTMLElement>('[data-card]')].filter((c) => c.dataset.card !== id)
    const index = cards.filter((c) => {
      const r = c.getBoundingClientRect()
      return r.top + r.height / 2 < y
    }).length
    return { lane, index }
  }

  function press(e: ReactPointerEvent<HTMLElement>, task: Task) {
    if ((e.target as HTMLElement).closest('input')) return
    const startX = e.clientX
    const startY = e.clientY
    const w = e.currentTarget.getBoundingClientRect().width
    let active = false
    const mouse = e.pointerType === 'mouse'
    const board = e.currentTarget.closest<HTMLElement>('.kanban')
    let last = { x: startX, y: startY }

    const block = (ev: Event) => ev.preventDefault()
    const show = (x: number, y: number) => {
      const t = target(x, y, task.id)
      setDrag({ task, x, y, w, lane: t ? t.lane : null, index: t ? t.index : 0 })
    }
    const stop = () => {
      window.clearTimeout(timer)
      window.clearInterval(scroller)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', cancel)
      window.removeEventListener('touchmove', block)
    }
    const move = (ev: PointerEvent) => {
      last = { x: ev.clientX, y: ev.clientY }
      if (active) show(ev.clientX, ev.clientY)
      else if (Math.hypot(ev.clientX - startX, ev.clientY - startY) > 8) {
        // Мышью карточку тащат сразу, без долгого нажатия
        if (mouse) {
          active = true
          show(ev.clientX, ev.clientY)
        } else stop()
      }
    }
    const cancel = () => {
      stop()
      setDrag(null)
    }
    const up = (ev: PointerEvent) => {
      const wasActive = active
      stop()
      if (!wasActive) return
      suppressClick.current = true
      window.setTimeout(() => (suppressClick.current = false), 0)
      const t = target(ev.clientX, ev.clientY, task.id)
      setDrag(null)
      if (t) onMove(task.id, t.lane, t.index)
    }
    const timer = window.setTimeout(() => {
      active = true
      window.addEventListener('touchmove', block, { passive: false })
      show(last.x, last.y)
    }, HOLD_MS)
    // У края экрана доска сама едет в ту сторону, чтобы дотянуться до далёкой колонки
    const scroller = window.setInterval(() => {
      if (!active || !board) return
      const edge = Math.min(64, window.innerWidth / 6)
      if (last.x > window.innerWidth - edge) board.scrollLeft += 12
      else if (last.x < edge) board.scrollLeft -= 12
      else return
      show(last.x, last.y)
    }, 16)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', cancel)
  }

  const card = (t: Task) => {
    if (wide)
      return (
        <DeskCard key={t.id} task={t} ctx={ctx} onPointerDown={(e) => press(e, t)} onToggle={onToggle} onOpen={(id) => !suppressClick.current && onOpen(id)} />
      )
    const due = formatDue(t, ctx)
    return (
      <li key={t.id} data-card={t.id} className="kb-card" onPointerDown={(e) => press(e, t)}>
        <input type="checkbox" className={`p${t.priority}`} checked={false} onChange={() => onToggle(t)} aria-label={t.title} />
        <button
          className="kb-title"
          onClick={() => {
            if (!suppressClick.current) onOpen(t.id)
          }}
        >
          <span>{t.title}</span>
          {due && <small className={due.overdue ? 'due over' : 'due'}>{due.text}</small>}
        </button>
      </li>
    )
  }

  const lane = (id: string, title: string, list: Task[], column: BoardColumn | null) => {
    // Переносимая карточка с места исчезает, на её будущем месте горит полоска
    const siblings = list.filter((t) => t.id !== drag?.task.id)
    const showAt = drag && drag.lane === (id === NONE ? null : id) ? drag.index : -1
    const rows: ReactNode[] = []
    siblings.forEach((t, i) => {
      if (showAt === i) rows.push(<li key="drop" className="kb-drop" aria-hidden="true" />)
      rows.push(card(t))
    })
    if (showAt >= siblings.length) rows.push(<li key="drop" className="kb-drop" aria-hidden="true" />)
    return (
      <section key={id} className="kb-lane" data-lane={id} aria-label={title}>
        <header>
          {column && renaming === column.id ? (
            <form
              onSubmit={(e: FormEvent) => {
                e.preventDefault()
                if (renameText.trim()) onRenameColumn(column.id, renameText.trim())
                setRenaming(null)
              }}
            >
              <input autoFocus value={renameText} onChange={(e) => setRenameText(e.target.value)} onBlur={() => setRenaming(null)} aria-label="Название колонки" enterKeyHint="done" />
            </form>
          ) : (
            <strong>{title}</strong>
          )}
          <span className="muted">{wide ? list.length : list.length || ''}</span>
          <button className="ghost kb-add" onClick={() => onAddTask(column ? column.id : null)} aria-label={`Добавить задачу в «${title}»`}>
            +
          </button>
          {column && (
            <button className="ghost kb-more" onClick={() => setMenu(column)} aria-label={`Действия с колонкой ${column.name}`}>
              ⋯
            </button>
          )}
        </header>
        <ul>{rows}</ul>
      </section>
    )
  }

  const menuItems = (c: BoardColumn): PopItem[] => [
    {
      key: 'rename',
      title: 'Переименовать',
      onPick: () => {
        setRenameText(c.name)
        setRenaming(c.id)
      },
    },
    { key: 'delete', title: 'Удалить колонку', hint: 'задачи останутся без колонки', danger: true, onPick: () => onDeleteColumn(c.id) },
  ]

  return (
    <div className={drag ? 'kanban dragging' : 'kanban'}>
      {(board.none.length > 0 || (wide && board.columns.length === 0)) && lane(NONE, wide ? 'несгруппированный' : 'Без колонки', board.none, null)}
      {board.columns.map(({ column, tasks: list }) => lane(column.id, column.name, list, column))}
      <section className="kb-lane kb-new">
        {adding ? (
          <form
            onSubmit={(e: FormEvent) => {
              e.preventDefault()
              if (name.trim()) onAddColumn(name.trim())
              setName('')
              setAdding(false)
            }}
          >
            <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onBlur={() => !name.trim() && setAdding(false)} placeholder={wide ? 'Название секции' : 'Название колонки'} aria-label="Название новой колонки" enterKeyHint="done" />
          </form>
        ) : (
          <button className="kb-new-btn" onClick={() => setAdding(true)}>
            {wide ? '+ Новая секция' : '+ Колонка'}
          </button>
        )}
      </section>

      {drag && (
        <div className="kb-ghost" style={{ left: drag.x, top: drag.y, width: drag.w }} aria-hidden="true">
          {drag.task.title}
        </div>
      )}
      {menu && <PopMenu label="Колонка" items={menuItems(menu)} onClose={() => setMenu(null)} />}
    </div>
  )
}
