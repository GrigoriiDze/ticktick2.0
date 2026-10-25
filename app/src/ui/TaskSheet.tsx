import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { EditorContent } from '@tiptap/react'
import { datePatchOf, dateValueOf, describeDateValue } from '../domain/datevalue'
import type { DateCtx } from '../domain/dates'
import { navigatorUrl } from '../domain/sites'
import { WAITING_KINDS } from '../domain/waiting'
import { checklistProgress, hasTag, nextItemOrder, normalizeTag, sortedItems } from '../domain/extras'
import type { ChecklistItem, Priority, Project, Task } from '../domain/types'
import type { TaskPatch } from '../data/tasks'
import { canShare } from '../platform/share'
import type { TaskViewMode } from '../platform/theme'
import { DatePicker } from './DatePicker'
import { findPhones } from '../domain/phones'
import { plainText } from '../domain/extras'
import { CalendarIcon, ChevronDown, DuplicateIcon, ChevronLeft, FlagIcon, HistoryIcon, ListIcon, PinIcon, ShareIcon, SkipIcon, SubtaskIcon, TagIcon, TrashIcon } from './icons'
import { Attachments } from './Attachments'
import type { TaskFile } from '../domain/files'
import { PopMenu, type PopItem } from './PopMenu'
import { FormatBar, useRichEditor } from './RichEditor'

interface Props {
  task: Task
  ctx: DateCtx
  projects: Project[]
  /** Страница на весь экран или окно снизу: выбирается в «Ещё» */
  mode: TaskViewMode
  onChange: (patch: TaskPatch) => void
  /** Тот же список тегов, что есть у других задач, для подсказок */
  allTags: string[]
  /** Меняет пункт чек-листа, null убирает его */
  onItem: (itemId: string | null, item: ChecklistItem | null) => void
  onTag: (tag: string, add: boolean) => void
  /** Заменяет напоминания задачи, пустой список убирает их */
  onReminders: (triggers: string[]) => void
  onToggle: () => void
  onPin: () => void
  onShare: () => void
  onSkip: () => void
  onHistory: () => void
  onDuplicate: () => void
  /** Файлы задачи и действия с ними */
  files: TaskFile[]
  fileStatus: string | null
  onAddFiles: (files: File[]) => void
  onOpenFile: (file: TaskFile) => void
  onRemoveFile: (file: TaskFile) => void
  onDelete: () => void
  onClose: () => void
  leaving?: boolean
  /** Большой экран: карточка встаёт колонкой справа, список остаётся доступным */
  docked?: boolean
  /** Куда сразу поставить курсор, если карточку открыли из меню задачи */
  focus?: 'item' | 'tag' | null
}

const PRIORITIES: Array<{ value: Priority; title: string }> = [
  { value: 5, title: 'Высокий приоритет' },
  { value: 3, title: 'Средний приоритет' },
  { value: 1, title: 'Низкий приоритет' },
  { value: 0, title: 'Без приоритета' },
]

type Menu = 'project' | 'priority' | 'more' | null

export function TaskSheet(props: Props) {
  const { task, ctx, projects, mode, allTags, onItem, onTag, onChange, onReminders, onClose, focus } = props
  const [title, setTitle] = useState(task.title)
  const [picking, setPicking] = useState(false)
  const [menu, setMenu] = useState<Menu>(null)
  const [showFormat, setShowFormat] = useState(false)
  const [addingItem, setAddingItem] = useState(focus === 'item')
  const [showTag, setShowTag] = useState(focus === 'tag')
  const [showAddress, setShowAddress] = useState(false)
  const [address, setAddress] = useState(task.address ?? '')
  useEffect(() => setAddress(task.address ?? ''), [task.id, task.address])
  useEffect(() => setTitle(task.title), [task.id, task.title])

  const editor = useRichEditor({ value: task.content, placeholder: 'Описание', onCommit: (content) => onChange({ content }) })

  const phones = findPhones(`${task.title}\n${plainText(task.content)}`)
  const dateValue = dateValueOf(task, ctx)
  const summary = describeDateValue(dateValue, ctx)
  const done = task.status !== 'open'
  const project = projects.find((p) => p.id === task.projectId)
  const addressRef = useRef<HTMLInputElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const titleBox = useRef<HTMLTextAreaElement>(null)
  // Длинное название переносится на следующие строки, а не уходит за край
  useLayoutEffect(() => {
    const el = titleBox.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [title])

  function applyDate(v: typeof dateValue) {
    const p = datePatchOf(v, ctx)
    onChange(p.fields)
    onReminders(p.reminders)
  }

  function commitTitle() {
    const text = title.trim()
    if (!text) setTitle(task.title)
    else if (text !== task.title) onChange({ title: text })
  }

  const projectItems: PopItem[] = projects.map((p) => ({ key: p.id, title: p.name, checked: p.id === task.projectId, icon: <ListIcon size={20} />, onPick: () => onChange({ projectId: p.id }) }))
  const priorityItems: PopItem[] = PRIORITIES.map((p) => ({
    key: String(p.value),
    title: p.title,
    checked: task.priority === p.value,
    icon: <FlagIcon size={20} className={`flag p${p.value}`} />,
    onPick: () => onChange({ priority: p.value }),
  }))
  const moreItems: PopItem[] = [
    { key: 'pin', title: task.pinnedAt !== null ? 'Открепить' : 'Закрепить', icon: <PinIcon size={20} aria-hidden="true" role="presentation" />, onPick: props.onPin },
    ...(canShare() ? [{ key: 'share', title: 'Поделиться', icon: <ShareIcon size={20} />, onPick: props.onShare }] : []),
    { key: 'skip', title: task.status === 'wontdo' ? 'Вернуть в работу' : 'Не буду делать', icon: <SkipIcon size={20} />, onPick: props.onSkip },
    { key: 'duplicate', title: 'Дублировать', icon: <DuplicateIcon size={20} />, onPick: props.onDuplicate },
    { key: 'history', title: 'История изменений', icon: <HistoryIcon size={20} />, onPick: props.onHistory },
    { key: 'del', title: 'Удалить', danger: true, icon: <TrashIcon size={20} />, onPick: props.onDelete },
  ]

  const body = (
    <>
      <header className="tp-head">
        <button className="round" onClick={onClose} aria-label={props.docked ? 'Закрыть панель' : mode === 'page' ? 'Назад' : 'Закрыть'}>
          {props.docked ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <ChevronLeft size={22} />
          )}
        </button>
        <button className="tp-project" onClick={() => setMenu('project')} aria-label="Список задачи">
          <span>{project?.name ?? 'Список'}</span>
          <ChevronDown size={14} />
        </button>
        <span className="tp-spacer" />
        <button className="round" onClick={() => setMenu('priority')} aria-label="Приоритет">
          <FlagIcon size={20} className={task.priority ? `flag p${task.priority}` : undefined} />
        </button>
        <button className="round" onClick={() => setMenu('more')} aria-label="Ещё">
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="5.5" cy="12" r="1.8" fill="currentColor" />
            <circle cx="12" cy="12" r="1.8" fill="currentColor" />
            <circle cx="18.5" cy="12" r="1.8" fill="currentColor" />
          </svg>
        </button>
      </header>

      <div className="tp-scroll">
        <div className="tp-date">
          <input type="checkbox" className={`p${task.priority}`} checked={done} onChange={props.onToggle} aria-label={done ? 'Вернуть в работу' : 'Выполнить'} />
          <button className={summary ? 'date-row on' : 'date-row'} onClick={() => setPicking(true)}>
            <CalendarIcon size={20} />
            <span>{summary || 'Дата и напоминание'}</span>
          </button>
        </div>

        <textarea
          ref={titleBox}
          className="sheet-title"
          rows={1}
          value={title}
          onChange={(e) => setTitle(e.target.value.replace(/[\r\n]+/g, ' '))}
          onBlur={commitTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              ;(e.target as HTMLTextAreaElement).blur()
            }
          }}
          aria-label="Название"
        />

        {phones.length > 0 && (
          <div className="phones">
            {phones.map((p) => (
              <a key={p.href} className="chip call" href={p.href}>
                Позвонить {p.text}
              </a>
            ))}
          </div>
        )}

        <EditorContent editor={editor} className="rich-wrap" />

        <Attachments files={props.files} status={props.fileStatus} onOpen={props.onOpenFile} onRemove={props.onRemoveFile} />

        <Checklist task={task} onItem={onItem} adding={addingItem} setAdding={setAddingItem} />

        {(showTag || task.tags.length > 0) && <TagEditor tags={task.tags} all={allTags} onTag={onTag} autoFocus={showTag && task.tags.length === 0} />}

        {(showAddress || task.address) && (
          <div className="field-row address-row">
            <input
              ref={addressRef}
              value={address}
              placeholder="Адрес"
              autoFocus={showAddress && !task.address}
              onChange={(e) => setAddress(e.target.value)}
              onBlur={() => address.trim() !== (task.address ?? '') && onChange({ address: address.trim() || null })}
              onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
              aria-label="Адрес"
            />
            {navigatorUrl(address) && (
              <a className="field-action" href={navigatorUrl(address)!} target="_blank" rel="noopener noreferrer">
                В навигатор
              </a>
            )}
          </div>
        )}

        <div className="waiting">
          <label className="field">
            <span className="field-label">Ждём</span>
            <select
              className="plain-select"
              value={task.waiting?.kind ?? 'none'}
              onChange={(e) => {
                const v = e.target.value
                onChange({ waiting: v === 'none' ? null : { kind: v as NonNullable<Task['waiting']>['kind'], until: task.waiting?.until ?? null } })
              }}
            >
              <option value="none">Ничего не ждём</option>
              {WAITING_KINDS.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.title}
                </option>
              ))}
            </select>
          </label>
          {task.waiting && (
            <label className="field">
              <span className="field-label">До какого числа ждём</span>
              <input
                className="plain-select"
                type="date"
                value={task.waiting.until ?? ''}
                onChange={(e) => onChange({ waiting: { kind: task.waiting!.kind, until: e.target.value || null } })}
              />
            </label>
          )}
        </div>
      </div>

      <div className="tp-bottom">
        {showFormat && editor && <FormatBar editor={editor} />}
        <div className="tp-tools" role="toolbar" aria-label="Инструменты">
          <button className="fb" onClick={() => setShowTag(true)} aria-label="Метка">
            <TagIcon size={22} />
          </button>
          <button className="fb" onClick={() => setAddingItem(true)} aria-label="Подзадача">
            <SubtaskIcon size={22} />
          </button>
          <button
            className="fb"
            onClick={() => {
              setShowAddress(true)
              window.setTimeout(() => addressRef.current?.focus(), 0)
            }}
            aria-label="Адрес"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" />
              <circle cx="12" cy="10" r="2.3" />
            </svg>
          </button>
          <button className="fb" onClick={() => fileInput.current?.click()} aria-label="Прикрепить файл">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M20 11.5l-7.6 7.6a5 5 0 0 1-7-7l8-8a3.4 3.4 0 0 1 4.8 4.8l-8 8a1.7 1.7 0 0 1-2.4-2.4l7.4-7.4" />
            </svg>
          </button>
          <input
            ref={fileInput}
            type="file"
            multiple
            hidden
            onChange={(e) => {
              const picked = [...(e.target.files ?? [])]
              e.target.value = ''
              if (picked.length) props.onAddFiles(picked)
            }}
          />
          <button className={showFormat ? 'fb on' : 'fb'} onClick={() => setShowFormat((v) => !v)} aria-label="Форматирование" aria-pressed={showFormat}>
            <span className="fb-text">A</span>
          </button>
          <span className="tp-spacer" />
          <button className="fb" onMouseDown={(e) => (e.preventDefault(), editor?.chain().focus().undo().run())} aria-label="Отменить правку" disabled={!editor?.can().undo()}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 7 5 11l4 4M5 11h9a4.5 4.5 0 0 1 0 9h-3" />
            </svg>
          </button>
          <button className="fb" onMouseDown={(e) => (e.preventDefault(), editor?.chain().focus().redo().run())} aria-label="Вернуть правку" disabled={!editor?.can().redo()}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 7 4 4-4 4M19 11h-9a4.5 4.5 0 0 0 0 9h3" />
            </svg>
          </button>
        </div>
      </div>

      {menu === 'project' && <PopMenu label="Список задачи" items={projectItems} onClose={() => setMenu(null)} />}
      {menu === 'priority' && <PopMenu label="Приоритет" items={priorityItems} onClose={() => setMenu(null)} />}
      {menu === 'more' && <PopMenu label="Действия" items={moreItems} onClose={() => setMenu(null)} />}
      {picking && <DatePicker ctx={ctx} value={dateValue} onApply={applyDate} onClose={() => setPicking(false)} />}
    </>
  )

  if (mode === 'page') {
    return (
      <section className={props.leaving ? 'page task-page leaving' : 'page task-page'} role="dialog" aria-label="Задача">
        {body}
      </section>
    )
  }
  return (
    <>
      <div className={['scrim on', props.leaving ? 'leaving' : '', props.docked ? 'clear' : ''].filter(Boolean).join(' ')} onClick={onClose} />
      <section className={props.leaving ? 'sheet task-dialog leaving' : 'sheet task-dialog'} role="dialog" aria-label="Задача">
        {body}
      </section>
    </>
  )
}

function Checklist({
  task,
  onItem,
  adding,
  setAdding,
}: {
  task: Task
  onItem: (id: string | null, item: ChecklistItem | null) => void
  adding: boolean
  setAdding: (v: boolean) => void
}) {
  const items = sortedItems(task.items)
  const [text, setText] = useState('')
  const { done, total } = checklistProgress(task.items)

  function add() {
    const title = text.trim()
    setText('')
    if (!title) return
    onItem(null, { title, done: false, sortOrder: nextItemOrder(task.items) })
  }

  if (items.length === 0 && !adding) return null

  return (
    <div className="checklist">
      {total > 0 && (
        <p className="muted progress">
          {done} из {total}
        </p>
      )}
      <ul>
        {items.map(([id, item]) => (
          <li key={id} className={item.done ? 'done' : ''}>
            <input
              type="checkbox"
              checked={item.done}
              onChange={(e) => onItem(id, { ...item, done: e.target.checked, ...(e.target.checked ? { completedAt: Date.now() } : { completedAt: undefined }) })}
              aria-label={item.title || 'Пункт'}
            />
            <ItemTitle value={item.title} onCommit={(title) => (title ? onItem(id, { ...item, title }) : onItem(id, null))} />
            <button className="ghost" onClick={() => onItem(id, null)} aria-label="Удалить пункт">
              ×
            </button>
          </li>
        ))}
      </ul>
      <input
        className="add-item-input"
        value={text}
        placeholder="Новая подзадача"
        enterKeyHint="done"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && add()}
        onBlur={() => {
          add()
          if (items.length === 0) setAdding(false)
        }}
        autoFocus={adding}
      />
    </div>
  )
}

function ItemTitle({ value, onCommit }: { value: string; onCommit: (title: string) => void }) {
  const [v, setV] = useState(value)
  useEffect(() => setV(value), [value])
  return (
    <input
      className="item-title"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => v.trim() !== value && onCommit(v.trim())}
      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      aria-label="Название пункта"
    />
  )
}

function TagEditor({ tags, all, onTag, autoFocus }: { tags: string[]; all: string[]; onTag: (tag: string, add: boolean) => void; autoFocus: boolean }) {
  const [text, setText] = useState('')
  const listId = 'known-tags'

  function add() {
    const tag = normalizeTag(text)
    setText('')
    if (tag && !hasTag(tags, tag)) onTag(tag, true)
  }

  return (
    <div className="tag-editor">
      {tags.map((t) => (
        <button key={t} className="chip on tag-chip" onClick={() => onTag(t, false)} aria-label={`Убрать тег ${t}`}>
          #{t} ×
        </button>
      ))}
      <input
        value={text}
        list={listId}
        autoFocus={autoFocus}
        placeholder="# тег"
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && add()}
        onBlur={add}
        aria-label="Новый тег"
      />
      <datalist id={listId}>
        {all.filter((t) => !hasTag(tags, t)).map((t) => (
          <option key={t} value={t} />
        ))}
      </datalist>
    </div>
  )
}
