import { formatDue, type DateCtx } from './dates'
import { sortedItems } from './extras'
import type { Task } from './types'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Лист для бригады текстом: название списка, задачи с галочками, срок и адрес, под задачей её пункты */
export function listAsText(title: string, tasks: Task[], ctx: DateCtx): string {
  const lines = [title, '']
  for (const t of tasks) {
    const due = formatDue(t, ctx)
    const tail = [due?.text, t.address].filter(Boolean).join(', ')
    lines.push(`☐ ${t.title}${tail ? ` (${tail})` : ''}`)
    for (const [, i] of sortedItems(t.items)) lines.push(`    ${i.done ? '☑' : '☐'} ${i.title}`)
  }
  return lines.join('\n')
}

/** То же для печати: страница с крупным шрифтом, без лишнего. Открывается в новом окне и печатается */
export function listAsHtml(title: string, tasks: Task[], ctx: DateCtx): string {
  const rows = tasks
    .map((t) => {
      const due = formatDue(t, ctx)
      const tail = [due?.text, t.address].filter(Boolean).join(', ')
      const sub = sortedItems(t.items)
        .map(([, i]) => `<li>${i.done ? '☑' : '☐'} ${esc(i.title)}</li>`)
        .join('')
      return `<li><span class="box">☐</span> ${esc(t.title)}${tail ? ` <small>(${esc(tail)})</small>` : ''}${sub ? `<ul>${sub}</ul>` : ''}</li>`
    })
    .join('')
  return `<!doctype html><html lang="ru"><meta charset="utf-8"><title>${esc(title)}</title><style>body{font:16px/1.5 sans-serif;margin:24px;color:#000}h1{font-size:22px;margin:0 0 12px}ul{list-style:none;padding:0;margin:0}li{margin:6px 0}ul ul{margin-left:28px;font-size:14px}small{color:#444}.box{font-size:18px}</style><h1>${esc(title)}</h1><ul>${rows}</ul>`
}
