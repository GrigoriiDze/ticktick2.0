import { useEffect, useRef, useState } from 'react'
import { dueReminders, type DueReminder } from '../domain/reminders'
import type { Task } from '../domain/types'

const HANDLED_KEY = 'rem-handled'
const SNOOZE_MIN = 10
/** Сработавшее давно (человек был не за компьютером) в окне не показываем, оно видно в списке как просроченное */
const MAX_AGE_MS = 30 * 60_000
const MAX_SHOWN = 3

function loadHandled(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(HANDLED_KEY) ?? '[]') as string[])
  } catch {
    return new Set()
  }
}

function saveHandled(set: Set<string>): void {
  try {
    localStorage.setItem(HANDLED_KEY, JSON.stringify([...set].slice(-300)))
  } catch {
    // не страшно: окно может показаться ещё раз после перезапуска
  }
}

/** Короткий мягкий сигнал, пока не подключён свой звуковой файл */
function chime(): void {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.setValueAtTime(0.0001, ctx.currentTime)
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.6)
    osc.connect(gain).connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.65)
    osc.onended = () => void ctx.close()
  } catch {
    // звук не обязателен
  }
}

interface Props {
  /** null, пока задачи не загрузились */
  tasks: Task[] | null
  onOpen: (taskId: string) => void
  onDone: (task: Task) => void
}

/**
 * Окно напоминания на компьютере и в браузере, как в десктопном TickTick: срок, название, начало заметки,
 * «Отсрочка» и «Выполнено». Системное уведомление Windows показываем тоже, если человек его разрешил
 */
export function ReminderPopups({ tasks, onOpen, onDone }: Props) {
  const [shown, setShown] = useState<DueReminder[]>([])
  const handled = useRef<Set<string>>(loadHandled())
  const snoozed = useRef(new Map<string, number>())
  const announced = useRef(new Set<string>())
  const tasksRef = useRef(tasks)
  tasksRef.current = tasks

  useEffect(() => {
    if (tasks === null) return
    const tick = () => {
      const now = Date.now()
      const list = dueReminders(tasksRef.current ?? [], { now, tz: Intl.DateTimeFormat().resolvedOptions().timeZone }, handled.current, MAX_AGE_MS).filter((r) => (snoozed.current.get(r.key) ?? 0) <= now)
      const fresh = list.filter((r) => !announced.current.has(r.key))
      if (fresh.length) {
        chime()
        for (const r of fresh) {
          announced.current.add(r.key)
          if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
            try {
              new Notification(r.title, { body: `(${r.when})` })
            } catch {
              // системное уведомление не обязательно
            }
          }
        }
      }
      setShown((prev) => (prev.map((r) => r.key).join('|') === list.map((r) => r.key).join('|') ? prev : list))
    }
    tick()
    const id = window.setInterval(tick, 5000)
    return () => window.clearInterval(id)
  }, [tasks !== null])

  const hide = (key: string) => setShown((s) => s.filter((r) => r.key !== key))
  const dismiss = (key: string) => {
    handled.current.add(key)
    saveHandled(handled.current)
    hide(key)
  }
  const snooze = (key: string) => {
    snoozed.current.set(key, Date.now() + SNOOZE_MIN * 60_000)
    announced.current.delete(key)
    hide(key)
  }

  if (shown.length === 0) return null
  return (
    <div className="rem-stack" role="alert" aria-live="assertive">
      {shown.slice(0, MAX_SHOWN).map((r) => {
        const task = tasks?.find((t) => t.id === r.taskId)
        return (
          <section key={r.key} className="rem-card">
            <header>
              <time>{r.when}</time>
              <button className="ghost" onClick={() => dismiss(r.key)} aria-label="Закрыть напоминание">
                <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                  <path d="M2.5 2.5l9 9M11.5 2.5l-9 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </header>
            <button
              className="rem-title"
              onClick={() => {
                onOpen(r.taskId)
                dismiss(r.key)
              }}
            >
              {r.title}
            </button>
            {r.note && <p className="rem-note">{r.note}</p>}
            <footer>
              <button className="secondary" onClick={() => snooze(r.key)}>
                Отсрочка
              </button>
              <button
                className="primary"
                onClick={() => {
                  if (task) onDone(task)
                  dismiss(r.key)
                }}
              >
                Выполнено
              </button>
            </footer>
          </section>
        )
      })}
      {shown.length > MAX_SHOWN && <p className="rem-more">и ещё {shown.length - MAX_SHOWN}</p>}
    </div>
  )
}
