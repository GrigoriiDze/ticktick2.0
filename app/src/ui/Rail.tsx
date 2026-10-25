import type { ReactNode } from 'react'

export type RailItem = 'tasks' | 'calendar' | 'matrix' | 'habits' | 'countdown' | 'search' | 'assistant'

interface Props {
  active: RailItem | null
  letter: string
  onSelect: (item: RailItem) => void
  onSettings: () => void
}

/** Значки полосы нарисованы для этого приложения: залитые фигуры на сетке 24 на 24 */
const fill = { width: 26, height: 26, viewBox: '0 0 24 24', 'aria-hidden': true }
const ITEMS: Array<{ id: RailItem; title: string; icon: ReactNode }> = [
  {
    id: 'tasks',
    title: 'Задачи',
    icon: (
      <svg {...fill}>
        <rect x="3" y="3" width="18" height="18" rx="4.5" fill="currentColor" />
        <path d="M7.6 12.3l3 3 5.8-6.4" fill="none" stroke="var(--rail-bg)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'calendar',
    title: 'Календарь',
    icon: (
      <svg {...fill}>
        <path d="M3 8a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4z" fill="currentColor" />
        <path d="M3.5 8.5h17" stroke="var(--rail-bg)" strokeWidth="1.6" />
        <g fill="var(--rail-bg)">
          <circle cx="8" cy="12.5" r="1.1" />
          <circle cx="12" cy="12.5" r="1.1" />
          <circle cx="16" cy="12.5" r="1.1" />
          <circle cx="8" cy="16.5" r="1.1" />
          <circle cx="12" cy="16.5" r="1.1" />
        </g>
      </svg>
    ),
  },
  {
    id: 'matrix',
    title: 'Матрица Эйзенхауэра',
    icon: (
      <svg {...fill}>
        <g fill="currentColor">
          <rect x="3" y="3" width="8.2" height="8.2" rx="3.4" />
          <rect x="12.8" y="3" width="8.2" height="8.2" rx="3.4" />
          <rect x="3" y="12.8" width="8.2" height="8.2" rx="3.4" />
          <rect x="12.8" y="12.8" width="8.2" height="8.2" rx="3.4" />
        </g>
      </svg>
    ),
  },
  {
    id: 'habits',
    title: 'Привычки',
    icon: (
      <svg {...fill}>
        <circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <circle cx="12" cy="12" r="3.6" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'countdown',
    title: 'Обратный отсчёт',
    icon: (
      <svg {...fill}>
        <circle cx="12" cy="12" r="9" fill="currentColor" />
        <path d="M12 7.5V12h3.5" fill="none" stroke="var(--rail-bg)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: 'assistant',
    title: 'Помощник',
    icon: (
      <svg {...fill}>
        <path d="M10 3l1.7 4.6L16.3 9.3l-4.6 1.7L10 15.6 8.3 11 3.7 9.3l4.6-1.7z" fill="currentColor" />
        <path d="M17.5 13l.9 2.4 2.4.9-2.4.9-.9 2.4-.9-2.4-2.4-.9 2.4-.9z" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: 'search',
    title: 'Поиск',
    icon: (
      <svg {...fill}>
        <circle cx="10.8" cy="10.8" r="6.6" fill="none" stroke="currentColor" strokeWidth="2.3" />
        <path d="M15.8 15.8l4.4 4.4" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" />
      </svg>
    ),
  },
]

/** Узкая полоса значков слева на большом экране: разделы приложения */
export function Rail({ active, letter, onSelect, onSettings }: Props) {
  return (
    <nav className="rail" aria-label="Разделы">
      <span className="rail-avatar" aria-hidden="true">
        {letter}
      </span>
      <div className="rail-items">
        {ITEMS.map((it) => (
          <button key={it.id} className={it.id === active ? 'rail-btn on' : 'rail-btn'} onClick={() => onSelect(it.id)} aria-label={it.title} title={it.title} aria-current={it.id === active ? 'page' : undefined}>
            {it.icon}
          </button>
        ))}
      </div>
      <button className="rail-btn" onClick={onSettings} aria-label="Настройки" title="Настройки">
        <svg {...fill}>
          <path
            fill="currentColor"
            fillRule="evenodd"
            d="M10.3 2.5h3.4l.6 2.6 1.6.9 2.5-.9 1.7 2.9-2 1.8v1.9l2 1.8-1.7 2.9-2.5-.9-1.6.9-.6 2.6h-3.4l-.6-2.6-1.6-.9-2.5.9-1.7-2.9 2-1.8v-1.9l-2-1.8 1.7-2.9 2.5.9 1.6-.9zM12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"
          />
        </svg>
      </button>
    </nav>
  )
}
