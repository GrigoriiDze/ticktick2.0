import { useEffect, useState } from 'react'
import type { View } from './view'

export type Tab = 'tasks' | 'calendar' | 'matrix' | 'pomo' | 'habits' | 'countdown' | 'settings' | 'assistant' | 'search'

export const DEFAULT_ACTIVE_TABS: Tab[] = [
  'tasks',
  'calendar',
  'matrix',
  'pomo',
  'habits',
  'countdown',
  'settings',
]

export const ALL_TAB_INFOS: Array<{ id: Tab; label: string; desc: string }> = [
  { id: 'tasks', label: 'Задача', desc: 'Управляйте своими задачами с помощью списков и фильтров.' },
  { id: 'calendar', label: 'Календарь', desc: 'Управляйте вашими задачами с помощью пяти видов календаря.' },
  { id: 'matrix', label: 'Матрица Эйзенхауэра', desc: 'Сосредоточьтесь на важных и срочных вещах.' },
  { id: 'pomo', label: 'Помодоро', desc: 'Используйте таймер или секундомер Помодоро, чтобы сохранить концентрацию.' },
  { id: 'habits', label: 'Привычка', desc: 'Сформируйте привычку и следите за ней.' },
  { id: 'countdown', label: 'обратный отсчет', desc: 'Запомните каждый особенный день.' },
  { id: 'settings', label: 'Настройки', desc: 'Просмотреть и изменить текущие настройки.' },
  { id: 'assistant', label: 'ИИ', desc: 'С помощью ИИ легко управлять задачами.' },
  { id: 'search', label: 'Поиск', desc: 'Быстрый и легкий поиск заданий.' },
]

const TABS_KEY = 'mobile_active_tabs_v2'
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
  if (view.type === 'countdown') return 'countdown'
  if (view.type === 'assistant') return 'assistant'
  if (view.type === 'search') return 'search'
  return 'tasks'
}

interface Props {
  active: Tab
  /** Число месяца для значка календаря: он показывает сегодняшнее число */
  dayOfMonth: number
  moreOpen?: boolean
  onSelect: (tab: Tab) => void
}

/** Иконки 1-в-1 по скриншотам оригинального TickTick (photo_1, photo_5, photo_9, photo_38, photo_39) */
export function TabIcon({ tab, day }: { tab: Tab; active?: boolean; day?: number }) {
  switch (tab) {
    case 'tasks':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" fill="currentColor" />
          <path
            className="tab-check-path"
            d="M8 12.2l2.7 2.7 5.3-5.4"
            fill="none"
            stroke="var(--bg, #f2f4f9)"
            strokeWidth="2.3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'calendar':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3.5" y="4.8" width="17" height="16.2" rx="4" fill="currentColor" />
          <path d="M8.5 2.6v3.2M15.5 2.6v3.2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <text
            x="12"
            y="16.4"
            textAnchor="middle"
            fontSize="9.8"
            fontWeight="800"
            fill="var(--bg, #f2f4f9)"
            stroke="none"
            style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
          >
            {day ?? 25}
          </text>
        </svg>
      )
    case 'matrix':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M7.3 3.8A3.5 3.5 0 0 1 10.8 7.3v2.5a1 1 0 0 1-1 1H7.3a3.5 3.5 0 1 1 0-7z" fill="currentColor" />
          <path d="M16.7 3.8a3.5 3.5 0 1 1 0 7h-2.5a1 1 0 0 1-1-1V7.3a3.5 3.5 0 0 1 3.5-3.5z" fill="currentColor" />
          <path d="M7.3 13.2h2.5a1 1 0 0 1 1 1v2.5a3.5 3.5 0 1 1-3.5-3.5z" fill="currentColor" />
          <path d="M14.2 13.2h2.5a3.5 3.5 0 1 1-3.5 3.5v-2.5a1 1 0 0 1 1-1z" fill="currentColor" />
        </svg>
      )
    case 'pomo':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" strokeWidth="2.3" />
          <circle cx="12" cy="12" r="3.6" fill="currentColor" />
        </svg>
      )
    case 'habits':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 3a7.5 7.5 0 0 1 7.5 7.5c0 4.8-5.5 9.2-7.5 10.5-2-1.3-7.5-5.7-7.5-10.5A7.5 7.5 0 0 1 12 3z"
            fill="currentColor"
          />
          <path
            d="M12 7.2v3.6h3"
            fill="none"
            stroke="var(--bg, #f2f4f9)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )
    case 'countdown':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3.5" y="4.8" width="17" height="16.2" rx="4" fill="currentColor" />
          <path d="M8.5 2.6v3.2M15.5 2.6v3.2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          <path
            d="M12 8.7l1.15 2.33 2.57.37-1.86 1.81.44 2.56L12 14.56l-2.3 1.21.44-2.56-1.86-1.81 2.57-.37L12 8.7z"
            fill="var(--bg, #f2f4f9)"
          />
        </svg>
      )
    case 'settings':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 2.8l7.4 4.3v9.8L12 21.2l-7.4-4.3V7.1L12 2.8z"
            fill="currentColor"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="3.2" fill="var(--bg, #f2f4f9)" />
        </svg>
      )
    case 'assistant':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M10.8 3c.5 4.2 2.8 6.5 7 7-4.2.5-6.5 2.8-7 7-.5-4.2-2.8-6.5-7-7 4.2-.5 6.5-2.8 7-7z"
            fill="currentColor"
          />
          <path
            d="M18.2 14.2c.2 1.6 1.1 2.5 2.7 2.7-1.6.2-2.5 1.1-2.7 2.7-.2-1.6-1.1-2.5-2.7-2.7 1.6-.2 2.5-1.1 2.7-2.7z"
            fill="currentColor"
          />
        </svg>
      )
    case 'search':
      return (
        <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" strokeWidth="2.2" />
          <path d="M16 16l4.2 4.2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      )
  }
}

export function TabBar({ active, dayOfMonth, onSelect }: Props) {
  const [tabs, setTabs] = useState<Tab[]>(getActiveTabs)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)

  useEffect(() => {
    const handler = () => setTabs(getActiveTabs())
    window.addEventListener(TABS_EVENT, handler)
    return () => window.removeEventListener(TABS_EVENT, handler)
  }, [])

  useEffect(() => {
    if (!moreMenuOpen) return
    const onBack = (e: Event) => {
      e.preventDefault()
      setMoreMenuOpen(false)
    }
    window.addEventListener('tt-back-request', onBack)
    return () => window.removeEventListener('tt-back-request', onBack)
  }, [moreMenuOpen])

  const tabMap = new Map(ALL_TAB_INFOS.map((t) => [t.id, t.label]))
  let maxTabs = 5
  try {
    const m = Number(localStorage.getItem('tt_max_tabs'))
    if (m >= 3 && m <= 5) maxTabs = m
  } catch {}
  const hasOverflow = tabs.length > maxTabs
  const visibleTabs = hasOverflow ? tabs.slice(0, maxTabs - 1) : tabs
  const overflowTabs = hasOverflow ? tabs.slice(maxTabs - 1) : []
  const isOverflowActive = overflowTabs.includes(active)

  return (
    <>
      {moreMenuOpen && overflowTabs.length > 0 && (
        <>
          <div className="m-tab-more-scrim" onClick={() => setMoreMenuOpen(false)} />
          <div className="m-tab-more-popup" role="menu" aria-label="Ещё">
            {overflowTabs.map((tabId) => {
              const on = tabId === active
              return (
                <button
                  key={tabId}
                  className={`m-tab-more-item${on ? ' on' : ''}`}
                  onClick={() => {
                    setMoreMenuOpen(false)
                    onSelect(tabId)
                  }}
                >
                  <span className="m-tab-more-icon">
                    <TabIcon tab={tabId} active={on} day={dayOfMonth} />
                  </span>
                  <span className="m-tab-more-label">{tabMap.get(tabId) ?? tabId}</span>
                </button>
              )
            })}
          </div>
        </>
      )}

      <nav className="tabbar" aria-label="Разделы">
        {visibleTabs.map((tabId) => {
          const on = tabId === active && !moreMenuOpen
          return (
            <button
              key={tabId}
              className={on ? 'tab on' : 'tab'}
              aria-label={tabMap.get(tabId) ?? tabId}
              aria-current={on ? 'page' : undefined}
              onClick={() => {
                setMoreMenuOpen(false)
                onSelect(tabId)
              }}
            >
              <TabIcon tab={tabId} active={on} day={dayOfMonth} />
            </button>
          )
        })}

        {hasOverflow && (
          <button
            className={isOverflowActive || moreMenuOpen ? 'tab on' : 'tab'}
            aria-label="Ещё"
            aria-expanded={moreMenuOpen}
            onClick={() => setMoreMenuOpen((v) => !v)}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true">
              <circle cx="5.5" cy="12" r="2" fill="currentColor" />
              <circle cx="12" cy="12" r="2" fill="currentColor" />
              <circle cx="18.5" cy="12" r="2" fill="currentColor" />
            </svg>
          </button>
        )}
      </nav>
    </>
  )
}
