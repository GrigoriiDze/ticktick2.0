import { useEffect, useState } from 'react'
import type { View } from './view'

export type Tab = 'tasks' | 'calendar' | 'matrix' | 'settings' | 'pomo' | 'habits'

export const DEFAULT_ACTIVE_TABS: Tab[] = ['tasks', 'calendar', 'matrix', 'settings']
export const ALL_TAB_INFOS: Array<{ id: Tab; label: string }> = [
  { id: 'tasks', label: 'Задача' },
  { id: 'calendar', label: 'Календарь' },
  { id: 'matrix', label: 'Матрица' },
  { id: 'settings', label: 'Настройки' },
  { id: 'pomo', label: 'Помодоро' },
  { id: 'habits', label: 'Привычка' },
]

const TABS_KEY = 'mobile_active_tabs'
const TABS_EVENT = 'tabchange'

export function getActiveTabs(): Tab[] {
  try {
    const raw = localStorage.getItem(TABS_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as Tab[]
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch {}
  return DEFAULT_ACTIVE_TABS
}

export function setActiveTabs(tabs: Tab[]): void {
  try {
    localStorage.setItem(TABS_KEY, JSON.stringify(tabs))
  } catch {}
  window.dispatchEvent(new Event(TABS_EVENT))
}

/** К какой вкладке относится экран на мобильном */
export function tabOf(view: View): Tab {
  if (view.type === 'calendar') return 'calendar'
  if (view.type === 'matrix') return 'matrix'
  if (view.type === 'settings') return 'settings'
  if (view.type === 'pomo') return 'pomo'
  if (view.type === 'habits') return 'habits'
  return 'tasks'
}

interface Props {
  active: Tab
  /** Число месяца для значка календаря: он показывает сегодняшнее число */
  dayOfMonth: number
  moreOpen?: boolean
  onSelect: (tab: Tab) => void
}

/** Иконки 1-в-1 по Photo 1, 2, 3, 6 из оригинального TickTick */
export function TabIcon({ tab, active, day }: { tab: Tab; active?: boolean; day?: number }) {
  switch (tab) {
    case 'tasks':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <rect
            x="3.5"
            y="3.5"
            width="17"
            height="17"
            rx="4.5"
            fill={active ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path
            d="M8.2 12.2l2.6 2.6 5-5.2"
            fill="none"
            stroke={active ? 'var(--bg, #fff)' : 'currentColor'}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'calendar':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <rect
            x="3.5"
            y="4.5"
            width="17"
            height="16"
            rx="3.5"
            fill={active ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.8"
          />
          <path d="M8 2.5v3.2M16 2.5v3.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <text
            x="12"
            y="16.5"
            textAnchor="middle"
            fontSize="9"
            fontWeight="700"
            fill={active ? 'var(--bg, #fff)' : 'currentColor'}
            stroke="none"
          >
            {day ?? 24}
          </text>
        </svg>
      )
    case 'matrix':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="4" y="4" width="6.5" height="6.5" rx="2.5" fill="currentColor" opacity={active ? 1 : 0.65} />
          <rect x="13.5" y="4" width="6.5" height="6.5" rx="2.5" fill="currentColor" opacity={active ? 1 : 0.65} />
          <rect x="4" y="13.5" width="6.5" height="6.5" rx="2.5" fill="currentColor" opacity={active ? 1 : 0.65} />
          <rect x="13.5" y="13.5" width="6.5" height="6.5" rx="2.5" fill="currentColor" opacity={active ? 1 : 0.65} />
        </svg>
      )
    case 'settings':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 2.8l7.2 4.15v8.3L12 21.4l-7.2-4.15V6.95L12 2.8z"
            fill={active ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="3" fill={active ? 'var(--bg, #fff)' : 'currentColor'} />
        </svg>
      )
    case 'pomo':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="13" r="8" />
          <path d="M12 9v4l2.5 2.5" strokeLinecap="round" />
          <path d="M10 2h4M12 2v3" strokeLinecap="round" />
        </svg>
      )
    case 'habits':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8">
          <circle cx="12" cy="12" r="8.5" />
          <path d="M8.5 12l2.5 2.5 5-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )
  }
}

export function TabBar({ active, dayOfMonth, onSelect }: Props) {
  const [tabs, setTabs] = useState<Tab[]>(getActiveTabs)

  useEffect(() => {
    const handler = () => setTabs(getActiveTabs())
    window.addEventListener(TABS_EVENT, handler)
    return () => window.removeEventListener(TABS_EVENT, handler)
  }, [])

  const tabMap = new Map(ALL_TAB_INFOS.map((t) => [t.id, t.label]))

  return (
    <nav className="tabbar" aria-label="Разделы">
      {tabs.map((tabId) => {
        const on = tabId === active
        return (
          <button
            key={tabId}
            className={on ? 'tab on' : 'tab'}
            aria-label={tabMap.get(tabId) ?? tabId}
            aria-current={on ? 'page' : undefined}
            onClick={() => onSelect(tabId)}
          >
            <TabIcon tab={tabId} active={on} day={dayOfMonth} />
          </button>
        )
      })}
    </nav>
  )
}
