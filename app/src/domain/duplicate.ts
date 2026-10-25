import { defaultSite } from './sites'
import type { Project, Task } from './types'

/**
 * Копия задачи для «Дублировать». Выполнение, время правки и закрытие не копируются, пункты чек-листа
 * снова не отмечены. С датой: срок и напоминания остаются; без даты: копия как заготовка
 */
export function copyOfTask(t: Task, opts: { keepDate: boolean; projectId?: string; columnId?: string | null }) {
  const items = Object.fromEntries(Object.entries(t.items).map(([id, i]) => [id, { title: i.title, done: false, sortOrder: i.sortOrder }]))
  const date = opts.keepDate
    ? { start: t.start, due: t.due, isAllDay: t.isAllDay, timeZone: t.timeZone, duration: t.duration ?? null, repeat: t.repeat, repeatFrom: t.repeatFrom, reminders: t.reminders }
    : { start: null, due: null, isAllDay: false, timeZone: null, duration: null, repeat: null, repeatFrom: 'due' as const, reminders: {} }
  return {
    projectId: opts.projectId ?? t.projectId,
    parentId: null,
    columnId: opts.columnId === undefined ? t.columnId : opts.columnId,
    sortOrder: t.sortOrder,
    title: t.title,
    content: t.content,
    kind: t.kind,
    items,
    priority: t.priority,
    tags: [...t.tags],
    address: t.address,
    waiting: null,
    ...date,
  }
}

/** Копия списка для «Дублировать список»: шаблон для нового объекта. Адрес, контакты, бюджет и этап объекта начинаются заново */
export function copyOfProject(p: Project): { name: string; color: string | null; groupId: string | null; viewMode: Project['viewMode']; kind: Project['kind']; site: Project['site'] } {
  return { name: `${p.name} (копия)`, color: p.color, groupId: p.groupId, viewMode: p.viewMode, kind: p.kind, site: p.site ? defaultSite() : null }
}
