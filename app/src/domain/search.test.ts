import { describe, expect, it } from 'vitest'
import { searchWorkspace } from './search'
import { INBOX_ID, type Project, type Task } from './types'

const task = (id: string, title: string, over: Partial<Task> = {}): Task =>
  ({
    id, projectId: INBOX_ID, parentId: null, columnId: null, sortOrder: 0, title, content: '', kind: 'text', items: {}, priority: 0, status: 'open', completedAt: null, start: null, due: null,
    isAllDay: false, timeZone: null, repeat: null, repeatFrom: 'due', exDates: [], reminders: {}, tags: [], pinnedAt: null, waiting: null, address: null, sourceId: null,
    createdAt: null, updatedAt: null, deletedAt: null, ...over,
  }) as Task
const project = (id: string, name: string, isInbox = false) => ({ id, name, isInbox, closed: false }) as Project

const projects = [project(INBOX_ID, 'Входящие', true), project('p1', 'Объект Свободы 5')]

describe('поиск по всем задачам', () => {
  it('ищет по названию, описанию, метке, адресу, пункту чек-листа и названию списка', () => {
    const tasks = [
      task('1', 'Замер'),
      task('2', 'Звонок', { content: 'уточнить вентилятор' }),
      task('3', 'Смета', { tags: ['срочно'] }),
      task('4', 'Выезд', { address: 'Ярославль, Свободы 12' }),
      task('5', 'Монтаж', { items: { a: { title: 'купить кронштейны', done: false, sortOrder: 1 } } }),
      task('6', 'Приёмка', { projectId: 'p1' }),
    ]
    const ids = (q: string) => searchWorkspace(tasks, projects, q).tasks.map((t) => t.id)
    expect(ids('вентилятор')).toEqual(['2'])
    expect(ids('срочно')).toEqual(['3'])
    expect(ids('ярославль')).toEqual(['4'])
    expect(ids('кронштейны')).toEqual(['5'])
    expect(ids('свободы').sort()).toEqual(['4', '6'])
    expect(ids('ЗАМЕР')).toEqual(['1'])
  })

  it('каждое слово запроса должно встретиться, порядок слов не важен', () => {
    const tasks = [task('1', 'Позвонить поставщику вентиляторов'), task('2', 'Позвонить маме')]
    expect(searchWorkspace(tasks, projects, 'вентиляторов позвонить').tasks.map((t) => t.id)).toEqual(['1'])
  })

  it('открытые выше выполненных, название выше остального, закреплённые выше', () => {
    const tasks = [
      task('done', 'Смета готова', { status: 'done' }),
      task('desc', 'Звонок', { content: 'смета' }),
      task('title', 'Смета'),
      task('pin', 'Смета закреплена', { pinnedAt: 1 }),
    ]
    expect(searchWorkspace(tasks, projects, 'смета').tasks.map((t) => t.id)).toEqual(['pin', 'title', 'desc', 'done'])
  })

  it('корзина не ищется, пустой запрос ничего не возвращает, списки и метки находятся', () => {
    const tasks = [task('1', 'Смета', { deletedAt: {} as never, tags: ['смета'] }), task('2', 'Договор', { tags: ['смета'] })]
    expect(searchWorkspace(tasks, projects, 'смета').tasks.map((t) => t.id)).toEqual(['2'])
    expect(searchWorkspace(tasks, projects, '   ')).toEqual({ tasks: [], projects: [], tags: [] })
    const r = searchWorkspace(tasks, projects, 'объект')
    expect(r.projects.map((p) => p.id)).toEqual(['p1'])
    expect(searchWorkspace(tasks, projects, '#смета').tags).toEqual([{ tag: 'смета', count: 1 }])
  })
})
