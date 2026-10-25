import { useEffect, useRef, useState } from 'react'
import { describeChanges, formatMoment, rollbackPatch, type HistoryEntry } from '../domain/history'
import type { DateCtx } from '../domain/dates'
import type { Project, Task } from '../domain/types'

interface Props {
  leaving?: boolean
  task: Task
  ctx: DateCtx
  projects: Project[]
  /** Подписка на записи истории этой задачи */
  subscribe: (onChange: (entries: HistoryEntry[]) => void) => () => void
  /** Применяет правку, возвращающую поля записи к прежним значениям */
  onRollback: (patch: Record<string, unknown>) => void
  onClose: () => void
}

/** История изменений задачи: что и когда менялось, с кнопкой «Вернуть» у каждой записи */
export function HistorySheet({ task, ctx, projects, subscribe, onRollback, onClose, leaving }: Props) {
  const [entries, setEntries] = useState<HistoryEntry[] | null>(null)
  // Подписка живёт, пока открыта история одной задачи. Новая функция при каждой отрисовке её не перезапускает
  const sub = useRef(subscribe)
  sub.current = subscribe
  useEffect(() => sub.current(setEntries), [task.id])
  const projectName = (id: string) => projects.find((p) => p.id === id)?.name ?? 'удалённый список'

  return (
    <>
      <div className={leaving ? 'scrim on top leaving' : 'scrim on top'} onClick={onClose} />
      <section className={leaving ? 'sheet history top leaving' : 'sheet history top'} role="dialog" aria-label="История изменений">
        <div className="hs-head">
          <strong>История изменений</strong>
          <button className="ghost" onClick={onClose} aria-label="Закрыть">
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <p className="hs-task">{task.title}</p>
        <div className="hs-list">
          {entries === null && <p className="muted">Загрузка</p>}
          {entries?.length === 0 && <p className="muted hs-empty">Изменений пока нет. История ведётся с момента выхода этой функции, прошлые правки не записаны</p>}
          {entries?.map((e) => {
            const lines = describeChanges(e.changes, ctx, projectName)
            if (lines.length === 0) return null
            const missingList = e.changes.projectId && !projects.some((p) => p.id === e.changes.projectId!.from)
            return (
              <article key={e.id} className="hs-entry">
                <div className="hs-body">
                  <time className="hs-time">{e.at ? formatMoment(e.at.toMillis(), ctx) : 'только что'}</time>
                  {lines.map((l) => (
                    <p key={l}>{l}</p>
                  ))}
                </div>
                {!missingList && (
                  <button className="hs-undo" onClick={() => onRollback(rollbackPatch(e.changes))}>
                    Вернуть
                  </button>
                )}
              </article>
            )
          })}
        </div>
      </section>
    </>
  )
}
