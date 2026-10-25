import { useState, type FormEvent, type ReactNode } from 'react'
import { SMART_LISTS, type SmartListId } from '../domain/dates'
import { buildSidebar } from '../domain/sidebar'
import { INBOX_ID, type Project, type ProjectGroup } from '../domain/types'
import { SideIcon, Triangle } from './Desk'
import { ChevronDown, ChevronRight, ListIcon, TagIcon, TrashIcon } from './icons'
import { PopMenu, type PopItem } from './PopMenu'
import { sameView, viewKey, type View } from './view'

interface Props {
  open: boolean
  /** Большой экран: меню висит слева постоянно, без затемнения и закрытия после выбора */
  docked?: boolean
  /** Какие умные списки показываются в меню. Остальные доступны через настройки */
  smartIds: SmartListId[]
  view: View
  projects: Project[]
  groups: ProjectGroup[]
  counts: Record<string, number>
  email: string | null
  /** Раздел «Объекты» показываем, только когда есть хотя бы один объект */
  objectsCount: number
  /** Теги и корзина показываются, только когда они есть */
  tags: Array<{ tag: string; count: number }>
  /** Раздел «Зависло» виден, только когда есть задачи с меткой «ждём» */
  waiting: { total: number; stuck: number }
  trashCount: number
  onSelect: (view: View) => void
  onClose: () => void
  onCreateProject: (name: string) => void
  onCreateGroup: (name: string) => void
  onRenameGroup: (id: string, name: string) => void
  onDeleteGroup: (id: string) => void
  onToggleGroup: (id: string, collapsed: boolean) => void
  onMoveToGroup?: (projectId: string, groupId: string | null) => void
  onSettings: () => void
  /** Число на значке «Сегодня» в меню большого экрана */
  dayOfMonth?: number
}

type Adding = 'list' | 'group' | null

export function Drawer(props: Props) {
  const { open, view, projects, groups, counts, email, objectsCount, tags, waiting, trashCount, onSelect, onClose } = props
  const [adding, setAdding] = useState<Adding>(null)
  const [name, setName] = useState('')
  const [addMenu, setAddMenu] = useState(false)
  const [groupMenu, setGroupMenu] = useState<ProjectGroup | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const [renameText, setRenameText] = useState('')
  const [folded, setFolded] = useState<Record<string, boolean>>({})
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null)

  const tree = buildSidebar(projects, groups)
  const pick = (v: View) => {
    onSelect(v)
    if (!props.docked) onClose()
  }
  const item = (v: View, title: string, count?: number, icon?: ReactNode) => (
    <button key={viewKey(v)} className={sameView(v, view) ? 'nav on' : 'nav'} onClick={() => pick(v)}>
      {icon && <span className="nav-icon">{icon}</span>}
      <span className="nav-title">{title}</span>
      {count ? <span className="nav-count">{count}</span> : null}
    </button>
  )

  function create(e: FormEvent) {
    e.preventDefault()
    const text = name.trim()
    if (!text) return
    if (adding === 'group') props.onCreateGroup(text)
    else {
      props.onCreateProject(text)
      onClose()
    }
    setName('')
    setAdding(null)
  }

  function commitRename(e: FormEvent) {
    e.preventDefault()
    const text = renameText.trim()
    if (renaming && text) props.onRenameGroup(renaming, text)
    setRenaming(null)
  }

  const groupItems = (g: ProjectGroup): PopItem[] => [
    {
      key: 'rename',
      title: 'Переименовать',
      onPick: () => {
        setRenameText(g.name)
        setRenaming(g.id)
      },
    },
    { key: 'delete', title: 'Удалить папку', danger: true, icon: <TrashIcon size={20} />, onPick: () => props.onDeleteGroup(g.id) },
  ]
  const addItems: PopItem[] = [
    { key: 'list', title: 'Список', icon: <ListIcon size={20} />, onPick: () => setAdding('list') },
    { key: 'group', title: 'Папка', icon: <TagIcon size={20} aria-hidden="true" />, onPick: () => setAdding('group') },
  ]

  const login = email ? email.split('@')[0] : 'Аккаунт'

  if (props.docked) {
    const side = (v: View, title: string, icon: ReactNode, count?: number, color?: string | null, on = sameView(v, view)) => (
      <button key={viewKey(v)} className={on ? 'sd-item on' : 'sd-item'} onClick={() => onSelect(v)}>
        <span className="sd-icon">{icon}</span>
        <span className="sd-title">{title}</span>
        {color && <i className="sd-dot" style={{ background: color }} />}
        {count ? <span className="sd-count">{count}</span> : null}
      </button>
    )
    const head = (key: string, title: string, add?: () => void) => (
      <div className="sd-head">
        <button className="sd-head-btn" onClick={() => setFolded((f) => ({ ...f, [key]: !f[key] }))} aria-expanded={!folded[key]}>
          <Triangle open={!folded[key]} />
          <span>{title}</span>
        </button>
        {add && (
          <button className="sd-add" onClick={add} aria-label={`Добавить: ${title}`}>
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M8 2.5v11M2.5 8h11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            </svg>
          </button>
        )}
      </div>
    )
    const smart = (['all', 'today', 'tomorrow', 'week', 'highPriority', 'nodate'] as SmartListId[]).filter((id) => props.smartIds.includes(id) || id === 'today' || id === 'all')
    const inboxOn = (view.type === 'project' && view.id === INBOX_ID) || (view.type === 'smart' && view.id === 'inbox')
    return (
      <>
        <aside className="drawer docked on sd">
          <div className="sd-scroll">
            {smart.map((id) => side({ type: 'smart', id }, SMART_LISTS.find((l) => l.id === id)!.title, id === 'all' ? SideIcon.all() : id === 'week' ? SideIcon.week() : id === 'highPriority' ? SideIcon.priority() : id === 'nodate' ? SideIcon.nodate() : SideIcon.today(id === 'tomorrow' ? (props.dayOfMonth ?? 1) + 1 : (props.dayOfMonth ?? 1)), counts[`smart:${id}`]))}
            {side({ type: 'project', id: INBOX_ID }, 'Входящие', SideIcon.inbox(), counts[`project:${INBOX_ID}`], null, inboxOn)}
            <hr />
            {head('lists', 'Список', () => setAddMenu(true))}
            {!folded.lists && (
              <>
                {objectsCount > 0 && side({ type: 'objects' }, 'Объекты', SideIcon.folder(), objectsCount)}
                {waiting.total > 0 && side({ type: 'waiting' }, 'Зависло', SideIcon.list(), waiting.total)}
                {tree.map((entry) => {
                  if (entry.kind === 'project') {
                    const p = entry.project
                    return (
                      <div
                        key={p.id}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', p.id)
                          e.dataTransfer.effectAllowed = 'move'
                        }}
                      >
                        {side({ type: 'project', id: p.id }, p.name, SideIcon.list(), counts[`project:${p.id}`], p.color)}
                      </div>
                    )
                  }
                  const g = entry.group
                  const total = entry.projects.reduce((n, p) => n + (counts[`project:${p.id}`] ?? 0), 0)
                  const isOver = dragOverGroup === g.id
                  return (
                    <div
                      key={g.id}
                      className={`sd-group${isOver ? ' drag-over' : ''}`}
                      onDragOver={(e) => {
                        e.preventDefault()
                        if (dragOverGroup !== g.id) setDragOverGroup(g.id)
                      }}
                      onDragLeave={(e) => {
                        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                          setDragOverGroup(null)
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault()
                        setDragOverGroup(null)
                        const pid = e.dataTransfer.getData('text/plain')
                        if (pid && props.onMoveToGroup) props.onMoveToGroup(pid, g.id)
                      }}
                    >
                      <div className="sd-group-head">
                        <button
                          type="button"
                          className="sd-item"
                          onClick={() => props.onToggleGroup(g.id, !g.collapsed)}
                          onContextMenu={(e) => (e.preventDefault(), setGroupMenu(g))}
                          aria-expanded={!g.collapsed}
                        >
                          <span className="sd-icon">{SideIcon.folder()}</span>
                          <span className="sd-title">{g.name}</span>
                          {total > 0 && <span className="sd-count">{total}</span>}
                          <Triangle open={!g.collapsed} />
                        </button>
                        <button
                          type="button"
                          className="ghost folder-more-btn"
                          onClick={() => setGroupMenu(g)}
                          aria-label={`Действия с папкой ${g.name}`}
                        >
                          ⋯
                        </button>
                      </div>
                      {!g.collapsed && entry.projects.map((p) => (
                        <div
                          key={p.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('text/plain', p.id)
                            e.dataTransfer.effectAllowed = 'move'
                          }}
                        >
                          {side({ type: 'project', id: p.id }, p.name, SideIcon.list(), counts[`project:${p.id}`], p.color)}
                        </div>
                      ))}
                    </div>
                  )
                })}
                {adding && (
                  <form className="nav-add" onSubmit={create}>
                    <input autoFocus value={name} onChange={(e) => setName(e.target.value)} onBlur={() => !name.trim() && setAdding(null)} placeholder={adding === 'group' ? 'Название папки' : 'Название списка'} enterKeyHint="done" />
                  </form>
                )}
              </>
            )}
            {tags.length > 0 && (
              <>
                {head('tags', 'Метки')}
                {!folded.tags && tags.map((t) => side({ type: 'tag', id: t.tag }, t.tag, SideIcon.tag(), t.count))}
              </>
            )}
            <hr />
            {side({ type: 'smart', id: 'done' }, 'Выполнено', SideIcon.done())}
            {side({ type: 'smart', id: 'wontdo' }, 'Не будет выполнено', SideIcon.wontdo())}
            {side({ type: 'trash' }, 'Корзина', SideIcon.trash())}
          </div>
        </aside>
        {addMenu && <PopMenu label="Добавить" items={addItems} onClose={() => setAddMenu(false)} />}
        {groupMenu && <PopMenu label="Папка" items={groupItems(groupMenu)} onClose={() => setGroupMenu(null)} />}
      </>
    )
  }

  return (
    <>
      {!props.docked && <div className={open ? 'scrim on' : 'scrim'} onClick={onClose} />}
      <aside className={props.docked ? 'drawer docked on' : open ? 'drawer on' : 'drawer'} aria-hidden={!props.docked && !open}>
        <div className="drawer-head">
          <span className="drawer-avatar" aria-hidden="true">
            {login.slice(0, 1).toUpperCase()}
          </span>
          <span className="drawer-name">{login}</span>
          <button className="ghost" onClick={() => (props.onSettings(), onClose())} aria-label="Настройки">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3h0a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5h0a1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8v0a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
            </svg>
          </button>
        </div>

        <div className="drawer-list">
          {SMART_LISTS.filter((l) => props.smartIds.includes(l.id)).map((l) => item({ type: 'smart', id: l.id }, l.title, counts[`smart:${l.id}`]))}
          <hr />
          {objectsCount > 0 && item({ type: 'objects' }, 'Объекты', objectsCount)}
          {waiting.total > 0 && item({ type: 'waiting' }, 'Зависло', waiting.total)}

          {tree.map((entry) => {
            if (entry.kind === 'project') {
              const p = entry.project
              return item({ type: 'project', id: p.id }, p.name, counts[`project:${p.id}`])
            }
            const g = entry.group
            const total = entry.projects.reduce((n, p) => n + (counts[`project:${p.id}`] ?? 0), 0)
            return (
              <div key={g.id} className="nav-group">
                {renaming === g.id ? (
                  <form className="nav-add" onSubmit={commitRename}>
                    <input autoFocus value={renameText} onChange={(e) => setRenameText(e.target.value)} onBlur={commitRename} aria-label="Название папки" enterKeyHint="done" />
                  </form>
                ) : (
                  <div className="nav group-row">
                    <button className="group-toggle" onClick={() => props.onToggleGroup(g.id, !g.collapsed)} aria-expanded={!g.collapsed} aria-label={`Папка ${g.name}`}>
                      <span className="nav-icon">{g.collapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}</span>
                      <span className="nav-title">{g.name}</span>
                      {total > 0 && <span className="nav-count">{total}</span>}
                    </button>
                    <button className="ghost folder-more" onClick={() => setGroupMenu(g)} aria-label={`Действия с папкой ${g.name}`}>
                      <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                        <circle cx="5.5" cy="12" r="1.8" fill="currentColor" />
                        <circle cx="12" cy="12" r="1.8" fill="currentColor" />
                        <circle cx="18.5" cy="12" r="1.8" fill="currentColor" />
                      </svg>
                    </button>
                  </div>
                )}
                {!g.collapsed && (
                  <div className="nav-children">
                    {entry.projects.map((p) => item({ type: 'project', id: p.id }, p.name, counts[`project:${p.id}`]))}
                    {entry.projects.length === 0 && <p className="muted nav-empty">В папке пусто</p>}
                  </div>
                )}
              </div>
            )
          })}

          {adding && (
            <form className="nav-add" onSubmit={create}>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => !name.trim() && setAdding(null)}
                placeholder={adding === 'group' ? 'Название папки' : 'Название списка'}
                enterKeyHint="done"
              />
            </form>
          )}

          {tags.length > 0 && (
            <>
              <hr />
              {tags.map((t) => item({ type: 'tag', id: t.tag }, `#${t.tag}`, t.count))}
            </>
          )}
          <hr />
          {(counts['smart:wontdo'] ?? 0) > 0 && item({ type: 'smart', id: 'wontdo' }, 'Не будет выполнено', counts['smart:wontdo'])}
          {trashCount > 0 && item({ type: 'trash' }, 'Корзина', trashCount)}
        </div>

        <div className="drawer-foot">
          <button className="nav add-list" onClick={() => setAddMenu(true)}>
            <span className="nav-icon">+</span>
            <span className="nav-title">Добавить</span>
          </button>
        </div>
      </aside>

      {addMenu && <PopMenu label="Добавить" items={addItems} onClose={() => setAddMenu(false)} />}
      {groupMenu && <PopMenu label="Папка" items={groupItems(groupMenu)} onClose={() => setGroupMenu(null)} />}
    </>
  )
}
