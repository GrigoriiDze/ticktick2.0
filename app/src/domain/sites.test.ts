import { describe, expect, it } from 'vitest'
import { localToMs, type DateCtx } from './dates'
import { defaultSite, formatBudget, navigatorUrl, objectsByStage, phoneHref, plural, siteStats, stageTitle } from './sites'
import type { Project, Task } from './types'

const ctx: DateCtx = { now: localToMs('2026-10-20', '15:00', 'Europe/Moscow'), tz: 'Europe/Moscow' }

function project(over: Partial<Project> = {}): Project {
  return {
    id: 'p',
    name: 'Объект',
    color: null,
    groupId: null,
    sortOrder: 0,
    viewMode: 'list',
    kind: 'task',
    isInbox: false,
    closed: false,
    site: null,
    createdAt: null,
    updatedAt: null,
    deletedAt: null,
    ...over,
  }
}

function task(over: Partial<Task>): Task {
  return {
    id: 't',
    projectId: 'p',
    parentId: null,
    columnId: null,
    sortOrder: 0,
    title: 'Задача',
    content: '',
    kind: 'text',
    items: {},
    priority: 0,
    status: 'open',
    completedAt: null,
    start: null,
    due: null,
    isAllDay: false,
    timeZone: null,
    repeat: null,
    repeatFrom: 'due',
    exDates: [],
    reminders: {},
    tags: [],
    pinnedAt: null,
    waiting: null,
    address: null,
    sourceId: null,
    createdAt: null,
    updatedAt: null,
    deletedAt: null,
    ...over,
  }
}

describe('объекты по этапам', () => {
  it('раскладывает по этапам, обычные списки пропускает, внутри этапа по алфавиту', () => {
    const projects = [
      project({ id: 'a', name: 'Ресторан', site: { ...defaultSite(), stage: 'install' } }),
      project({ id: 'b', name: 'Аптека', site: { ...defaultSite(), stage: 'install' } }),
      project({ id: 'c', name: 'Склад', site: { ...defaultSite(), stage: 'measure' } }),
      project({ id: 'd', name: 'Личное' }),
    ]
    const by = objectsByStage(projects)
    expect(by.install.map((p) => p.id)).toEqual(['b', 'a'])
    expect(by.measure.map((p) => p.id)).toEqual(['c'])
    expect(Object.values(by).flat().map((p) => p.id)).not.toContain('d')
  })

  it('закрытые объекты не попадают на доску', () => {
    const by = objectsByStage([project({ closed: true, site: defaultSite() })])
    expect(Object.values(by).flat()).toHaveLength(0)
  })

  it('неизвестный этап из базы не теряет объект', () => {
    const by = objectsByStage([project({ id: 'x', site: { ...defaultSite(), stage: 'неизвестный' as never } })])
    expect(by.measure.map((p) => p.id)).toEqual(['x'])
  })

  it('названия этапов', () => {
    expect(stageTitle('commissioning')).toBe('Пусконаладка')
  })
})

describe('статистика по объекту', () => {
  it('считает открытые и просроченные задачи только этого объекта', () => {
    const tasks = [
      task({ id: '1', due: '2026-10-18' }),
      task({ id: '2', due: '2026-10-25' }),
      task({ id: '3' }),
      task({ id: '4', due: '2026-10-01', status: 'done' }),
      task({ id: '5', projectId: 'other', due: '2026-10-01' }),
    ]
    expect(siteStats('p', tasks, ctx)).toMatchObject({ open: 3, overdue: 1 })
  })
})

describe('ссылки и подписи', () => {
  it('навигатор: адрес кодируется, пустой адрес даёт null', () => {
    expect(navigatorUrl('Ярославль, ул. Свободы 5')).toBe(
      'https://yandex.ru/maps/?text=%D0%AF%D1%80%D0%BE%D1%81%D0%BB%D0%B0%D0%B2%D0%BB%D1%8C%2C%20%D1%83%D0%BB.%20%D0%A1%D0%B2%D0%BE%D0%B1%D0%BE%D0%B4%D1%8B%205',
    )
    expect(navigatorUrl('   ')).toBeNull()
  })

  it('телефон: оставляет цифры и плюс, короткое и пустое отбрасывает', () => {
    expect(phoneHref('+7 (900) 123-45-67')).toBe('tel:+79001234567')
    expect(phoneHref('8 900 123 45 67')).toBe('tel:89001234567')
    expect(phoneHref('12')).toBeNull()
    expect(phoneHref('')).toBeNull()
  })

  it('бюджет с пробелами между разрядами', () => {
    expect(formatBudget(1500000)).toBe('1 500 000 ₽')
    expect(formatBudget(950)).toBe('950 ₽')
    expect(formatBudget(null)).toBe('')
  })
})

describe('склонение', () => {
  const f: [string, string, string] = ['задача', 'задачи', 'задач']
  it.each([
    [0, 'задач'],
    [1, 'задача'],
    [2, 'задачи'],
    [4, 'задачи'],
    [5, 'задач'],
    [11, 'задач'],
    [12, 'задач'],
    [21, 'задача'],
    [22, 'задачи'],
    [101, 'задача'],
    [111, 'задач'],
  ])('%i → %s', (n, expected) => {
    expect(plural(n, f)).toBe(expected)
  })
})
