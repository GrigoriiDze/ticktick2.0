import type { Accent } from '../../platform/theme'
import type { ThemeItem } from './types'

/** Цветная Серия 1-в-1 по photo_20 */
export const COLOR_SERIES: ThemeItem[] = [
  { id: 'default', title: 'По умолчанию', accent: 'blue', mode: 'light', color: '#4772fa' },
  { id: 'teal', title: 'Теал', accent: 'slate', mode: 'light', color: '#2b5f75' },
  { id: 'turquoise', title: 'Бирюза', accent: 'green', mode: 'light', color: '#2cb1b1' },
  { id: 'green', title: 'Зеленый', accent: 'green', mode: 'light', color: '#4ea865' },
  { id: 'apricot', title: 'Абрикос', accent: 'yellow', mode: 'light', color: '#f5b041' },
  { id: 'peach', title: 'Персик', accent: 'red', mode: 'light', color: '#f2786d' },
  { id: 'lilac', title: 'Сирень', accent: 'purple', mode: 'light', color: '#9b6be6' },
  { id: 'white', title: 'Белый', accent: 'blue', mode: 'light', color: '#ffffff', border: true },
  { id: 'pebble', title: 'Галька', accent: 'gray', mode: 'light', color: '#6e7e91' },
  { id: 'dark', title: 'Темный', accent: 'blue', mode: 'dark', color: '#181c2e' },
  { id: 'material', title: 'Материал Ю', accent: 'indigo', mode: 'light', color: '#ffffff', border: true, materialYou: true },
]

/** Серия "Времена года" по photo_19 и photo_20 */
export const SEASON_SERIES: Array<{ id: string; title: string; bg: string; accent: Accent }> = [
  { id: 'spring', title: 'Весна', bg: 'linear-gradient(145deg, #6dc78a 0%, #c8f0b8 65%, #fce588 100%)', accent: 'green' },
  { id: 'summer', title: 'Лето', bg: 'linear-gradient(145deg, #3ea8bd 0%, #6dd5ed 65%, #e0f7fa 100%)', accent: 'blue' },
  { id: 'autumn', title: 'Осень', bg: 'linear-gradient(145deg, #e88d67 0%, #f5b971 65%, #fde8cd 100%)', accent: 'orange' },
  { id: 'winter', title: 'Зима', bg: 'linear-gradient(145deg, #8693ab 0%, #bdd4e7 65%, #f5f7fa 100%)', accent: 'gray' },
]

export const APP_ICONS = [
  { id: 'default', title: 'По умолчанию', color: '#4772fa' },
  { id: 'classic', title: 'Классический', color: '#3b82f6' },
  { id: 'dark', title: 'Темный', color: '#181c2e' },
  { id: 'minimal', title: 'Минимализм', color: '#0cce9c' },
  { id: 'neon', title: 'Неон', color: '#8a63e6' },
  { id: 'retro', title: 'Ретро', color: '#f2784b' },
]

export const MENU_LIST_CHOICES: [string, string][] = [
  ['inbox', 'Входящие'],
  ['today', 'Сегодня'],
  ['next7', 'Следующие 7 дней'],
  ['all', 'Все'],
  ['completed', 'Завершенные'],
  ['trash', 'Корзина'],
  ['matrix', 'Матрица'],
]

