import { SMART_LISTS, type SmartListId } from '../domain/dates'
import { INBOX_ID, type Project } from '../domain/types'

export type View =
  | { type: 'smart'; id: SmartListId }
  | { type: 'project'; id: string }
  | { type: 'tag'; id: string }
  | { type: 'objects' }
  | { type: 'trash' }
  | { type: 'calendar' }
  | { type: 'habits' }
  | { type: 'waiting' }
  | { type: 'matrix' }
  | { type: 'countdown' }
  | { type: 'search' }
  | { type: 'assistant' }
  | { type: 'pomo' }

export const DEFAULT_VIEW: View = { type: 'smart', id: 'today' }

export function viewKey(v: View): string {
  return v.type === 'objects' || v.type === 'trash' || v.type === 'calendar' || v.type === 'habits' || v.type === 'matrix' || v.type === 'countdown' || v.type === 'search' || v.type === 'assistant' || v.type === 'waiting' || v.type === 'pomo' ? v.type : `${v.type}:${v.id}`
}

export function sameView(a: View, b: View): boolean {
  return viewKey(a) === viewKey(b)
}

export function viewTitle(view: View, projects: Project[]): string {
  if (view.type === 'objects') return 'Объекты'
  if (view.type === 'trash') return 'Корзина'
  if (view.type === 'calendar') return 'Календарь'
  if (view.type === 'habits') return 'Привычки'
  if (view.type === 'waiting') return 'Зависло'
  if (view.type === 'matrix') return 'Матрица Эйзенхауэра'
  if (view.type === 'countdown') return 'Обратный отсчёт'
  if (view.type === 'search') return 'Поиск'
  if (view.type === 'assistant') return 'Помощник'
  if (view.type === 'pomo') return 'Фокус'
  if (view.type === 'tag') return `#${view.id}`
  if (view.type === 'smart') return SMART_LISTS.find((l) => l.id === view.id)!.title
  return projects.find((p) => p.id === view.id)?.name ?? (view.id === INBOX_ID ? 'Входящие' : 'Список')
}

/** В какой проект попадает новая задача, созданная в этом списке */
export function projectForNew(view: View): string {
  return view.type === 'project' ? view.id : INBOX_ID
}

const KEY = 'view'

export function loadView(): View {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_VIEW
    const v = JSON.parse(raw) as View
    if (v.type === 'search' || v.type === 'assistant') return DEFAULT_VIEW
    if (v.type === 'objects' || v.type === 'trash' || v.type === 'calendar' || v.type === 'habits' || v.type === 'matrix' || v.type === 'countdown' || v.type === 'waiting' || v.type === 'pomo') return v
    if (v.type === 'tag' && typeof v.id === 'string') return v
    if (v.type === 'smart' && SMART_LISTS.some((l) => l.id === v.id)) return v
    if (v.type === 'project' && typeof v.id === 'string') return v
  } catch {
    // хранилище недоступно, берём список по умолчанию
  }
  return DEFAULT_VIEW
}

export function saveView(view: View): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(view))
  } catch {
    // не страшно, запомним в следующий раз
  }
}
