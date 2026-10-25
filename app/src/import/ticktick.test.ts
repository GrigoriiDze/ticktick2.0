import { describe, expect, it } from 'vitest'
import { convertCheckins, convertHabit, convertProject, convertTask, dedupeTasks, importedHabitId, importedId, parseTickTime, stampToDay, type RawTask, convertGroup, convertColumn } from './ticktick'
import { INBOX_ID } from '../domain/types'

const projects = new Set(['inbox1', 'p1'])

function raw(over: Partial<RawTask> = {}): RawTask {
  return { id: 'a1', projectId: 'p1', title: 'Задача', status: 0, deleted: 0, ...over }
}

describe('время TickTick', () => {
  it('разбирает смещение без двоеточия', () => {
    expect(parseTickTime('2025-03-01T00:00:00+0600')).toBe(Date.UTC(2025, 2, 1) - 6 * 3600_000)
    expect(parseTickTime('2024-07-10T17:30:00+0500')).toBe(Date.UTC(2024, 6, 10, 12, 30))
  })
  it('мусор даёт null', () => {
    expect(parseTickTime('вчера')).toBeNull()
  })
})

describe('списки', () => {
  it('Входящие получают фиксированный id, остальные id из TickTick', () => {
    expect(convertProject({ id: 'inbox124', Isinbox: true }, projects).value?.id).toBe(INBOX_ID)
    expect(convertProject({ id: 'p1', name: 'Финансы' }, projects).value).toMatchObject({ id: 'tt-p1', name: 'Финансы', isInbox: false })
  })
})

describe('задачи', () => {
  it('статусы: открыта, выполнена, не буду делать', () => {
    expect(convertTask(raw({ status: 0 }), projects).value?.status).toBe('open')
    expect(convertTask(raw({ status: 2 }), projects).value?.status).toBe('done')
    expect(convertTask(raw({ status: -1 }), projects).value?.status).toBe('wontdo')
  })

  it('задачи из корзины пропускаются с причиной', () => {
    expect(convertTask(raw({ deleted: 1 }), projects)).toEqual({ value: null, notes: ['в корзине'] })
  })

  it('задача из удалённого списка не теряется, а попадает во Входящие', () => {
    const r = convertTask(raw({ projectId: 'нет такого' }), projects)
    expect(r.value?.projectId).toBe(INBOX_ID)
    expect(r.notes).toContain('список удалён, задача перенесена во Входящие')
  })

  it('копии одной задачи схлопываются, остаётся поздняя правка', () => {
    const list = dedupeTasks([
      { id: 'a', modifiedTime: '2025-05-30T16:55:24+0500', title: 'старая' },
      { id: 'a', modifiedTime: '2025-05-30T16:55:29+0500', title: 'новая' },
      { id: 'b', modifiedTime: '2025-01-01T10:00:00+0500', title: 'одна' },
    ])
    expect(list).toHaveLength(2)
    expect(list.find((t) => t.id === 'a')?.title).toBe('новая')
  })

  it('на весь день: берётся местная дата, а не пересчёт в UTC', () => {
    const t = convertTask(raw({ isAllDay: true, startDate: '2025-03-01T00:00:00+0600', timeZone: 'Asia/Almaty' }), projects).value!
    expect(t.due).toBe('2025-03-01')
    expect(t.start).toBeNull()
    expect(t.isAllDay).toBe(true)
  })

  it('со временем: срок это момент времени', () => {
    const t = convertTask(raw({ startDate: '2024-07-10T17:30:00+0500', timeZone: 'Asia/Almaty' }), projects).value!
    expect(t.due).toBe(Date.UTC(2024, 6, 10, 12, 30))
    expect(t.timeZone).toBe('Asia/Almaty')
  })

  it('задача на несколько дней хранит начало и конец', () => {
    const t = convertTask(raw({ isAllDay: true, startDate: '2025-03-01T00:00:00+0600', dueDate: '2025-03-04T00:00:00+0600' }), projects).value!
    expect(t.start).toBe('2025-03-01')
    expect(t.due).toBe('2025-03-04')
  })

  it('плавающее время не привязано к поясу', () => {
    expect(convertTask(raw({ startDate: '2025-07-05T17:30:00+0500', timeZone: 'Asia/Karachi', isFloating: true }), projects).value?.timeZone).toBeNull()
  })

  it('повтор сохраняется как есть, режим от выполнения распознаётся', () => {
    const t = convertTask(raw({ repeatFlag: 'RRULE:FREQ=WEEKLY;BYDAY=MO', repeatFrom: '1' }), projects).value!
    expect(t.repeat).toBe('RRULE:FREQ=WEEKLY;BYDAY=MO')
    expect(t.repeatFrom).toBe('done')
    expect(convertTask(raw({ repeatFlag: '' }), projects).value?.repeat).toBeNull()
  })

  it('пункты чек-листа и напоминания превращаются в словари по id', () => {
    const t = convertTask(
      raw({
        kind: 'CHECKLIST',
        items: [
          { id: 'i1', title: 'Первый', status: 0, sortOrder: 1 },
          { id: 'i2', title: 'Второй', status: 1, sortOrder: 2, completedTime: '2025-01-01T10:00:00+0500' },
        ],
        reminders: [{ id: 'r1', trigger: 'TRIGGER:-PT15M' }],
      }),
      projects,
    ).value!
    expect(t.kind).toBe('checklist')
    expect(t.items.i1.done).toBe(false)
    expect(t.items.i2.done).toBe(true)
    expect(t.items.i2.completedAt).toBe(Date.UTC(2025, 0, 1, 5, 0))
    expect(t.reminders.r1.trigger).toBe('TRIGGER:-PT15M')
  })

  it('идентификаторы стабильны, чтобы повторный импорт не создавал дублей', () => {
    const a = convertTask(raw({ id: 'x9', parentId: 'x1' }), projects).value!
    expect(a.id).toBe(importedId('x9'))
    expect(a.parentId).toBe(importedId('x1'))
    expect(a.sourceId).toBe('x9')
    expect(convertTask(raw({ id: 'x9' }), projects).value!.id).toBe(a.id)
  })

  it('задача из Входящих попадает в наш проект Входящие', () => {
    expect(convertTask(raw({ projectId: 'inbox1' }), projects).value?.projectId).toBe(INBOX_ID)
  })

  it('что не переносится, отмечено в заметках', () => {
    const n = convertTask(raw({ kind: 'NOTE' }), projects).notes
    expect(n).toContain('заметка импортирована как задача')
  })

  it('приоритеты и пустые поля не ломают перенос', () => {
    const t = convertTask({ id: 'm', projectId: 'p1' }, projects).value!
    expect(t.title).toBe('')
    expect(t.priority).toBe(0)
    expect(t.tags).toEqual([])
    expect(convertTask(raw({ priority: 5 }), projects).value?.priority).toBe(5)
    expect(convertTask(raw({ priority: 4 as never }), projects).value?.priority).toBe(0)
  })
})

describe('привычки', () => {
  it('день из штампа TickTick', () => {
    expect(stampToDay('20241002')).toBe('2024-10-02')
    expect(stampToDay(20250922)).toBe('2025-09-22')
    expect(stampToDay('2024-10-02')).toBeNull()
    expect(stampToDay('')).toBeNull()
  })

  it('активная ежедневная привычка', () => {
    const h = convertHabit({ id: 'h1', name: 'Зарядка', color: '#A0EFED', status: 0, repeatRule: 'RRULE:FREQ=DAILY;INTERVAL=1', createdTime: '2024-07-02 10:00:00', reminder: '07:00' }, null).value!
    expect(h).toMatchObject({ id: importedHabitId('h1'), name: 'Зарядка', repeat: null, startDay: '2024-07-02', archivedAt: null, reminders: ['07:00'], sourceId: 'h1' })
  })

  it('правило по дням недели сохраняется, архивная получает время архивации', () => {
    const h = convertHabit({ id: 'h2', status: 1, repeatRule: 'RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,TU', createdTime: '2024-07-02 10:00:00', archivedTime: '2025-09-22 17:45:24' }, null).value!
    expect(h.repeat).toBe('RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,TU')
    expect(h.archivedAt).toBe(Date.UTC(2025, 8, 22, 17, 45, 24))
  })

  it('челлендж начинается с даты цели, а не с создания привычки', () => {
    const h = convertHabit({ id: 'h3', status: 0, createdTime: '2024-07-02 10:00:00', targetDays: 30, targetStartDate: 20250922 }, null).value!
    expect(h.targetDays).toBe(30)
    expect(h.startDay).toBe('2025-09-22')
  })

  it('без цели срок начала это день создания, без создания первая отметка, без всего привычка пропускается', () => {
    expect(convertHabit({ id: 'a', targetDays: 0, createdTime: '2024-07-02 10:00:00' }, null).value?.startDay).toBe('2024-07-02')
    expect(convertHabit({ id: 'b' }, '2024-08-01').value?.startDay).toBe('2024-08-01')
    expect(convertHabit({ id: 'c' }, null).value).toBeNull()
  })

  it('несколько напоминаний и мусор в поле', () => {
    const h = convertHabit({ id: 'd', createdTime: '2024-07-02 10:00:00', reminder: '07:00, 21:30,abc,' }, null).value!
    expect(h.reminders).toEqual(['07:00', '21:30'])
    expect(convertHabit({ id: 'e', createdTime: '2024-07-02 10:00:00', reminder: null }, null).value?.reminders).toEqual([])
  })

  it('отметки: выполнено, не выполнено, снятые пропускаются', () => {
    const list = convertCheckins([
      { habitId: 'h1', stamp: '20241002', checkStatus: 2 },
      { habitId: 'h1', stamp: '20241003', checkStatus: 1 },
      { habitId: 'h1', stamp: '20241004', checkStatus: 0 },
      { habitId: 'h1', stamp: 'мусор', checkStatus: 2 },
    ])
    expect(list.map((c) => [c.day, c.status])).toEqual([['2024-10-02', 'done'], ['2024-10-03', 'failed']])
    expect(list[0].id).toBe(`${importedHabitId('h1')}~2024-10-02`)
  })

  it('две записи за один день: остаётся поздняя', () => {
    const list = convertCheckins([
      { habitId: 'h1', stamp: '20241002', checkStatus: 1, opTime: '2024-10-02 08:00:00' },
      { habitId: 'h1', stamp: '20241002', checkStatus: 2, opTime: '2024-10-02 21:00:00' },
    ])
    expect(list).toHaveLength(1)
    expect(list[0].status).toBe('done')
  })

  it('заметки подкладываются к отметке того же дня, пустые игнорируются', () => {
    const list = convertCheckins(
      [
        { habitId: 'h1', stamp: '20241002', checkStatus: 2 },
        { habitId: 'h1', stamp: '20241003', checkStatus: 2 },
      ],
      [
        { habitId: 'h1', stamp: 20241002, content: 'Бегал 5 км' },
        { habitId: 'h1', stamp: 20241003, content: '   ' },
        { habitId: 'h1', stamp: 20241230, content: 'Заметка без отметки' },
      ],
    )
    expect(list.find((c) => c.day === '2024-10-02')?.note).toBe('Бегал 5 км')
    expect(list.find((c) => c.day === '2024-10-03')?.note).toBeNull()
    expect(list).toHaveLength(2)
  })
})


describe('папки списков', () => {
  it('папка переносится со своим именем, порядком и состоянием', () => {
    expect(convertGroup({ id: 'g1', name: ' Финансы ', sortOrder: 3, deleted: 0, open: 0 }).value).toEqual({ id: 'tt-g-g1', name: 'Финансы', sortOrder: 3, collapsed: true })
    expect(convertGroup({ id: 'g2', name: 'Сферы', sortOrder: 1, open: 1 }).value?.collapsed).toBe(false)
    expect(convertGroup({ id: 'g3', name: '', open: null }).value?.name).toBe('Папка')
  })

  it('удалённая папка не переносится', () => {
    expect(convertGroup({ id: 'g1', name: 'Старая', deleted: 1 }).value).toBeNull()
  })

  it('список привязывается к перенесённой папке, а к неизвестной нет', () => {
    const known = convertProject({ id: 'p1', name: 'Квартира', groupId: 'g1' }, new Set(['p1']), new Set(['g1'])).value!
    expect(known.groupId).toBe('tt-g-g1')
    const unknown = convertProject({ id: 'p2', name: 'Прочее', groupId: 'gone' }, new Set(['p2']), new Set(['g1'])).value!
    expect(unknown.groupId).toBeNull()
    expect(convertProject({ id: 'p3', name: 'Без папки' }, new Set(['p3'])).value!.groupId).toBeNull()
  })
})

describe('колонки канбана', () => {
  it('колонка переносится со своим списком и порядком', () => {
    expect(convertColumn({ id: 'c1', projectId: 'p1', name: ' В работе ', sortOrder: 65535 }, projects).value).toEqual({ id: 'tt-c-c1', projectId: 'tt-p1', name: 'В работе', sortOrder: 65535 })
    expect(convertColumn({ id: 'c2', projectId: 'inbox1', name: 'Позже' }, projects).value).toMatchObject({ projectId: INBOX_ID, sortOrder: 0 })
  })
  it('служебная «несгруппированный», удалённые и колонки удалённых списков пропускаются', () => {
    expect(convertColumn({ id: 'c', projectId: 'p1', name: 'несгруппированный' }, projects).value).toBeNull()
    expect(convertColumn({ id: 'c', projectId: 'p1', name: 'Ungrouped' }, projects).value).toBeNull()
    expect(convertColumn({ id: 'c', projectId: 'p1', name: 'А', deleted: 1 }, projects).value).toBeNull()
    expect(convertColumn({ id: 'c', projectId: 'gone', name: 'А' }, projects).value).toBeNull()
  })
  it('задача получает перенесённую колонку, иначе остаётся без неё', () => {
    expect(convertTask(raw({ columnId: 'c1' }), projects, new Set(['c1'])).value?.columnId).toBe('tt-c-c1')
    expect(convertTask(raw({ columnId: 'skip' }), projects, new Set(['c1'])).value?.columnId).toBeNull()
    expect(convertTask(raw({ columnId: 'c1' }), projects).value?.columnId).toBeNull()
  })
  it('список с видом «канбан» остаётся канбаном', () => {
    expect(convertProject({ id: 'p1', viewMode: 'kanban' }, projects).value?.viewMode).toBe('kanban')
    expect(convertProject({ id: 'p1', viewMode: 'timeline' }, projects).value?.viewMode).toBe('list')
  })
})
