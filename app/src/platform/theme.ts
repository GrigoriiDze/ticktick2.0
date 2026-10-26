export type ThemeMode = 'system' | 'light' | 'dark'

const KEY = 'tt_theme_v3'
export const THEME_EVENT = 'themechange'

export function getTheme(): ThemeMode {
  try {
    const v = localStorage.getItem(KEY)
    if (v === 'light' || v === 'dark' || v === 'system') return v
  } catch {
    // хранилище недоступно, берём светлую по умолчанию
  }
  return 'light'
}

/** Тёмная ли тема сейчас: выбранная вручную или системная */
export function isDark(): boolean {
  const mode = getTheme()
  if (mode === 'dark') return true
  if (mode === 'light') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

function apply(mode: ThemeMode): void {
  const root = document.documentElement
  if (mode === 'system') {
    const dark = typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
    root.setAttribute('data-theme', dark ? 'dark' : 'light')
  } else {
    root.setAttribute('data-theme', mode)
  }
  window.dispatchEvent(new Event(THEME_EVENT))
}

export function applyDisplayPrefs(): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  try {
    const fontSize = localStorage.getItem('tt_font_size') || 'normal'
    root.setAttribute('data-font-size', fontSize)
    root.setAttribute('data-hide-sidebar-counts', localStorage.getItem('tt_hide_sidebar_counts') === '1' ? '1' : '0')
    root.setAttribute('data-hide-notes', localStorage.getItem('tt_hide_notes') === '1' ? '1' : '0')
    root.setAttribute('data-hide-list-color', localStorage.getItem('tt_hide_list_color') === '1' ? '1' : '0')
  } catch {}
}

/** Применяет сохранённую тему и настройки экрана до первой отрисовки, чтобы не мигало */
export function initTheme(): void {
  apply(getTheme())
  applyDisplayPrefs()
}

export function setTheme(mode: ThemeMode): void {
  try {
    if (mode === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, mode)
  } catch {
    // не страшно, тема применится до перезапуска
  }
  apply(mode)
}

export type Accent = 'orange' | 'blue' | 'green' | 'purple' | 'red' | 'pink' | 'yellow' | 'slate' | 'gray' | 'indigo'

export const ACCENTS: Array<{ id: Accent; title: string; color: string }> = [
  { id: 'orange', title: 'Оранжевый', color: '#f16905' },
  { id: 'blue', title: 'Синий', color: '#4772fa' },
  { id: 'green', title: 'Зелёный', color: '#2faa6b' },
  { id: 'purple', title: 'Фиолетовый', color: '#8a63e6' },
  { id: 'red', title: 'Красный', color: '#e5484d' },
  { id: 'pink', title: 'Розовый', color: '#ec4899' },
  { id: 'yellow', title: 'Жёлтый', color: '#f59e0b' },
  { id: 'slate', title: 'Чёрный', color: '#1e293b' },
  { id: 'gray', title: 'Серый', color: '#64748b' },
  { id: 'indigo', title: 'Индиго', color: '#6366f1' },
]

const ACCENT_KEY = 'tt_accent_v3'

export function getAccent(): Accent {
  try {
    const v = localStorage.getItem(ACCENT_KEY)
    if (ACCENTS.some((a) => a.id === v)) return v as Accent
  } catch {
    // хранилище недоступно, берём по умолчанию
  }
  // В оригинальном TickTick по умолчанию фирменный синий #4772fa на всех платформах
  return 'blue'
}

function applyAccent(a: Accent): void {
  document.documentElement.setAttribute('data-accent', a)
}

export function initAccent(): void {
  applyAccent(getAccent())
  applyDisplayPrefs()
}

export function setAccent(a: Accent): void {
  try {
    localStorage.setItem(ACCENT_KEY, a)
  } catch {
    // не страшно
  }
  applyAccent(a)
}

export type TaskViewMode = 'page' | 'dialog'

const TASK_MODE_KEY = 'task-view'

const MENU_LISTS_KEY = 'menu-lists'
export const MENU_LIST_CHOICES = [
  ['today', 'Сегодня'],
  ['tomorrow', 'Завтра'],
  ['week', 'Следующие 7 дней'],
  ['inbox', 'Входящие'],
  ['all', 'Все'],
  ['highPriority', 'Высокий приоритет'],
  ['nodate', 'Без срока'],
] as const
export type MenuListId = (typeof MENU_LIST_CHOICES)[number][0]

/** Какие встроенные списки показывать в боковом меню. Как в TickTick по умолчанию: только Сегодня и Входящие */
export function getMenuLists(): MenuListId[] {
  try {
    const raw = localStorage.getItem(MENU_LISTS_KEY)
    if (raw) {
      const ids = JSON.parse(raw) as string[]
      return MENU_LIST_CHOICES.map(([id]) => id).filter((id) => ids.includes(id))
    }
  } catch {
    // хранилище недоступно
  }
  return ['today', 'inbox']
}

export function setMenuLists(ids: MenuListId[]): void {
  try {
    localStorage.setItem(MENU_LISTS_KEY, JSON.stringify(ids))
  } catch {
    // не страшно
  }
}

/** Карточка задачи: страница на весь экран или окно снизу */
export function getTaskMode(): TaskViewMode {
  try {
    return localStorage.getItem(TASK_MODE_KEY) === 'page' ? 'page' : 'dialog'
  } catch {
    return 'dialog'
  }
}

export function setTaskMode(mode: TaskViewMode): void {
  try {
    localStorage.setItem(TASK_MODE_KEY, mode)
  } catch {
    // не страшно
  }
}
