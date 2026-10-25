import { describe, expect, it } from 'vitest'
import { localToMs, type DateCtx } from './dates'
import { copyOfProject, copyOfTask } from './duplicate'
import { listAsHtml, listAsText } from './print'
import { INBOX_ID, type Project, type Task } from './types'

const MSK = 'Europe/Moscow'
const ctx: DateCtx = { now: localToMs('2026-10-23', '12:00', MSK), tz: MSK }
const task = (over: Partial<Task> = {}): Task =>
  ({
    id: 't', projectId: INBOX_ID, parentId: null, columnId: null, sortOrder: 5, title: 'Замер', content: 'описание', kind: 'checklist', items: { a: { title: 'Рулетка', done: true, sortOrder: 1, completedAt: 9 } }, priority: 3,
    status: 'done', completedAt: 9, start: null, due: '2026-10-25', isAllDay: true, timeZone: null, repeat: 'RRULE:FREQ=WEEKLY', repeatFrom: 'due', exDates: [], reminders: { r1: { trigger: 'TRIGGER:PT0S' } }, tags: ['срочно'],
    pinnedAt: 1, waiting: { kind: 'payment', until: null }, address: 'Свободы 5', sourceId: 'tt-1', createdAt: null, updatedAt: null, deletedAt: null, ...over,
  }) as Task

describe('дублирование', () => {
  it('копия задачи не выполнена, без закрепления и связи с TickTick, пункты не отмечены, срок остаётся', () => {
    const c = copyOfTask(task(), { keepDate: true })
    expect(c).toMatchObject({ title: 'Замер', content: 'описание', priority: 3, tags: ['срочно'], address: 'Свободы 5', due: '2026-10-25', repeat: 'RRULE:FREQ=WEEKLY', waiting: null })
    expect(c.items.a).toEqual({ title: 'Рулетка', done: false, sortOrder: 1 })
    expect(c).not.toHaveProperty('status')
    expect(c).not.toHaveProperty('sourceId')
    expect(c).not.toHaveProperty('pinnedAt')
  })

  it('заготовка без даты теряет срок, повтор и напоминания, но может уйти в другой список', () => {
    const c = copyOfTask(task(), { keepDate: false, projectId: 'p2', columnId: null })
    expect(c).toMatchObject({ projectId: 'p2', due: null, repeat: null, reminders: {}, columnId: null })
  })

  it('копия объекта получает пустую карточку объекта и пометку в названии', () => {
    const p = { id: 'p', name: 'Свободы 5', color: '#fff', groupId: null, viewMode: 'kanban', kind: 'task', site: { address: 'ул. Свободы 5', contactName: 'Сергей', contactPhone: '8900', budget: 100, drawingsUrl: 'x', stage: 'install' } } as Project
    const c = copyOfProject(p)
    expect(c.name).toBe('Свободы 5 (копия)')
    expect(c.site).toEqual({ address: '', contactName: '', contactPhone: '', budget: null, drawingsUrl: '', stage: 'measure' })
    expect(c.viewMode).toBe('kanban')
    expect(copyOfProject({ ...p, site: null } as Project).site).toBeNull()
  })
})

describe('лист для печати', () => {
  const list = [task({ items: {}, status: 'open', due: '2026-10-25' }), task({ title: 'Монтаж <b>', address: null, due: null, status: 'open', items: { a: { title: 'Лестница', done: false, sortOrder: 1 } } })]

  it('текстом: галочки, срок и адрес, пункты под задачей', () => {
    expect(listAsText('Свободы 5', list, ctx)).toBe('Свободы 5\n\n☐ Замер (25 окт., Свободы 5)\n☐ Монтаж <b>\n    ☐ Лестница')
  })

  it('страницей: названия экранируются', () => {
    const html = listAsHtml('Свободы 5', list, ctx)
    expect(html).toContain('Монтаж &lt;b&gt;')
    expect(html).not.toContain('Монтаж <b>')
  })
})
