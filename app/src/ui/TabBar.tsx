import type { View } from './view'

export type Tab = 'tasks' | 'calendar' | 'habits' | 'more'

/** К какой вкладке относится экран. Списки, теги, объекты, «Зависло» и корзина живут во вкладке задач */
export function tabOf(view: View): Tab {
  if (view.type === 'calendar') return 'calendar'
  if (view.type === 'habits') return 'habits'
  return 'tasks'
}

interface Props {
  active: Tab
  /** Число месяца для значка календаря: он показывает сегодняшнее число */
  dayOfMonth: number
  moreOpen: boolean
  onSelect: (tab: Tab) => void
}

const ICON = { width: 28, height: 28, viewBox: '0 0 24 24', 'aria-hidden': true } as const

/** Значки нарисованы для этого приложения. Активный залит цветом, неактивный контуром */
function Icon({ tab, active, day }: { tab: Tab; active: boolean; day: number }) {
  const fill = 'currentColor'
  const knock = { fill: active ? '#fff' : 'var(--bar)' }
  const stroke = { stroke: 'currentColor', strokeWidth: 1.9, strokeLinecap: 'round', strokeLinejoin: 'round' } as const
  switch (tab) {
    case 'tasks':
      return (
        <svg {...ICON}>
          <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" fill={fill} {...stroke} />
          <path d="M8 12.4l2.9 2.9 5.3-5.8" fill="none" {...stroke} stroke={active ? '#fff' : 'var(--bar)'} />
        </svg>
      )
    case 'calendar':
      return (
        <svg {...ICON}>
          <rect x="3.5" y="4.8" width="17" height="15.7" rx="3.5" fill={fill} {...stroke} />
          <path d="M8 2.8v3.6M16 2.8v3.6" {...stroke} />
          <text x="12" y="16.4" textAnchor="middle" fontSize="8.5" fontWeight="700" style={knock} stroke="none">
            {day}
          </text>
        </svg>
      )
    case 'habits':
      return (
        <svg {...ICON}>
          <path d="M19.6 12a7.6 7.6 0 1 1-2.4-5.5" fill="none" {...stroke} strokeWidth={active ? 2.6 : 1.9} />
          <path d="M19.6 3.8v4.6h-4.6" fill="none" {...stroke} strokeWidth={active ? 2.6 : 1.9} />
        </svg>
      )
    case 'more':
      return (
        <svg {...ICON}>
          <circle cx="5.5" cy="12" r="1.9" fill="currentColor" />
          <circle cx="12" cy="12" r="1.9" fill="currentColor" />
          <circle cx="18.5" cy="12" r="1.9" fill="currentColor" />
        </svg>
      )
  }
}

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'tasks', label: 'Задачи' },
  { id: 'calendar', label: 'Календарь' },
  { id: 'habits', label: 'Привычки' },
  { id: 'more', label: 'Ещё' },
]

export function TabBar({ active, dayOfMonth, moreOpen, onSelect }: Props) {
  return (
    <nav className="tabbar" aria-label="Разделы">
      {TABS.map((t) => {
        const on = t.id === 'more' ? moreOpen : t.id === active
        return (
          <button key={t.id} className={on ? 'tab on' : 'tab'} aria-label={t.label} aria-current={on ? 'page' : undefined} onClick={() => onSelect(t.id)}>
            <Icon tab={t.id} active={on && t.id !== 'more'} day={dayOfMonth} />
          </button>
        )
      })}
    </nav>
  )
}
