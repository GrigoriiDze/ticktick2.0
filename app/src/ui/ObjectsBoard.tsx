import { useMemo } from 'react'
import type { DateCtx } from '../domain/dates'
import { objectsByStage, plural, siteStats, STAGES } from '../domain/sites'
import type { Project, SiteStage, Task } from '../domain/types'

interface Props {
  projects: Project[]
  tasks: Task[]
  ctx: DateCtx
  onOpen: (projectId: string) => void
  onMove: (projectId: string, stage: SiteStage) => void
}

/** Доска объектов по этапам. Пустые этапы не показываем, чтобы не загромождать экран */
export function ObjectsBoard({ projects, tasks, ctx, onOpen, onMove }: Props) {
  const byStage = useMemo(() => objectsByStage(projects), [projects])
  const columns = STAGES.filter((s) => byStage[s.id].length > 0)

  if (columns.length === 0) return <p className="muted board-empty">Объектов нет</p>

  return (
    <div className="board">
      {columns.map((stage) => (
        <section key={stage.id} className="column">
          <h2>
            {stage.title} <span className="muted">{byStage[stage.id].length}</span>
          </h2>
          {byStage[stage.id].map((p) => {
            const stats = siteStats(p.id, tasks, ctx)
            const next = STAGES[STAGES.findIndex((s) => s.id === stage.id) + 1]
            return (
              <article key={p.id} className="object">
                <button className="object-main" onClick={() => onOpen(p.id)}>
                  <span className="object-name">{p.name}</span>
                  {p.site.address && <span className="muted">{p.site.address}</span>}
                  <span className="object-stats">
                    {stats.open} {plural(stats.open, ['задача', 'задачи', 'задач'])}
                    {stats.overdue > 0 && <span className="over">, просрочено {stats.overdue}</span>}
                    {stats.waiting > 0 && <span className={stats.stuck > 0 ? 'over' : ''}>, ждём {stats.waiting}</span>}
                    {stats.visits > 0 && <span>, выездов на неделе {stats.visits}</span>}
                  </span>
                </button>
                {next && (
                  <button className="ghost" onClick={() => onMove(p.id, next.id)} aria-label={`Перевести на этап «${next.title}»`}>
                    ›
                  </button>
                )}
              </article>
            )
          })}
        </section>
      ))}
    </div>
  )
}
