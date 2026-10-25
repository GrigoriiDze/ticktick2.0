import { useEffect, useState, type ReactNode } from 'react'
import { CheckIcon, ChevronRight } from './icons'

export interface PopItem {
  key: string
  title: string
  /** Уточнение мелким шрифтом рядом с названием */
  hint?: string
  checked?: boolean
  /** Стрелка: пункт ведёт на следующий экран */
  chevron?: boolean
  danger?: boolean
  icon?: ReactNode
  onPick: () => void
}

interface Props {
  items: PopItem[]
  label: string
  onClose: () => void
}

/** Всплывающий список по центру экрана: пункты с галочкой выбранного. Нажатие в стороне закрывает */
export function PopMenu({ items, label, onClose }: Props) {
  const [out, setOut] = useState(false)
  const dismiss = () => {
    setOut(true)
    window.setTimeout(onClose, 150)
  }
  // Esc закрывает меню
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && dismiss()
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })
  return (
    <>
      <div className={out ? 'scrim on top leaving' : 'scrim on top'} onClick={dismiss} />
      <div className={out ? 'pop leaving' : 'pop'} role="menu" aria-label={label}>
        {items.map((it) => (
          <button
            key={it.key}
            role="menuitem"
            className={it.danger ? 'pop-item danger' : it.checked ? 'pop-item on' : 'pop-item'}
            onClick={() => {
              onClose()
              it.onPick()
            }}
          >
            {it.icon && <span className="pop-icon">{it.icon}</span>}
            <span className="pop-title">
              {it.title}
              {it.hint && <span className="pop-hint"> ({it.hint})</span>}
            </span>
            {it.checked && <CheckIcon size={18} />}
            {it.chevron && <ChevronRight size={18} />}
          </button>
        ))}
      </div>
    </>
  )
}
