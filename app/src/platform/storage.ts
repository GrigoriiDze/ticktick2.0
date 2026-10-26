/**
 * Типизированный фасад для работы с LocalStorage приложения.
 * Безопасен к переполнению квоты, недоступности в приватном режиме,
 * автоматически переключается на in-memory хранилище в SSR / тестах,
 * поддерживает валидацию типов, значения по умолчанию и реактивную подписку.
 */

export const STORAGE_KEYS = {
  // Навигация и вид
  VIEW: 'view',
  LAST_TASKS_VIEW: 'last-tasks-view',
  SMART_BOARD_MODE: 'smart-board-mode',
  DRAWER_MENU_LISTS: 'menu-lists',
  TAB_ITEMS: 'tt_tabs_v2',
  MAX_TABS: 'tt_max_tabs',
  USER_CACHE: 'tt_user_cache',

  // Сортировка и группировка
  SORT_MODE: 'sort-mode',
  SORT_ORDER: 'sort-order',
  GROUP_MODE: 'group-mode',
  COLLAPSED_GROUPS: 'collapsed-groups',

  // Календарь
  CAL_VIEW: 'cal-view',
  CAL_SHOW_DONE: 'cal-show-done',
  CAL_SIDE_OPEN: 'cal-side-open',
  CAL_FILTER_PROJECTS: 'cal-filter-projects',

  // Тема и оформление
  THEME_MODE: 'tt_theme_mode',
  ACCENT_COLOR: 'tt_accent_color',
  THEME_SWATCH: 'tt_theme_swatch_v3',
  FONT_SIZE: 'tt_font_size',
  HIDE_SIDEBAR_COUNTS: 'tt_hide_sidebar_counts',
  HIDE_NOTES: 'tt_hide_notes',
  HIDE_LIST_COLOR: 'tt_hide_list_color',

  // Звуки и вибрация
  COMPLETION_SOUND: 'tt_completion_sound',
  NOTIFICATION_SOUND: 'tt_notification_sound',
  SOUND_DONE_ENABLED: 'tt_sound_done',
  VIBRATE_DONE_ENABLED: 'tt_vibrate_done',
  VIBRATE_NOTIF_ENABLED: 'tt_vibrate_notif',

  // Уведомления и напоминания
  DAILY_REMINDER_ENABLED: 'tt_daily_reminder_enabled',
  DAILY_REMINDER_TIME: 'tt_daily_reminder_time',
  STATUS_BAR_NOTIF: 'tt_status_bar_notif',
  REMINDER_POPUP_ENABLED: 'tt_reminder_popup',
  REMINDERS_HANDLED: 'tt_reminders_handled_v2',
  DEFAULT_REMINDER_NONE: 'tt_default_reminder_none',
  DEFAULT_REMINDER_ALLDAY: 'tt_default_reminder_allday',

  // Поведение создания задач
  DEFAULT_PRIORITY: 'tt_default_priority',
  DEFAULT_DATE: 'tt_default_date',
  SMART_DATE_REC: 'tt_smart_date_rec',
  SMART_TAG_REC: 'tt_smart_tag_rec',
  SMART_REMOVE_TEXT: 'tt_smart_remove_text',
  TASK_VIEW_MODE: 'tt_task_mode',

  // Фокус и Помодоро
  POMO_SESSIONS: 'pomo_sessions',
  POMO_SESSIONS_V2: 'pomo-sessions-v2',
  POMO_MINS: 'tt_pomo_mins',
  SHORT_BREAK_MINS: 'tt_short_break_mins',
  LONG_BREAK_MINS: 'tt_long_break_mins',
  LONG_BREAK_INTERVAL: 'tt_long_break_interval',
  AUTO_NEXT_POMO: 'tt_auto_next_pomo',
  AUTO_START_BREAK: 'tt_auto_start_break',
  WHITE_NOISE: 'tt_white_noise',

  // Разное
  COUNTDOWN_MODE: 'countdown-mode',
  TIME_FORMAT: 'time-format',
  FIRST_DAY: 'first-day',
  AI_USAGE: 'tt_ai_usage_v1',
  AI_CHAT: 'tt_assistant_chat_v1',
} as const

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS] | string

type StorageListener = (val: unknown) => void

const listeners = new Map<string, Set<StorageListener>>()
const inMemoryFallback = new Map<string, string>()

function getStorage(): { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void } {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage
    if (typeof localStorage !== 'undefined') return localStorage
  } catch {}
  return {
    getItem: (k: string) => inMemoryFallback.get(k) ?? null,
    setItem: (k: string, v: string) => { inMemoryFallback.set(k, v) },
    removeItem: (k: string) => { inMemoryFallback.delete(k) },
  }
}

function notify(key: string, val: unknown): void {
  const set = listeners.get(key)
  if (set) {
    for (const fn of set) {
      try {
        fn(val)
      } catch (e) {
        console.error(`Storage listener error for "${key}":`, e)
      }
    }
  }
}

export const StorageService = {
  get<T>(key: StorageKey, fallback: T): T {
    try {
      const storage = getStorage()
      const raw = storage.getItem(key)
      if (raw === null) return fallback
      return JSON.parse(raw) as T
    } catch {
      return fallback
    }
  },

  set<T>(key: StorageKey, val: T): void {
    try {
      const storage = getStorage()
      storage.setItem(key, JSON.stringify(val))
      notify(key, val)
    } catch (e) {
      console.warn(`StorageService.set error for "${key}":`, e)
    }
  },

  getString(key: StorageKey, fallback: string): string {
    try {
      const storage = getStorage()
      const raw = storage.getItem(key)
      return raw !== null ? raw : fallback
    } catch {
      return fallback
    }
  },

  setString(key: StorageKey, val: string): void {
    try {
      const storage = getStorage()
      storage.setItem(key, val)
      notify(key, val)
    } catch (e) {
      console.warn(`StorageService.setString error for "${key}":`, e)
    }
  },

  getBool(key: StorageKey, fallback: boolean): boolean {
    try {
      const storage = getStorage()
      const raw = storage.getItem(key)
      if (raw === null) return fallback
      return raw === '1' || raw === 'true'
    } catch {
      return fallback
    }
  },

  setBool(key: StorageKey, val: boolean): void {
    try {
      const storage = getStorage()
      const raw = val ? '1' : '0'
      storage.setItem(key, raw)
      notify(key, val)
    } catch (e) {
      console.warn(`StorageService.setBool error for "${key}":`, e)
    }
  },

  getNumber(key: StorageKey, fallback: number): number {
    try {
      const storage = getStorage()
      const raw = storage.getItem(key)
      if (raw === null) return fallback
      const n = Number(raw)
      return Number.isFinite(n) ? n : fallback
    } catch {
      return fallback
    }
  },

  setNumber(key: StorageKey, val: number): void {
    try {
      const storage = getStorage()
      storage.setItem(key, String(val))
      notify(key, val)
    } catch (e) {
      console.warn(`StorageService.setNumber error for "${key}":`, e)
    }
  },

  remove(key: StorageKey): void {
    try {
      const storage = getStorage()
      storage.removeItem(key)
      notify(key, null)
    } catch (e) {
      console.warn(`StorageService.remove error for "${key}":`, e)
    }
  },

  /** Очистка для тестов */
  clear(): void {
    inMemoryFallback.clear()
    try {
      if (typeof window !== 'undefined' && window.localStorage) window.localStorage.clear()
      if (typeof localStorage !== 'undefined') localStorage.clear()
    } catch {}
  },

  /** Подписка на изменения ключа из любого места приложения */
  subscribe(key: StorageKey, listener: StorageListener): () => void {
    let set = listeners.get(key)
    if (!set) {
      set = new Set()
      listeners.set(key, set)
    }
    set.add(listener)
    return () => {
      set?.delete(listener)
      if (set && set.size === 0) listeners.delete(key)
    }
  },
}

