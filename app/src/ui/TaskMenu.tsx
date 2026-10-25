import { useState, type ReactNode } from 'react'
import { describeDateValue, dateValueOf } from '../domain/datevalue'
import type { DateCtx } from '../domain/dates'
import type { Priority, Project, Task } from '../domain/types'
import { canShare } from '../platform/share'
import { PopMenu } from './PopMenu'
import { CalendarIcon, FlagIcon, ListIcon, PinIcon, ShareIcon, SkipIcon, SubtaskIcon, TagIcon, TrashIcon } from './icons'

interface Props {
  leaving?: boolean
  task: Task
  ctx: DateCtx
  onPin: () => void
  onShare: () => void
  onSkip: () => void
  onRemove: () => void
  onDate: () => void
  projects: Project[]
  onPriority: (priority: Priority) => void
  onMove: (projectId: string) => void
  onDuplicate: () => void
  /** Открывает карточку: с полем для подзадачи или для метки */
  onOpen: (focus: 'item' | 'tag') => void
  onClose: () => void
}

/** Меню по долгому нажатию на задачу: быстрые действия сверху, остальное списком */
export function TaskMenu({ task, ctx, onPin, onShare, onSkip, onRemove, onDate, onOpen, onClose, leaving, projects, onPriority, onMove, onDuplicate }: Props) {
  const [moving, setMoving] = useState(false)
  const pinned = task.pinnedAt !== null
  const summary = describeDateValue(dateValueOf(task, ctx), ctx)
  const act = (fn: () => void) => () => {
    onClose()
    fn()
  }

  const big = (key: string, icon: ReactNode, title: string, fn: () => void, cls = '') => (
    <button key={key} className={`tm-big ${cls}`} onClick={act(fn)}>
      <span className="tm-icon">{icon}</span>
      <span>{title}</span>
    </button>
  )

  return (
    <>
      <div className={leaving ? 'scrim on leaving' : 'scrim on'} onClick={onClose} />
      <section className={leaving ? 'sheet task-menu leaving' : 'sheet task-menu'} role="dialog" aria-label="Действия с задачей">
        <p className="tm-title">{task.title}</p>
        <div className="tm-bigs">
          {big('pin', <PinIcon size={24} aria-hidden="true" role="presentation" />, pinned ? 'Открепить' : 'Закрепить', onPin)}
          {canShare() && big('share', <ShareIcon size={24} />, 'Поделиться', onShare)}
          {big('skip', <SkipIcon size={24} />, 'Не буду делать', onSkip)}
          {big('del', <TrashIcon size={24} />, 'Удалить', onRemove, 'danger')}
        </div>
        <div className="tm-flags" role="group" aria-label="Приоритет">
          {([5, 3, 1, 0] as Priority[]).map((p) => (
            <button key={p} className={task.priority === p ? 'tm-flag on' : 'tm-flag'} onClick={act(() => onPriority(p))} aria-label={['Без приоритета', 'Низкий приоритет', '', 'Средний приоритет', '', 'Высокий приоритет'][p]}>
              <FlagIcon size={22} className={p ? `flag p${p}` : undefined} />
            </button>
          ))}
        </div>
        <button className="tm-row" onClick={act(onDate)}>
          <CalendarIcon size={20} />
          <span>{summary || 'Дата и напоминание'}</span>
        </button>
        <button className="tm-row" onClick={act(() => onOpen('item'))}>
          <SubtaskIcon size={20} />
          <span>Добавить подзадачу</span>
        </button>
        <button className="tm-row" onClick={act(() => onOpen('tag'))}>
          <TagIcon size={20} />
          <span>Метки</span>
        </button>
        <button className="tm-row" onClick={() => setMoving(true)}>
          <ListIcon size={20} />
          <span>Переместить в…</span>
        </button>
        <button className="tm-row" onClick={act(onDuplicate)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="8" y="8" width="12" height="12" rx="3" />
            <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
          </svg>
          <span>Дублировать</span>
        </button>
      </section>
      {moving && <PopMenu label="Переместить в" items={projects.map((p) => ({ key: p.id, title: p.name, checked: p.id === task.projectId, icon: <ListIcon size={20} />, onPick: () => (onMove(p.id), onClose()) }))} onClose={() => setMoving(false)} />}
    </>
  )
}
