import { useEffect, useRef } from 'react'
import { useEditor, useEditorState, type Editor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { Placeholder } from '@tiptap/extensions'
import { markdownExtension } from './markdown'

interface Options {
  /** Описание задачи в формате markdown, как оно хранится */
  value: string
  placeholder: string
  /** Вызывается, когда пользователь дописал: через паузу, при уходе из поля и при закрытии */
  onCommit: (markdown: string) => void
}

const PAUSE_MS = 700

/**
 * Редактор описания задачи: пишешь как в обычном документе (заголовки, жирный, списки, чек-листы),
 * а хранится обычный markdown, поэтому описания из TickTick читаются без преобразований.
 * Пока ничего не набрали, текст не перезаписывается: описание не меняется оттого, что его открыли
 */
export function useRichEditor({ value, placeholder, onCommit }: Options): Editor | null {
  const commit = useRef(onCommit)
  commit.current = onCommit
  // Последнее значение, которое знаем сохранённым: с ним сравниваем, чтобы не писать зря
  const saved = useRef(value)
  const timer = useRef<number | undefined>(undefined)
  const pending = useRef<string | null>(null)
  // Всё, что сами отправили: эхо собственных правок от сервера не должно перезаписывать поле
  const mine = useRef(new Set<string>([value]))

  const flush = () => {
    window.clearTimeout(timer.current)
    if (pending.current !== null && pending.current !== saved.current) {
      saved.current = pending.current
      mine.current.add(pending.current)
      commit.current(pending.current)
    }
    pending.current = null
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: { openOnClick: false } }),
      Highlight,
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder }),
      markdownExtension(),
    ],
    content: value,
    contentType: 'markdown',
    editorProps: { attributes: { class: 'rich', 'aria-label': 'Описание', role: 'textbox', 'aria-multiline': 'true' } },
    onUpdate: ({ editor: ed }) => {
      pending.current = ed.getMarkdown()
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(flush, PAUSE_MS)
    },
    onBlur: flush,
  })

  // Описание изменили на другом устройстве, пока поле не в работе: подтягиваем
  useEffect(() => {
    if (!editor || editor.isFocused || pending.current !== null) return
    if (mine.current.has(value)) return
    if (value !== saved.current) {
      saved.current = value
      mine.current.add(value)
      editor.commands.setContent(value, { contentType: 'markdown', emitUpdate: false })
    }
  }, [editor, value])

  // Закрыли карточку, не дождавшись паузы: сохраняем
  useEffect(() => flush, []) // eslint-disable-line react-hooks/exhaustive-deps

  return editor
}

const ICON = { width: 20, height: 20, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const

/** Панель форматирования: заголовок, жирный, выделение, чек-лист, списки, отступы, курсив, подчёркивание, зачёркивание */
export function FormatBar({ editor }: { editor: Editor }) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      h: e.isActive('heading'),
      bold: e.isActive('bold'),
      mark: e.isActive('highlight'),
      task: e.isActive('taskList'),
      bullet: e.isActive('bulletList'),
      ordered: e.isActive('orderedList'),
      italic: e.isActive('italic'),
      underline: e.isActive('underline'),
      strike: e.isActive('strike'),
    }),
  })
  const run = (fn: () => boolean) => (e: React.MouseEvent) => {
    e.preventDefault()
    fn()
  }
  const chain = () => editor.chain().focus()
  const btn = (key: string, label: string, active: boolean, fn: () => boolean, icon: React.ReactNode) => (
    <button key={key} type="button" className={active ? 'fb on' : 'fb'} aria-label={label} aria-pressed={active} onMouseDown={run(fn)}>
      {icon}
    </button>
  )
  const indent = () => (editor.isActive('taskItem') ? chain().sinkListItem('taskItem').run() : chain().sinkListItem('listItem').run())
  const outdent = () => (editor.isActive('taskItem') ? chain().liftListItem('taskItem').run() : chain().liftListItem('listItem').run())

  return (
    <div className="format-bar" role="toolbar" aria-label="Форматирование">
      {btn('h', 'Заголовок', s.h, () => chain().toggleHeading({ level: 2 }).run(), <span className="fb-text">H</span>)}
      {btn('bold', 'Жирный', s.bold, () => chain().toggleBold().run(), <span className="fb-text bold">B</span>)}
      {btn(
        'mark',
        'Выделение',
        s.mark,
        () => chain().toggleHighlight().run(),
        <svg {...ICON}>
          <path d="M5 19l3.5-.5 9-9-3-3-9 9L5 19zM13.5 6.5l3 3M4 21h6" />
        </svg>,
      )}
      {btn(
        'task',
        'Чек-лист',
        s.task,
        () => chain().toggleTaskList().run(),
        <svg {...ICON}>
          <rect x="4" y="4" width="16" height="16" rx="3.5" />
          <path d="M8.5 12.2l2.5 2.5 4.5-5" />
        </svg>,
      )}
      {btn(
        'bullet',
        'Маркированный список',
        s.bullet,
        () => chain().toggleBulletList().run(),
        <svg {...ICON}>
          <path d="M9 7h11M9 12h11M9 17h11" />
          <circle cx="4.8" cy="7" r="1" fill="currentColor" />
          <circle cx="4.8" cy="12" r="1" fill="currentColor" />
          <circle cx="4.8" cy="17" r="1" fill="currentColor" />
        </svg>,
      )}
      {btn(
        'ordered',
        'Нумерованный список',
        s.ordered,
        () => chain().toggleOrderedList().run(),
        <svg {...ICON}>
          <path d="M10 7h10M10 12h10M10 17h10M4.5 5.5l1.2-.7v4M4 14.2c.4-.6 1.8-.6 1.8.5 0 .9-1.6 1.1-1.8 2.3h2" />
        </svg>,
      )}
      {btn(
        'indent',
        'Сдвинуть вправо',
        false,
        indent,
        <svg {...ICON}>
          <path d="M4 6h16M12 11h8M12 16h8M4 20h16M4 10l3 2-3 2z" />
        </svg>,
      )}
      {btn(
        'outdent',
        'Сдвинуть влево',
        false,
        outdent,
        <svg {...ICON}>
          <path d="M4 6h16M12 11h8M12 16h8M4 20h16M8 10l-3 2 3 2z" />
        </svg>,
      )}
      {btn('italic', 'Курсив', s.italic, () => chain().toggleItalic().run(), <span className="fb-text italic">I</span>)}
      {btn('underline', 'Подчёркивание', s.underline, () => chain().toggleUnderline().run(), <span className="fb-text underline">U</span>)}
      {btn('strike', 'Зачёркивание', s.strike, () => chain().toggleStrike().run(), <span className="fb-text strike">S</span>)}
    </div>
  )
}
