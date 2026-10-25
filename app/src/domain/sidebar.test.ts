import { describe, expect, it } from 'vitest'
import { buildSidebar, nextSortOrder } from './sidebar'
import type { Project, ProjectGroup } from './types'

const project = (id: string, over: Partial<Project> = {}): Project => ({
  id, name: id, color: null, groupId: null, sortOrder: 0, viewMode: 'list', kind: 'task', isInbox: false, closed: false, site: null,
  createdAt: null, updatedAt: null, deletedAt: null, ...over,
})
const group = (id: string, over: Partial<ProjectGroup> = {}): ProjectGroup => ({ id, name: id, sortOrder: 0, collapsed: false, createdAt: null, updatedAt: null, deletedAt: null, ...over })

const shape = (items: ReturnType<typeof buildSidebar>) => items.map((i) => (i.kind === 'project' ? i.project.id : `${i.group.id}[${i.projects.map((p) => p.id).join(',')}]`))

describe('боковое меню', () => {
  it('папки и свободные списки идут вперемешку по общему порядку', () => {
    const items = buildSidebar(
      [project('a', { sortOrder: 3 }), project('b', { sortOrder: 1, groupId: 'f' }), project('c', { sortOrder: 2, groupId: 'f' }), project('inbox', { isInbox: true, sortOrder: -1 })],
      [group('f', { sortOrder: 2 })],
    )
    expect(shape(items)).toEqual(['f[b,c]', 'a'])
  })

  it('внутри папки порядок по sortOrder, при равенстве по названию', () => {
    const items = buildSidebar([project('Яблоки', { groupId: 'f' }), project('Арбузы', { groupId: 'f' }), project('Груши', { groupId: 'f', sortOrder: -1 })], [group('f')])
    expect(shape(items)).toEqual(['f[Груши,Арбузы,Яблоки]'])
  })

  it('пустая папка остаётся в меню', () => {
    expect(shape(buildSidebar([], [group('f')]))).toEqual(['f[]'])
  })

  it('список с удалённой папкой показывается сам по себе', () => {
    expect(shape(buildSidebar([project('a', { groupId: 'gone' })], []))).toEqual(['a'])
  })

  it('Входящие в дереве не показываются', () => {
    expect(buildSidebar([project('inbox', { isInbox: true })], [])).toEqual([])
  })

  it('следующий порядок после всех списков и папок', () => {
    expect(nextSortOrder([], [])).toBe(1)
    expect(nextSortOrder([project('a', { sortOrder: 5 }), project('inbox', { isInbox: true, sortOrder: 99 })], [group('f', { sortOrder: 7 })])).toBe(8)
  })
})
