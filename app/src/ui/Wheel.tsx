import { useEffect, useRef, useState } from 'react'

export interface WheelItem<T> {
  value: T
  label: string
}

interface Props<T> {
  items: Array<WheelItem<T>>
  value: T
  onChange: (value: T) => void
  label: string
}

const ITEM = 40

/** Барабан: список прокручивается, и значение под рамкой в середине выбрано. Работает на CSS scroll-snap */
export function Wheel<T extends string | number>({ items, value, onChange, label }: Props<T>) {
  const ref = useRef<HTMLDivElement>(null)
  const index = Math.max(0, items.findIndex((i) => i.value === value))
  const [live, setLive] = useState(index)
  const settle = useRef<number | undefined>(undefined)

  // Значение пришло снаружи: подвинуть барабан, если он ещё не там
  useEffect(() => {
    const el = ref.current
    if (el && Math.abs(el.scrollTop - index * ITEM) > 1) el.scrollTop = index * ITEM
    setLive(index)
  }, [index])

  useEffect(() => () => window.clearTimeout(settle.current), [])

  function onScroll() {
    const el = ref.current
    if (!el) return
    const i = Math.max(0, Math.min(items.length - 1, Math.round(el.scrollTop / ITEM)))
    setLive(i)
    window.clearTimeout(settle.current)
    settle.current = window.setTimeout(() => {
      if (items[i].value !== value) onChange(items[i].value)
    }, 90)
  }

  return (
    <div className="wheel" role="listbox" aria-label={label} ref={ref} onScroll={onScroll}>
      <div className="wheel-pad" />
      {items.map((item, i) => (
        <button
          key={String(item.value)}
          type="button"
          role="option"
          aria-selected={i === live}
          className={i === live ? 'wheel-item on' : Math.abs(i - live) === 1 ? 'wheel-item near' : 'wheel-item'}
          onClick={() => ref.current?.scrollTo({ top: i * ITEM, behavior: 'smooth' })}
        >
          {item.label}
        </button>
      ))}
      <div className="wheel-pad" />
    </div>
  )
}
