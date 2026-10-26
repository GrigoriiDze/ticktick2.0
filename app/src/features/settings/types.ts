import type { ImportBundle } from '../../import/bundle'
import type { WriteResult } from '../../import/write'
import type { Accent, MenuListId, TaskViewMode, ThemeMode } from '../../platform/theme'

export type SettingsScreen =
  | 'main'
  | 'profile'
  | 'theme'
  | 'datetime'
  | 'tabbar'
  | 'notifications'
  | 'notifications_advanced'
  | 'widgets'
  | 'ai'
  | 'import'
  | 'general'
  | 'smart_rec'
  | 'defaults'

export interface ThemeItem {
  id: string
  title: string
  accent: Accent
  mode: ThemeMode
  color: string
  border?: boolean
  materialYou?: boolean
}

export interface PickerModalConfig {
  title: string
  selected: string
  options: Array<{ key: string; label: string }>
  onSelect: (key: string) => void
}

export interface SettingsProps {
  leaving?: boolean
  email: string | null
  onTaskMode: (mode: TaskViewMode) => void
  menuLists: MenuListId[]
  onMenuLists: (ids: MenuListId[]) => void
  onSignOut: () => void
  onImport: (bundle: ImportBundle, onProgress: (done: number, total: number) => void) => Promise<WriteResult>
  onClose: () => void
}

