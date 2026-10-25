import { describe, expect, it } from 'vitest'
import { buildContext, buildMessages, HISTORY_MESSAGES } from './assistant'
import { localToMs, type DateCtx } from './dates'
import { INBOX_ID, type Project, type Task } from './types'

const MSK = 'Europe/Moscow'
const ctx: DateCtx = { now: localToMs('2026-10-23', '12:00', MSK), tz: MSK }

const task = (id: string, title: string, over: Partial<Task> = {}): Task =>
  ({
    id, projectId: INBOX_ID, parentId: null, columnId: null, sortOrder: 0, title, content: '', kind: 'text', items: {}, priority: 0, status: 'open', completedAt: null, start: null, due: null,
    isAllDay: false, timeZone: null, repeat: null, repeatFrom: 'due', exDates: [], reminders: {}, tags: [], pinnedAt: null, waiting: null, address: null, sourceId: null,
    createdAt: null, updatedAt: null, deletedAt: null, ...over,
  }) as Task
const projects = [{ id: INBOX_ID, name: 'Входящие', isInbox: true }] as Project[]

describe('что знает помощник', () => {
  it('просроченные и ближайшие выше задач без срока', () => {
    const text = buildContext([task('a', 'Без срока'), task('b', 'Через неделю', { due: '2026-10-30' }), task('c', 'Просрочена', { due: '2026-10-01' }), task('d', 'Завтра', { due: '2026-10-24' })], projects, ctx)
    const titles = text.split('\n').filter((l) => l.startsWith('- ')).map((l) => l.split(';')[0].slice(2))
    expect(titles).toEqual(['Просрочена', 'Завтра', 'Через неделю', 'Без срока'])
  })

  it('число задач ограничено, остальные не уходят', () => {
    const many = Array.from({ length: 300 }, (_, i) => task(`t${i}`, `Задача ${i}`, { due: '2026-11-01' }))
    const text = buildContext(many, projects, ctx, 120)
    expect(text.split('\n').filter((l) => l.startsWith('- '))).toHaveLength(120)
    expect(text).toContain('Открытых задач 300, показаны 120 самых срочных')
  })

  it('длинное описание обрезается, корзина и подзадачи не уходят, видны срок, список и метки', () => {
    const text = buildContext(
      [
        task('a', 'Договор', { content: 'очень длинный текст '.repeat(40), tags: ['срочно'], priority: 5, due: '2026-10-25' }),
        task('x', 'Из корзины', { deletedAt: {} as never }),
        task('y', 'Подзадача', { parentId: 'a' }),
      ],
      projects,
      ctx,
    )
    expect(text).toContain('Договор; список «Входящие»; срок 25 окт.; высокий приоритет; метки срочно; заметка: очень длинный текст')
    expect(text).toContain('…')
    expect(text).not.toContain('Из корзины')
    expect(text).not.toContain('Подзадача')
  })

  it('выполненное за неделю видно, старое нет', () => {
    const text = buildContext([task('a', 'Сделал вчера', { status: 'done', completedAt: ctx.now - 86_400_000 }), task('b', 'Сделал давно', { status: 'done', completedAt: ctx.now - 30 * 86_400_000 })], projects, ctx)
    expect(text).toContain('Сделал вчера')
    expect(text).not.toContain('Сделал давно')
  })

  it('с вопросом уходят инструкция с задачами и только последние реплики', () => {
    const history = Array.from({ length: 20 }, (_, i) => ({ role: i % 2 ? ('assistant' as const) : ('user' as const), content: `реплика ${i}` }))
    const msgs = buildMessages(history, 'КОНТЕКСТ')
    expect(msgs[0].role).toBe('system')
    expect(msgs[0].content).toContain('КОНТЕКСТ')
    expect(msgs).toHaveLength(1 + HISTORY_MESSAGES)
    expect(msgs.at(-1)?.content).toBe('реплика 19')
  })
})
