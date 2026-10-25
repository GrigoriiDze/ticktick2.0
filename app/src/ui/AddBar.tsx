import { useState, useMemo, type FormEvent } from 'react'
import { parseSmart } from '../domain/smartdate'
import type { DateCtx } from '../domain/dates'
import type { Priority } from '../domain/types'
import { CalendarIcon, FlagIcon } from './icons'

interface Props {
  /** Название списка, в который попадёт задача */
  target: string
  ctx: DateCtx
  onAdd: (text: string, priority?: Priority) => void
}

/** Строка добавления над списком на большом экране: печатаешь, Enter, задача в списке. Дату можно написать словами */
export function AddBar({ target, ctx, onAdd }: Props) {
  const [text, setText] = useState('')
  const [priority, setPriority] = useState<Priority>(0)
  const [showPriorityMenu, setShowPriorityMenu] = useState(false)

  const smart = useMemo(() => {
    if (!text.trim()) return null
    const s = parseSmart(text, ctx)
    if (!s.day) return null
    return s
  }, [text, ctx])

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    onAdd(text, priority)
    setText('')
    setPriority(0)
    setShowPriorityMenu(false)
  }

  return (
    <form className="addbar" onSubmit={submit}>
      <span className="addbar-plus" aria-hidden="true">
        +
      </span>
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={`Добавить задачу в «${target}», нажмите Enter для сохранения`}
        aria-label="Новая задача"
        enterKeyHint="done"
      />

      {/* Распознанная дата на лету */}
      {smart && (
        <span className="addbar-smart-tag" title="Дата определена автоматически">
          <CalendarIcon size={14} />
          <span>{smart.day}{smart.time ? ` ${smart.time}` : ''}</span>
        </span>
      )}

      {/* Быстрый выбор приоритета */}
      <div className="addbar-actions">
        <button
          type="button"
          className={priority > 0 ? `addbar-btn flag p${priority}` : 'addbar-btn'}
          onClick={() => setShowPriorityMenu(!showPriorityMenu)}
          title="Приоритет"
          aria-label="Приоритет"
        >
          <FlagIcon size={16} />
        </button>

        {showPriorityMenu && (
          <div className="addbar-popover">
            {([
              { p: 5 as Priority, label: 'Высокий' },
              { p: 3 as Priority, label: 'Средний' },
              { p: 1 as Priority, label: 'Низкий' },
              { p: 0 as Priority, label: 'Без приоритета' },
            ]).map((item) => (
              <button
                type="button"
                key={item.p}
                className={priority === item.p ? 'addbar-pop-item on' : 'addbar-pop-item'}
                onClick={() => {
                  setPriority(item.p)
                  setShowPriorityMenu(false)
                }}
              >
                <FlagIcon size={14} className={item.p > 0 ? `flag p${item.p}` : undefined} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </form>
  )
}
