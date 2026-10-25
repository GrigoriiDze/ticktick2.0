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
})
