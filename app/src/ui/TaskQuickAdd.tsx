import { useEffect, useRef, useState, type FormEvent } from 'react'
import { addDays, formatRowDay, today, type DateCtx, type DayKey } from '../domain/dates'
import { AT_TIME, EMPTY_DATE, type DateValue } from '../domain/datevalue'
import { normalizeTag } from '../domain/extras'
import { parseSmart } from '../domain/smartdate'
import type { Priority, Project } from '../domain/types'
import { startVoice, voiceSupported } from '../platform/voice'
import { DatePicker } from './DatePicker'
import { CalendarIcon, FlagIcon, ListIcon, MicIcon, SendIcon, TagIcon } from './icons'
import { PopMenu, type PopItem } from './PopMenu'

export interface QuickTask {
  title: string
  date: DateValue
  priority: Priority
  projectId: string
  tags: string[]
  /** Описание, набранное сразу под названием */
  content: string
}

interface Props {
  ctx: DateCtx
  projects: Project[]
  allTags: string[]
  defaultProjectId: string
  defaultDay: DayKey | null
  /** Время, если добавляют по нажатию на час в календаре */
  defaultTime?: string | null
  onSubmit: (task: QuickTask) => void
  onClose: () => void
  leaving?: boolean
}

const PRIORITIES: Array<{ value: Priority; title: string }> = [
  { value: 5, title: 'Высокий приоритет' },
  { value: 3, title: 'Средний приоритет' },
  { value: 1, title: 'Низкий приоритет' },
  { value: 0, title: 'Без приоритета' },
]

type Menu = 'priority' | 'list' | 'tag' | null

function loadDefaultPriority(): Priority {
  try {
    const v = Number(localStorage.getItem('tt_default_priority') ?? '0')
    if (v === 5 || v === 3 || v === 1) return v
  } catch {}
  return 0
}

function loadDefaultDayPref(ctx: DateCtx, explicitDay: DayKey | null): DayKey | null {
  if (explicitDay !== null) return explicitDay
  try {
    const pref = localStorage.getItem('tt_default_date')
    if (pref === 'today') return today(ctx)
    if (pref === 'tomorrow') return addDays(today(ctx), 1)
  } catch {}
  return null
}

/**
 * Быстрое добавление по кнопке «+». Дату можно написать словами («завтра в 7 вечера», «в пятницу»),
 * метку через решётку («#срочно»): найденное видно на кнопке даты до отправки
 */
export function TaskQuickAdd({ ctx, projects, allTags, defaultProjectId, defaultDay, defaultTime = null, onSubmit, onClose, leaving }: Props) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [manual, setManual] = useState<DateValue | null>(null)
  const [priority, setPriority] = useState<Priority>(() => loadDefaultPriority())
  const [projectId, setProjectId] = useState(defaultProjectId)
  const [picked, setPicked] = useState<string[]>([])
  const [menu, setMenu] = useState<Menu>(null)
  const [picker, setPicker] = useState(false)
  const [voiceOk, setVoiceOk] = useState(false)
  const [listening, setListening] = useState(false)
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const stopVoice = useRef<(() => void) | null>(null)

  useEffect(() => {
    let alive = true
    void voiceSupported().then((ok) => alive && setVoiceOk(ok))
    return () => {
      alive = false
      stopVoice.current?.()
    }
  }, [])

  /** Нажатие на микрофон: говорим, текст появляется в строке и разбирается как набранный */
  async function toggleVoice() {
    if (listening) {
      stopVoice.current?.()
      return
    }
    setVoiceError(null)
    setListening(true)
    const before = title.trim()
    stopVoice.current = await startVoice({
      onText: (text) => setTitle(before ? `${before} ${text}` : text),
      onEnd: () => {
        stopVoice.current = null
        setListening(false)
      },
      onError: (message) => setVoiceError(message),
    })
  }

  const rawSmart = parseSmart(title, ctx)
  const smartDateEnabled = (() => {
    try { return localStorage.getItem('tt_smart_date_rec') !== '0' } catch { return true }
  })()
  const smartTagEnabled = (() => {
    try { return localStorage.getItem('tt_smart_tag_rec') !== '0' } catch { return true }
  })()
  const smartRemoveText = (() => {
    try { return localStorage.getItem('tt_smart_remove_text') !== '0' } catch { return true }
  })()

  const smart = {
    title: smartRemoveText ? rawSmart.title : title,
    day: smartDateEnabled ? rawSmart.day : null,
    time: smartDateEnabled ? rawSmart.time : null,
    tags: smartTagEnabled ? rawSmart.tags : [],
  }

  const resolvedDefaultDay = loadDefaultDayPref(ctx, defaultDay)
  // Своя дата главнее той, что нашлась в тексте
  const fallback: DateValue = resolvedDefaultDay
    ? { ...EMPTY_DATE, day: resolvedDefaultDay, time: defaultTime, reminders: defaultTime ? [AT_TIME] : [] }
    : EMPTY_DATE
  const date: DateValue =
    manual ?? (smart.day ? { ...EMPTY_DATE, day: smart.day, time: smart.time, reminders: smart.time ? [AT_TIME] : [] } : fallback)
  const dateLabel = date.day ? (date.time ? `${formatRowDay(date.day, ctx)} ${date.time}` : formatRowDay(date.day, ctx)) : null
  const tags = [...new Set([...smart.tags.map(normalizeTag), ...picked])].filter(Boolean)

  function submit(e: FormEvent) {
    e.preventDefault()
    const text = smart.title.trim()
    if (!text) {
      onClose()
      return
    }
    onSubmit({ title: text, date, priority, projectId, tags, content: content.trim() })
  }

  const priorityItems: PopItem[] = PRIORITIES.map((p) => ({
    key: String(p.value),
    title: p.title,
    checked: priority === p.value,
    icon: <FlagIcon size={20} className={`flag p${p.value}`} />,
    onPick: () => setPriority(p.value),
  }))
  const listItems: PopItem[] = projects.map((p) => ({ key: p.id, title: p.name, checked: projectId === p.id, icon: <ListIcon size={20} />, onPick: () => setProjectId(p.id) }))
  const tagItems: PopItem[] = [
    ...allTags.map((t) => ({ key: t, title: `#${t}`, checked: picked.includes(t), onPick: () => setPicked(picked.includes(t) ? picked.filter((x) => x !== t) : [...picked, t]) })),
    { key: '__new', title: 'Новая метка', onPick: () => setTitle((v) => `${v}${v && !v.endsWith(' ') ? ' ' : ''}#`) },
  ]

  return (
    <>
      <div className={leaving ? 'scrim on leaving' : 'scrim on'} onClick={onClose} />
      <form className={leaving ? 'sheet quick-task leaving' : 'sheet quick-task'} onSubmit={submit}>
        <input autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Доставка еды завтра в 7 вечера" enterKeyHint="done" aria-label="Название задачи" />
        <textarea className="qt-note" value={content} onChange={(e) => setContent(e.target.value)} placeholder="Описание" rows={2} aria-label="Описание" />

        {voiceError && <p className="muted qt-voice-error">{voiceError}</p>}
        <div className="qt-bar">
          <button type="button" className={dateLabel ? 'qt-btn on' : 'qt-btn'} onClick={() => setPicker(true)} aria-label="Дата">
            <CalendarIcon size={22} />
            {dateLabel && <span>{dateLabel}</span>}
          </button>
          <button type="button" className={priority ? 'qt-btn on' : 'qt-btn'} onClick={() => setMenu('priority')} aria-label="Приоритет">
            <FlagIcon size={22} className={priority ? `flag p${priority}` : undefined} />
          </button>
          <button type="button" className={tags.length ? 'qt-btn on' : 'qt-btn'} onClick={() => setMenu('tag')} aria-label="Метка">
            <TagIcon size={22} />
            {tags.length > 0 && <span>{tags.length}</span>}
          </button>
          <button type="button" className={projectId !== defaultProjectId ? 'qt-btn on' : 'qt-btn'} onClick={() => setMenu(
'list')} aria-label="Список">
            <ListIcon size={22} />
          </button>
          <span className="qt-spacer" />
          {voiceOk && !smart.title.trim() && (
            <button type="button" className={listening ? 'qt-btn on listening' : 'qt-btn'} onClick={() => void toggleVoice()} aria-label={listening ? 'Остановить запись' : 'Сказать голосом'} aria-pressed={listening}>
              <MicIcon size={22} />
            </button>
          )}
          {smart.title.trim() && (
            <button type="submit" className="send" aria-label="Добавить">
              <SendIcon size={22} />
            </button>
          )}
        </div>
      </form>

      {menu === 'priority' && <PopMenu label="Приоритет" items={priorityItems} onClose={() => setMenu(null)} />}
      {menu === 'list' && <PopMenu label="Список" items={listItems} onClose={() => setMenu(null)} />}
      {menu === 'tag' && <PopMenu label="Метка" items={tagItems} onClose={() => setMenu(null)} />}
      {picker && <DatePicker ctx={ctx} value={date} onApply={(v) => setManual(v)} onClose={() => setPicker(false)} />}
    </>
  )
}
