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

type StatusFilter = 'all' | 'open' | 'done'

/** Поиск по всем задачам, спискам и тегам с фильтрацией по статусу (все, активные, выполненные) */
export function SearchScreen({ tasks, projects, projectInfo, ctx, actions, onOpenProject, onOpenTag }: Props) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedProject, setSelectedProject] = useState<string | null>(null)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)

  const result = useMemo(() => searchWorkspace(tasks, projects, query), [tasks, projects, query])

  const filteredTasks = useMemo(() => {
    let list = result.tasks
    if (statusFilter === 'open') {
      list = list.filter((t) => t.status === 'open')
    } else if (statusFilter === 'done') {
      list = list.filter((t) => t.status === 'done')
    }
    if (selectedProject) {
      list = list.filter((t) => t.projectId === selectedProject)
    }
    if (selectedTag) {
      list = list.filter((t) => t.tags && t.tags.includes(selectedTag))
    }
    return list
  }, [result.tasks, statusFilter, selectedProject, selectedTag])

  const openCount = useMemo(() => result.tasks.filter((t) => t.status === 'open').length, [result.tasks])
  const doneCount = useMemo(() => result.tasks.filter((t) => t.status === 'done').length, [result.tasks])

  const nothing = result.tasks.length === 0 && result.projects.length === 0 && result.tags.length === 0

  return (
    <div className="search-screen">
      <div className="search-bar">
        <SearchIcon size={20} />
        <input
          autoFocus
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Поиск по задачам, спискам и тегам"
          aria-label="Поиск"
          enterKeyHint="search"
        />
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
          <div className="search-filters">
            <div className="search-status-tabs">
              <button
                type="button"
                className={`search-tab${statusFilter === 'all' ? ' on' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                Все <span className="tab-count">{result.tasks.length}</span>
              </button>
              <button
                type="button"
                className={`search-tab${statusFilter === 'open' ? ' on' : ''}`}
                onClick={() => setStatusFilter('open')}
              >
                Активные <span className="tab-count">{openCount}</span>
              </button>
              <button
                type="button"
                className={`search-tab${statusFilter === 'done' ? ' on' : ''}`}
                onClick={() => setStatusFilter('done')}
              >
                Выполненные <span className="tab-count">{doneCount}</span>
              </button>
            </div>

            {(result.projects.length > 0 || result.tags.length > 0) && (
              <div className="search-lists">
                {result.projects.map((p) => {
                  const isSel = selectedProject === p.id
                  return (
                    <button
                      key={p.id}
                      className={`chip${isSel ? ' on' : ''}`}
                      onClick={() => (isSel ? onOpenProject(p.id) : setSelectedProject(p.id))}
                      title={isSel ? 'Нажмите ещё раз, чтобы открыть список' : 'Фильтровать по списку'}
                    >
                      <ListIcon size={16} /> {p.name}
                    </button>
                  )
                })}
                {result.tags.map((t) => {
                  const isSel = selectedTag === t.tag
                  return (
                    <button
                      key={t.tag}
                      className={`chip${isSel ? ' on' : ''}`}
                      onClick={() => (isSel ? onOpenTag(t.tag) : setSelectedTag(t.tag))}
                      title={isSel ? 'Нажмите ещё раз, чтобы открыть тег' : 'Фильтровать по тегу'}
                    >
                      <TagIcon size={16} /> {t.tag} <span className="muted">{t.count}</span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {filteredTasks.length > 0 ? (
            <TaskList
              tasks={filteredTasks}
              groups={null}
              projects={projectInfo}
              ctx={ctx}
              listKey={`search:${query}:${statusFilter}:${selectedProject ?? ''}:${selectedTag ?? ''}`}
              actions={actions}
            />
          ) : (
            <p className="muted search-hint" style={{ marginTop: 24, textAlign: 'center' }}>
              Нет задач, соответствующих выбранным фильтрам
            </p>
          )}
        </>
      )}
    </div>
  )
}
