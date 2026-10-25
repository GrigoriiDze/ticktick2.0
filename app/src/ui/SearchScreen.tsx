import { useMemo, useState } from 'react'
import type { DateCtx } from '../domain/dates'
import { searchWorkspace } from '../domain/search'
import type { Project, Task } from '../domain/types'
import type { ProjectInfo } from './Desk'
import { CloseIcon, ListIcon, SearchIcon, TagIcon } from './icons'
import { Empty, TaskList, type RowActions } from './TaskList'

interface Props {
  tasks: Task[]
  projects: Project[]
  projectInfo: ProjectInfo
  ctx: DateCtx
  actions: RowActions
  onOpenProject: (id: string) => void
  onOpenTag: (tag: string) => void
}

/** Поиск по всем задачам сразу, включая выполненные: по названию, описанию, меткам, адресу, пунктам чек-листа и названию списка */
export function SearchScreen({ tasks, projects, projectInfo, ctx, actions, onOpenProject, onOpenTag }: Props) {
  const [query, setQuery] = useState('')
  const result = useMemo(() => searchWorkspace(tasks, projects, query), [tasks, projects, query])
  const nothing = result.tasks.length === 0 && result.projects.length === 0 && result.tags.length === 0

  return (
    <div className="search-screen">
      <div className="search-bar">
        <SearchIcon size={20} />
        <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Поиск по всем задачам" aria-label="Поиск" enterKeyHint="search" />
        {query && (
          <button className="ghost" onClick={() => setQuery('')} aria-label="Очистить поиск">
            <CloseIcon size={18} />
          </button>
        )}
      </div>

      {!query.trim() ? (
        <p className="muted search-hint">Ищу в названиях, описаниях, метках, адресах и пунктах чек-листа, в том числе среди выполненных задач</p>
      ) : nothing ? (
        <Empty title="Ничего не найдено" />
      ) : (
        <>
          {(result.projects.length > 0 || result.tags.length > 0) && (
            <div className="search-lists">
              {result.projects.map((p) => (
                <button key={p.id} className="chip" onClick={() => onOpenProject(p.id)}>
                  <ListIcon size={16} /> {p.name}
                </button>
              ))}
              {result.tags.map((t) => (
                <button key={t.tag} className="chip" onClick={() => onOpenTag(t.tag)}>
                  <TagIcon size={16} /> {t.tag} <span className="muted">{t.count}</span>
                </button>
              ))}
            </div>
          )}
          {result.tasks.length > 0 && <TaskList tasks={result.tasks} groups={null} projects={projectInfo} ctx={ctx} listKey={`search:${query}`} actions={actions} />}
        </>
      )}
    </div>
  )
}
