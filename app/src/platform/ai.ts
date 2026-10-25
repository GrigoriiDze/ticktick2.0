import { DEFAULT_AI, type AiSettings, type ChatMessage } from '../domain/assistant'

export { DEFAULT_AI, type AiSettings }

export const aiReady = (s: AiSettings | null): s is AiSettings => !!s && s.key.trim() !== '' && s.consent

/** Короткий ответ достаточен: лишние слова стоят денег */
const MAX_ANSWER_TOKENS = 600
const TIMEOUT_MS = 45_000

export class AiError extends Error {}

/** Что сказать человеку по коду ответа сервиса */
export function describeStatus(status: number): string {
  if (status === 401 || status === 403) return 'Ключ не подошёл. Проверьте ключ в настройках помощника'
  if (status === 402) return 'На ключе закончились деньги. Пополните счёт у сервиса ИИ'
  if (status === 404) return 'Такой модели у сервиса нет. Проверьте название модели'
  if (status === 429) return 'Слишком много запросов, подождите минуту'
  if (status >= 500) return 'Сервис ИИ сейчас не отвечает, попробуйте позже'
  return `Сервис ИИ вернул ошибку ${status}`
}

/** Один вопрос помощнику. Сетевые ошибки и коды сервиса превращаются в понятный текст */
export async function askAssistant(
  s: AiSettings,
  messages: Array<ChatMessage | { role: 'system'; content: string }>,
  fetchImpl: typeof fetch = fetch,
): Promise<string> {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS)
  try {
    const res = await fetchImpl(`${s.baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      signal: ctl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s.key.trim()}` },
      body: JSON.stringify({ model: s.model.trim(), messages, max_tokens: MAX_ANSWER_TOKENS, temperature: 0.3 }),
    })
    if (!res.ok) throw new AiError(describeStatus(res.status))
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }>; error?: { message?: string } }
    const text = data.choices?.[0]?.message?.content?.trim()
    if (!text) throw new AiError(data.error?.message ? `Сервис ИИ ответил: ${data.error.message}` : 'Сервис ИИ вернул пустой ответ')
    return text
  } catch (e) {
    if (e instanceof AiError) throw e
    if (e instanceof DOMException && e.name === 'AbortError') throw new AiError('Сервис ИИ долго не отвечает, попробуйте ещё раз')
    throw new AiError('Нет связи с сервисом ИИ. Проверьте интернет')
  } finally {
    clearTimeout(timer)
  }
}

const USAGE_KEY = 'ai-usage'

/** Сколько вопросов уже задано сегодня на этом устройстве */
export function usedToday(day: string): number {
  try {
    const v = JSON.parse(localStorage.getItem(USAGE_KEY) ?? 'null') as { day: string; n: number } | null
    return v && v.day === day ? v.n : 0
  } catch {
    return 0
  }
}

export function countUse(day: string): void {
  try {
    localStorage.setItem(USAGE_KEY, JSON.stringify({ day, n: usedToday(day) + 1 }))
  } catch {
    // не страшно: лимит тогда не считается
  }
}
