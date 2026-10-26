import type { Weekday } from '../../domain/repeat'

export const HABIT_COLORS = [
  '#95DE64', // Зелёный (смайл, яблоко, банан, велосипед)
  '#73E2D8', // Бирюзовый (вода)
  '#FF949E', // Розовый коралл (тост/завтрак)
  '#69B1FF', // Голубой (рис, книга, зубы)
  '#FFD666', // Солнечно-жёлтый (морковь, солнце, карандаш)
  '#F18BEC', // Сиренево-розовый (йога, звезда, отказ)
  '#6E81ED', // Индиго (сон, луна)
  '#FFAD60', // Оранжевый (бег, отжимания)
]

export const RU_WEEKDAYS = ['Пон.', 'Втр.', 'Срд.', 'Чтв.', 'Птн.', 'Сбт.', 'Вск.']
export const RU_WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']
export const RU_WEEKDAYS_LOWER = ['пн', 'вт', 'ср', 'чт', 'пт', 'сб', 'вс']
export const RU_WEEKDAYS_UPPER: Record<Weekday, string> = {
  MO: 'ПН',
  TU: 'ВТ',
  WE: 'СР',
  TH: 'ЧТ',
  FR: 'ПТ',
  SA: 'СБ',
  SU: 'ВС',
}
export const MONTHS_LOWER_RU = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря',
]

export interface GalleryTemplate {
  id: string
  category: 'suggested' | 'routine' | 'health' | 'sport'
  name: string
  quote: string
  color: string
}

export const GALLERY_TEMPLATES: GalleryTemplate[] = [
  {
    id: 'check',
    category: 'suggested',
    name: 'Ежедневная проверка',
    quote: 'Постарайтесь чуть больше , чтобы стать чуть лучше',
    color: '#95DE64',
  },
  {
    id: 'water',
    category: 'suggested',
    name: 'Выпить воды',
    quote: 'Будьте в тонусе',
    color: '#73E2D8',
  },
  {
    id: 'breakfast',
    category: 'suggested',
    name: 'Позавтракать',
    quote: 'Жизнь начинается после завтрака',
    color: '#FF949E',
  },
  {
    id: 'fruits',
    category: 'suggested',
    name: 'Поесть фруктов',
    quote: 'Будьте здоровы, будьте счастливы',
    color: '#95DE64',
  },
  {
    id: 'wakeup',
    category: 'suggested',
    name: 'Рано вставать',
    quote: 'Просыпайтесь и будьте на кураже',
    color: '#FFD666',
  },
  {
    id: 'sleep',
    category: 'suggested',
    name: 'Рано ложиться',
    quote: 'Помечтать о возвышенном',
    color: '#6E81ED',
  },
  {
    id: 'bike',
    category: 'sport',
    name: 'Прокатиться на велосипеде',
    quote: 'Движение — это жизнь',
    color: '#95DE64',
  },
  {
    id: 'run',
    category: 'sport',
    name: 'Утренняя пробежка',
    quote: 'Каждый шаг делает вас сильнее',
    color: '#FFAD60',
  },
  {
    id: 'read',
    category: 'routine',
    name: 'Читать книги',
    quote: 'Одна глава в день открывает целый мир',
    color: '#69B1FF',
  },
  {
    id: 'nosugar',
    category: 'health',
    name: 'Воздержание от вредного',
    quote: 'Чистый разум и здоровое тело',
    color: '#F18BEC',
  },
]

export const ICON_PRESETS: Array<{ key: string; color: string; hint: string }> = [
  { key: 'Ежедневная проверка', color: '#95DE64', hint: 'Смайл' },
  { key: 'Выпить воды', color: '#73E2D8', hint: 'Вода' },
  { key: 'Позавтракать', color: '#FF949E', hint: 'Завтрак' },
  { key: 'Обед', color: '#69B1FF', hint: 'Еда' },
  { key: 'Поесть фруктов', color: '#95DE64', hint: 'Фрукты' },
  { key: 'Овощи', color: '#FFD666', hint: 'Морковь' },
  { key: 'Воздержание', color: '#F18BEC', hint: 'Без сладкого' },
  { key: 'Рано ложиться', color: '#6E81ED', hint: 'Сон' },
  { key: 'Зарядка', color: '#95DE64', hint: 'Приседания' },
  { key: 'Бег', color: '#FFAD60', hint: 'Пробежка' },
  { key: 'Йога', color: '#F18BEC', hint: 'Медитация' },
  { key: 'Тренировка', color: '#FFAD60', hint: 'Отжимания' },
  { key: 'Прокатиться на велосипеде', color: '#95DE64', hint: 'Велосипед' },
  { key: 'Плавание', color: '#69B1FF', hint: 'Бассейн' },
  { key: 'Читать книги', color: '#73E2D8', hint: 'Книга' },
  { key: 'Записи', color: '#FFD666', hint: 'Карандаш' },
  { key: 'Дневник благодарности', color: '#FF949E', hint: 'Блокнот' },
  { key: 'Финансы', color: '#FFD666', hint: 'Бюджет' },
  { key: 'Работа', color: '#69B1FF', hint: 'План' },
  { key: 'Позвонить близким', color: '#FF949E', hint: 'Звонок' },
  { key: 'Рано вставать', color: '#FFD666', hint: 'Солнце' },
]

export function habitQuote(name: string): string {
  const lower = name.toLowerCase()
  for (const t of GALLERY_TEMPLATES) {
    if (lower.includes(t.name.toLowerCase().slice(0, 6))) return t.quote
  }
  return 'Дисциплина — мост между целями и достижениями'
}

