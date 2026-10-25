import { useEffect, useRef, useState } from 'react'
import { buildContext, buildMessages, QUICK_QUESTIONS, type AiSettings, type ChatMessage } from '../domain/assistant'
import { today, type DateCtx } from '../domain/dates'
import type { Project, Task } from '../domain/types'
import { aiReady, askAssistant, countUse, usedToday } from '../platform/ai'
import { SendIcon } from './icons'

interface Props {
  tasks: Task[]
  projects: Project[]
  ctx: DateCtx
  /** null, пока настройки не загрузились */
  settings: AiSettings | null
  onSettings: (patch: Partial<AiSettings>) => void
}

const CHAT_KEY = 'ai-chat'

function loadChat(): ChatMessage[] {
  try {
    const v = JSON.parse(localStorage.getItem(CHAT_KEY) ?? '[]') as ChatMessage[]
    return Array.isArray(v) ? v.slice(-20) : []
  } catch {
    return []
  }
}

/** Помощник: отвечает по задачам пользователя. Больше ничего из приложения сервису ИИ не отправляется */
export function Assistant({ tasks, projects, ctx, settings, onSettings }: Props) {
  const [chat, setChat] = useState<ChatMessage[]>(loadChat)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [setup, setSetup] = useState(false)
  const end = useRef<HTMLDivElement>(null)
  const day = today(ctx)
  const left = settings ? Math.max(0, settings.dailyLimit - usedToday(day)) : 0

  useEffect(() => {
    try {
      localStorage.setItem(CHAT_KEY, JSON.stringify(chat.slice(-20)))
    } catch {
      // не страшно
    }
    end.current?.scrollIntoView({ block: 'end' })
  }, [chat, busy])

  if (!settings) return <p className="muted">Загрузка</p>
  if (!aiReady(settings) || setup) return <Setup settings={settings} onSave={(p) => (onSettings(p), setSetup(false))} onCancel={aiReady(settings) ? () => setSetup(false) : undefined} />

  async function send(question: string) {
    const q = question.trim()
    if (!q || busy || !settings) return
    if (left <= 0) {
      setError(`На сегодня лимит в ${settings.dailyLimit} вопросов исчерпан. Завтра заработает снова, лимит меняется в настройках помощника`)
      return
    }
    const next: ChatMessage[] = [...chat, { role: 'user', content: q }]
    setChat(next)
    setText('')
    setError(null)
    setBusy(true)
    try {
      const answer = await askAssistant(settings, buildMessages(next, buildContext(tasks, projects, ctx)))
      countUse(day)
      setChat([...next, { role: 'assistant', content: answer }])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="assistant">
      <div className="as-log" role="log" aria-live="polite">
        {chat.length === 0 && (
          <div className="as-empty">
            <p>Спросите про свои задачи: что срочно, что просрочено, как распределить неделю.</p>
            <div className="as-quick">
              {QUICK_QUESTIONS.map((q) => (
                <button key={q} className="chip" onClick={() => void send(q)} disabled={busy}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {chat.map((m, i) => (
          <div key={i} className={m.role === 'user' ? 'as-msg me' : 'as-msg'}>
            {m.content}
          </div>
        ))}
        {busy && <div className="as-msg wait">Думаю…</div>}
        {error && <p className="error as-error">{error}</p>}
        <div ref={end} />
      </div>

      <form
        className="as-form"
        onSubmit={(e) => {
          e.preventDefault()
          void send(text)
        }}
      >
        <textarea
          value={text}
          rows={1}
          placeholder="Вопрос по задачам"
          aria-label="Вопрос помощнику"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void send(text)
            }
          }}
        />
        <button className="primary as-send" type="submit" disabled={busy || !text.trim()} aria-label="Отправить">
          <SendIcon size={20} />
        </button>
      </form>
      <p className="muted as-foot">
        Сегодня осталось вопросов: {left}.{' '}
        <button className="ghost as-link" onClick={() => setSetup(true)}>
          Настройки помощника
        </button>
        {chat.length > 0 && (
          <>
            {' '}
            <button className="ghost as-link" onClick={() => setChat([])}>
              Очистить переписку
            </button>
          </>
        )}
      </p>
    </div>
  )
}

function Setup({ settings, onSave, onCancel }: { settings: AiSettings; onSave: (patch: Partial<AiSettings>) => void; onCancel?: () => void }) {
  const [key, setKey] = useState(settings.key)
  const [model, setModel] = useState(settings.model)
  const [baseUrl, setBaseUrl] = useState(settings.baseUrl)
  const [limit, setLimit] = useState(String(settings.dailyLimit))
  const [consent, setConsent] = useState(settings.consent)
  const valid = key.trim() !== '' && model.trim() !== '' && consent

  return (
    <form
      className="as-setup"
      onSubmit={(e) => {
        e.preventDefault()
        if (!valid) return
        onSave({ key: key.trim(), model: model.trim(), baseUrl: baseUrl.trim() || settings.baseUrl, dailyLimit: Math.max(1, Math.min(500, Number(limit) || 30)), consent })
      }}
    >
      <h2>Помощник по задачам</h2>
      <p className="muted">
        Когда вы задаёте вопрос, сервису ИИ отправляются названия, сроки, метки, адреса и начало заметок ваших открытых задач, выполненные за неделю и сам вопрос. Больше ничего из приложения не уходит.
      </p>
      <label className="field">
        <span className="field-label">Ключ сервиса</span>
        <input className="plain-select" type="password" value={key} onChange={(e) => setKey(e.target.value)} autoComplete="off" placeholder="sk-or-…" />
      </label>
      <label className="field">
        <span className="field-label">Модель</span>
        <input className="plain-select" value={model} onChange={(e) => setModel(e.target.value)} placeholder="openai/gpt-4o-mini" />
      </label>
      <label className="field">
        <span className="field-label">Сколько вопросов в день можно задать</span>
        <input className="plain-select" inputMode="numeric" value={limit} onChange={(e) => setLimit(e.target.value)} />
      </label>
      <details>
        <summary>Адрес сервиса</summary>
        <input className="plain-select" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} aria-label="Адрес сервиса" />
      </details>
      <label className="switch dp-switch">
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} />
        <span>Согласен, что задачи отправляются сервису ИИ</span>
      </label>
      <div className="as-actions">
        <button className="primary" type="submit" disabled={!valid}>
          Сохранить
        </button>
        {onCancel && (
          <button className="secondary" type="button" onClick={onCancel}>
            Отмена
          </button>
        )}
      </div>
    </form>
  )
}
