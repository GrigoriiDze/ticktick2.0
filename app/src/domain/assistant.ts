import { dueDay, today, type DateCtx } from './dates'
import { plainText } from './extras'
import { formatMoment } from './history'
import type { Project, Task } from './types'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/** Сколько открытых задач уходит помощнику. Больше не нужно: тратятся деньги на ключе, а ответ лучше не становится */
export const CONTEXT_TASKS = 120
/** Сколько последних реплик переписки уходит с вопросом */
export const HISTORY_MESSAGES = 6
const NOTE_CHARS = 160
const PRIORITY = { 0: '', 1: 'низкий приоритет', 3: 'средний приоритет', 5: 'высокий приоритет' } as Record<number, string>
const WEEK = 7 * 86_400_000

/** Срочные выше: по дате срока (просроченные получаются первыми), без срока в конце. При равной дате закреплённые и важные выше */
function urgency(t: Task, ctx: DateCtx): number {
  const day = dueDay(t, ctx.tz)
  const base = day === null ? 1e9 : Number(day.replaceAll('-', ''))
  return base - (t.pinnedAt !== null ? 0.5 : 0) - t.priority * 0.05
}

function line(t: Task, ctx: DateCtx, listName: (id: string) => string): string {
  const parts = [t.title.trim(), `список «${listName(t.projectId)}»`]
  if (t.due !== null) parts.push(`срок ${formatMoment(t.due, ctx)}`)
  if (PRIORITY[t.priority]) parts.push(PRIORITY[t.priority])
  if (t.tags.length) parts.push(`метки ${t.tags.join(', ')}`)
  if (t.address) parts.push(`адрес ${t.address}`)
  const done = Object.values(t.items).filter((i) => i.done).length
  const total = Object.keys(t.items).length
  if (total) parts.push(`пунктов выполнено ${done} из ${total}`)
  const note = plainText(t.content).replace(/\s+/g, ' ').trim()
  if (note) parts.push(`заметка: ${note.length > NOTE_CHARS ? note.slice(0, NOTE_CHARS) + '…' : note}`)
  return `- ${parts.join('; ')}`
}

/**
 * Всё, что помощник знает о пользователе: открытые задачи (самые срочные), недавно выполненные и сегодняшняя дата.
 * Больше ничего из приложения наружу не уходит
 */
export function buildContext(tasks: Task[], projects: Project[], ctx: DateCtx, max = CONTEXT_TASKS): string {
  const names = new Map(projects.map((p) => [p.id, p.name]))
  const listName = (id: string) => names.get(id) ?? 'без списка'
  const live = tasks.filter((t) => t.deletedAt === null && t.parentId === null)
  const open = live.filter((t) => t.status === 'open').sort((a, b) => urgency(a, ctx) - urgency(b, ctx))
  const recent = live
    .filter((t) => t.status === 'done' && t.completedAt !== null && ctx.now - t.completedAt < WEEK)
    .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
    .slice(0, 30)
  const out = [`Сегодня ${formatMoment(today(ctx), ctx)}, часовой пояс ${ctx.tz}.`, `Открытых задач ${open.length}${open.length > max ? `, показаны ${max} самых срочных` : ''}:`]
  out.push(...open.slice(0, max).map((t) => line(t, ctx, listName)))
  if (recent.length) {
    out.push('', 'Выполнено за последние 7 дней:')
    out.push(...recent.map((t) => `- ${t.title.trim()}; выполнено ${formatMoment(t.completedAt, ctx)}`))
  }
  return out.join('\n')
}

export const SYSTEM_PROMPT = [
  'Ты помощник в приложении-задачнике. Отвечай по-русски, коротко и по делу, простыми словами.',
  'Опирайся только на список задач ниже. Не выдумывай задачи, сроки и факты. Если данных не хватает, так и скажи.',
  'Не обсуждай темы, не связанные с задачами и работой пользователя.',
  'Если просят план, предложи порядок действий с учётом сроков и важности. Не пиши длинных вступлений.',
].join(' ')

/** Сообщения для запроса: инструкция с задачами и последние реплики переписки */
export function buildMessages(history: ChatMessage[], context: string): Array<{ role: 'system' | 'user' | 'assistant'; content: string }> {
  return [{ role: 'system', content: `${SYSTEM_PROMPT}\n\n${context}` }, ...history.slice(-HISTORY_MESSAGES)]
}

/** Быстрые вопросы под полем ввода */
export const QUICK_QUESTIONS = ['Что сегодня главное?', 'Что просрочено?', 'Составь план на неделю', 'Что я сделал за неделю?']

/** Настройки помощника. Хранятся в базе пользователя, поэтому ключ один раз вносится и работает на всех его устройствах */
export interface AiSettings {
  key: string
  /** Название модели у сервиса, например openai/gpt-4o-mini. Берём недорогую */
  model: string
  /** Адрес сервиса, совместимого с OpenAI. По умолчанию OpenRouter */
  baseUrl: string
  /** Сколько вопросов в день можно задать, чтобы не сжечь деньги на ключе */
  dailyLimit: number
  /** Пользователь согласился, что названия и сроки его задач уходят сервису ИИ */
  consent: boolean
}

export const DEFAULT_AI: AiSettings = { key: '', model: 'openai/gpt-4o-mini', baseUrl: 'https://openrouter.ai/api/v1', dailyLimit: 30, consent: false }
