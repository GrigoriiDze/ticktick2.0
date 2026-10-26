import { describe, expect, it } from 'vitest'
import { describeBundle, parseBundle } from './bundle'

const lists = { groups: [], columns: [], projects: [{ id: 'p' }], tasks: [{ id: 't1', status: 'open' }, { id: 't2', status: 'done' }], habits: [], checkins: [] }
const good = JSON.stringify({ version: 1, ...lists })

describe('файл с задачами из TickTick', () => {
  it('нормальный файл читается и описывается', () => {
    const b = parseBundle(good)
    expect(b.tasks).toHaveLength(2)
    expect(describeBundle(b)).toContain('2 задач (открытых 1)')
  })
  it('не файл, чужая версия и недостающие разделы отвергаются', () => {
    expect(() => parseBundle('не json')).toThrow(/не читается/)
    expect(() => parseBundle(JSON.stringify({ version: 2, ...lists }))).toThrow(/не файл с задачами/i)
    expect(() => parseBundle('null')).toThrow(/не файл с задачами/i)
    expect(() => parseBundle(JSON.stringify({ version: 1, ...lists, tasks: undefined }))).toThrow(/tasks/)
  })
  it('запись без номера отвергается целиком', () => {
    expect(() => parseBundle(JSON.stringify({ version: 1, ...lists, tasks: [{ id: 't1' }, { title: 'без id' }] }))).toThrow(/без номера/)
  })
  it('официальный CSV-бэкап из TickTick разбирается со списками, папками, чек-листами и выполненными задачами', () => {
    const csv = [
      '"Date: 2026-10-25+0500"',
      '"Version: 7.1"',
      '"Status: 0 Normal, 1 Completed, 2 Archived"',
      '"Folder Name","List Name","Title","Kind","Tags","Content","Is Check list","Start Date","Due Date","Reminder","Repeat","Priority","Status","Created Time","Completed Time","Order","Timezone","Is All Day","Is Floating","Column Name","Column Order","View Mode","taskId","parentId"',
      '"Работа","Стройка","Заказать материалы","CHECKLIST","снабжение,срочно","[ ] Цемент\n[x] Арматура\nПозвонить поставщику","Y","2026-10-26T00:00:00+0500","2026-10-26T00:00:00+0500","","","5","0","2026-10-20T10:00:00+0500","","1","Asia/Yekaterinburg","true","false","В работе","0","kanban","101",""',
      '"Работа","Стройка","Сдать смету","TEXT","","Смета согласована","N","2026-10-24T00:00:00+0500","2026-10-24T00:00:00+0500","","","3","2","2026-10-19T10:00:00+0500","2026-10-24T15:00:00+0500","2","Asia/Yekaterinburg","true","false","Готово","1","kanban","102",""',
    ].join('\n')

    const b = parseBundle(csv)
    expect(b.groups).toHaveLength(1)
    expect(b.groups[0].name).toBe('Работа')
    expect(b.projects).toHaveLength(1)
    expect(b.projects[0].name).toBe('Стройка')
    expect(b.projects[0].viewMode).toBe('kanban')
    expect(b.columns).toHaveLength(2)
    expect(b.tasks).toHaveLength(2)

    const t1 = b.tasks.find((t) => t.id === 'tt-101')!
    expect(t1.status).toBe('open')
    expect(t1.priority).toBe(5)
    expect(t1.kind).toBe('checklist')
    expect(Object.values(t1.items)).toHaveLength(2)
    expect(t1.content).toBe('Позвонить поставщику')

    const t2 = b.tasks.find((t) => t.id === 'tt-102')!
    expect(t2.status).toBe('done')
    expect(t2.completedAt).not.toBeNull()
  })
})
