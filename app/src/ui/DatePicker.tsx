import { useMemo, useState } from 'react'
import { monthGrid, sameMonth } from '../domain/calendar'
import { addDays, localToMs, today, type DateCtx, type DayKey } from '../domain/dates'
import { addReminder, customTrigger, removeReminder, sameTrigger, DURATIONS, EMPTY_DATE, remindersAfterTimeChange, splitTrigger, type DateValue } from '../domain/datevalue'
import { describeTrigger, fireTime, reminderChoices } from '../domain/reminders'
import { buildRule, describeRule, repeatPresets, ruleParts, WEEKDAYS, WEEKDAY_LABEL, type Freq, type RuleParts } from '../domain/repeat'
import { AlarmIcon, ChevronDown, ChevronLeft, ChevronRight, ClockIcon, CheckIcon, CloseIcon, RepeatIcon } from './icons'
import { PopMenu, type PopItem } from './PopMenu'
import { Wheel, type WheelItem } from './Wheel'

interface Props {
  leaving?: boolean
  ctx: DateCtx
  value: DateValue
  onApply: (value: DateValue) => void
  onClose: () => void
}

const MONTH_NAMES = ['январь', 'февраль', 'март', 'апрель', 'май', 'июнь', 'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь']
const WEEK_HEAD = ['п', 'в', 'с', 'ч', 'п', 'с', 'в']

const range = (from: number, to: number, pad = false): Array<WheelItem<number>> =>
  Array.from({ length: to - from + 1 }, (_, i) => ({ value: from + i, label: pad ? String(from + i).padStart(2, '0') : String(from + i) }))

const HOURS = range(0, 23, true)
const MINUTES = range(0, 59, true)
const DAYS_BEFORE = range(0, 30)
const INTERVALS = range(1, 99)
const UNITS: Array<WheelItem<Freq>> = [
  { value: 'DAILY', label: 'День' },
  { value: 'WEEKLY', label: 'Неделя' },
  { value: 'MONTHLY', label: 'Месяц' },
  { value: 'YEARLY', label: 'Год' },
]

type Sub = 'time' | 'reminder' | 'repeat' | null
type Menu = 'reminder' | 'repeat' | 'duration' | null

/** Окно «Дата»: календарь, время, напоминание и повтор в одном месте. Правки копятся, пока не нажата галочка */
export function DatePicker({ ctx, value, onApply, onClose, leaving }: Props) {
  const now = today(ctx)
  const [draft, setDraft] = useState<DateValue>(value)
  const [anchor, setAnchor] = useState<DayKey>(value.day ?? now)
  const [sub, setSub] = useState<Sub>(null)
  const [menu, setMenu] = useState<Menu>(null)
  const weeks = useMemo(() => monthGrid(anchor), [anchor])
  const hasDay = draft.day !== null
  const allDay = draft.time === null

  const set = (patch: Partial<DateValue>) => setDraft((d) => ({ ...d, ...patch }))
  const pickDay = (day: DayKey) => {
    set({ day })
    setAnchor(day)
  }
  const shiftMonth = (n: number) => {
    const [y, m] = anchor.split('-').map(Number)
    const next = new Date(Date.UTC(y, m - 1 + n, 1))
    setAnchor(`${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, '0')}-01`)
  }

  const choices = reminderChoices(allDay)
  const titleOf = (trigger: string) => choices.find((c) => sameTrigger(c.trigger, trigger))?.title ?? describeTrigger(trigger)

  const presets = repeatPresets(draft.day ?? now)
  const repeatPreset = draft.repeat ? presets.find((p) => p.rule === draft.repeat) : undefined
  const repeatLabel = !draft.repeat ? 'Нет' : repeatPreset ? repeatPreset.title : describeRule(draft.repeat, ctx)

  const durationLabel = DURATIONS.find((d) => d.minutes === draft.duration)?.title ?? `${draft.duration} мин`
  const durationItems: PopItem[] = DURATIONS.map((d) => ({ key: String(d.minutes), title: d.title, checked: draft.duration === d.minutes, onPick: () => set({ duration: d.minutes }) }))

  // Напоминаний у задачи может быть сколько угодно: уже выбранные в списке не предлагаем второй раз
  const reminderItems: PopItem[] = [
    ...choices.filter((c) => !draft.reminders.some((t) => sameTrigger(t, c.trigger))).map((c) => ({ key: c.key, title: c.title, onPick: () => set({ reminders: addReminder(draft.reminders, c.trigger) }) })),
    ...(allDay ? [] : [{ key: 'custom', title: 'Произвольно', chevron: true, onPick: () => setSub('reminder') }]),
  ]

  const repeatItems: PopItem[] = [
    { key: 'none', title: 'Нет', checked: !draft.repeat, onPick: () => set({ repeat: null }) },
    ...presets.map((p) => ({ key: p.key, title: p.title, hint: p.hint || undefined, checked: draft.repeat === p.rule, onPick: () => set({ repeat: p.rule }) })),
    { key: 'custom', title: 'Произвольно', hint: draft.repeat && !repeatPreset ? describeRule(draft.repeat, ctx) : undefined, checked: !!draft.repeat && !repeatPreset, chevron: true, onPick: () => setSub('repeat') },
  ]

  return (
    <>
      <div className={leaving ? 'scrim on leaving' : 'scrim on'} onClick={onClose} />
      <section className={leaving ? 'sheet datepicker leaving' : 'sheet datepicker'} role="dialog" aria-label="Дата">
        <div className="dp-head">
          <button className="round" onClick={onClose} aria-label="Закрыть">
            <CloseIcon size={20} />
          </button>
          <button className="round accent" onClick={() => (onApply(draft), onClose())} aria-label="Готово">
            <CheckIcon size={22} />
          </button>
        </div>

        <div className="quick" role="group" aria-label="Быстрый выбор">
          <button className={draft.day === now ? 'chip on' : 'chip'} onClick={() => pickDay(now)}>
            Сегодня
          </button>
          <button className={draft.day === addDays(now, 1) ? 'chip on' : 'chip'} onClick={() => pickDay(addDays(now, 1))}>
            Завтра
          </button>
          <button className={draft.day === addDays(now, 7) ? 'chip on' : 'chip'} onClick={() => pickDay(addDays(now, 7))}>
            Через неделю
          </button>
        </div>

        <div className="dp-month">
          <button className="ghost" onClick={() => shiftMonth(-1)} aria-label="Прошлый месяц">
            <ChevronLeft size={20} />
          </button>
          <strong>
            {MONTH_NAMES[Number(anchor.slice(5, 7)) - 1]} {anchor.slice(0, 4)}
          </strong>
          <button className="ghost" onClick={() => shiftMonth(1)} aria-label="Следующий месяц">
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="dp-grid" role="grid">
          {WEEK_HEAD.map((h, i) => (
            <span key={i} className="dp-wd">
              {h}
            </span>
          ))}
          {weeks.flat().map((d) => (
            <button
              key={d}
              className={['dp-day', d === draft.day ? 'sel' : '', d === now ? 'today' : '', sameMonth(d, anchor) ? '' : 'off'].filter(Boolean).join(' ')}
              aria-label={d}
              aria-pressed={d === draft.day}
              onClick={() => pickDay(d)}
            >
              {Number(d.slice(8))}
            </button>
          ))}
        </div>

        <div className="dp-rows">
          <button className="dp-row" disabled={!hasDay} onClick={() => setSub('time')}>
            <ClockIcon size={22} />
            <span className="dp-label">Время</span>
            <span className="dp-value">{draft.time ?? 'Нет'}</span>
            {draft.time && (
              <span
                className="dp-clear"
                role="button"
                aria-label="Убрать время"
                onClick={(e) => {
                  e.stopPropagation()
                  set({ time: null, duration: null, reminders: remindersAfterTimeChange(draft, null) })
                }}
              >
                <CloseIcon size={16} />
              </span>
            )}
          </button>
          {draft.time && (
            <button className="dp-row" onClick={() => setMenu('duration')}>
              <ClockIcon size={22} />
              <span className="dp-label">Длительность</span>
              <span className="dp-value">{durationLabel}</span>
              <ChevronDown size={16} />
            </button>
          )}
          <button className="dp-row" disabled={!hasDay || reminderItems.length === 0} onClick={() => setMenu('reminder')}>
            <span aria-hidden="true"><AlarmIcon size={22} /></span>
            <span className="dp-label">Напоминание</span>
            <span className="dp-value">{draft.reminders.length === 0 ? 'Нет' : 'Добавить'}</span>
          </button>
          {draft.reminders.length > 0 && (
            <div className="dp-reminders" role="list" aria-label="Напоминания">
              {draft.reminders.map((t) => (
                <button key={t} role="listitem" className="chip on rem-chip" onClick={() => set({ reminders: removeReminder(draft.reminders, t) })} aria-label={`Убрать напоминание: ${titleOf(t)}`}>
                  {titleOf(t)} ×
                </button>
              ))}
            </div>
          )}
          <button className="dp-row" disabled={!hasDay} onClick={() => setMenu('repeat')}>
            <span aria-hidden="true"><RepeatIcon size={22} /></span>
            <span className="dp-label">Повтор</span>
            <span className="dp-value">{repeatLabel}</span>
            <ChevronDown size={16} />
          </button>
          {draft.repeat && (
            <label className="switch dp-switch">
              <input type="checkbox" checked={draft.repeatFrom === 'done'} onChange={(e) => set({ repeatFrom: e.target.checked ? 'done' : 'due' })} />
              <span>Считать от дня выполнения</span>
            </label>
          )}
        </div>

        <button className="dp-clear-all" onClick={() => (onApply(EMPTY_DATE), onClose())}>
          Очистить
        </button>
      </section>

      {menu === 'duration' && <PopMenu label="Длительность" items={durationItems} onClose={() => setMenu(null)} />}
      {menu === 'reminder' && <PopMenu label="Напоминание" items={reminderItems} onClose={() => setMenu(null)} />}
      {menu === 'repeat' && <PopMenu label="Повтор" items={repeatItems} onClose={() => setMenu(null)} />}

      {sub === 'time' && (
        <TimeDialog
          value={draft.time ?? '09:00'}
          onCancel={() => setSub(null)}
          onApply={(time) => {
            set({ time, reminders: remindersAfterTimeChange(draft, time) })
            setSub(null)
          }}
        />
      )}
      {sub === 'reminder' && draft.day && draft.time && (
        <ReminderDialog
          initial={null}
          day={draft.day}
          time={draft.time}
          ctx={ctx}
          onCancel={() => setSub(null)}
          onApply={(trigger) => {
            set({ reminders: addReminder(draft.reminders, trigger) })
            setSub(null)
          }}
        />
      )}
      {sub === 'repeat' && (
        <RepeatDialog
          rule={draft.repeat}
          ctx={ctx}
          onCancel={() => setSub(null)}
          onApply={(rule) => {
            set({ repeat: rule })
            setSub(null)
          }}
        />
      )}
    </>
  )
}

function TimeDialog({ value, onApply, onCancel }: { value: string; onApply: (time: string) => void; onCancel: () => void }) {
  const [h, setH] = useState(Number(value.slice(0, 2)))
  const [m, setM] = useState(Number(value.slice(3, 5)))
  return (
    <>
      <div className="scrim on top" onClick={onCancel} />
      <section className="dialog" role="dialog" aria-label="Время">
        <div className="wheels">
          <Wheel items={HOURS} value={h} onChange={setH} label="Часы" />
          <span className="wheel-sep">:</span>
          <Wheel items={MINUTES} value={m} onChange={setM} label="Минуты" />
        </div>
        <div className="dialog-actions">
          <button className="secondary" onClick={onCancel}>
            Отмена
          </button>
          <button className="primary" onClick={() => onApply(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`)}>
            Готово
          </button>
        </div>
      </section>
    </>
  )
}

function ReminderDialog(props: { initial: string | null; day: DayKey; time: string; ctx: DateCtx; onApply: (trigger: string) => void; onCancel: () => void }) {
  const start = props.initial ? splitTrigger(props.initial) : { days: 0, hours: 0, minutes: 15 }
  const [d, setD] = useState(start.days)
  const [h, setH] = useState(start.hours)
  const [m, setM] = useState(start.minutes)
  const trigger = customTrigger(d, h, m)
  const fire = fireTime({ due: localToMs(props.day, props.time, props.ctx.tz), isAllDay: false }, trigger, props.ctx.tz)
  const expired = fire !== null && fire < props.ctx.now

  return (
    <>
      <div className="scrim on top" onClick={props.onCancel} />
      <section className="dialog" role="dialog" aria-label="Настроить уведомление">
        <h2>Настроить уведомление</h2>
        <div className="wheels">
          <Wheel items={DAYS_BEFORE} value={d} onChange={setD} label="Дни" />
          <span className="wheel-unit">день</span>
          <Wheel items={HOURS.map((x) => ({ value: x.value, label: String(x.value) }))} value={h} onChange={setH} label="Часы до срока" />
          <span className="wheel-unit">ч</span>
          <Wheel items={MINUTES.map((x) => ({ value: x.value, label: String(x.value) }))} value={m} onChange={setM} label="Минуты до срока" />
          <span className="wheel-unit">мин</span>
        </div>
        {expired && <p className="dialog-warn">Напоминание истекло</p>}
        <div className="dialog-actions">
          <button className="secondary" onClick={props.onCancel}>
            Отмена
          </button>
          <button className="primary" onClick={() => props.onApply(trigger)}>
            Добавить
          </button>
        </div>
      </section>
    </>
  )
}

function RepeatDialog({ rule, ctx, onApply, onCancel }: { rule: string | null; ctx: DateCtx; onApply: (rule: string) => void; onCancel: () => void }) {
  const [parts, setParts] = useState<RuleParts>(() => (rule && ruleParts(rule)) || { freq: 'WEEKLY', interval: 1, byday: [], bymonthday: null })
  const next = (patch: Partial<RuleParts>) => setParts((p) => ({ ...p, ...patch }))
  const built = buildRule(parts)

  return (
    <>
      <div className="scrim on top" onClick={onCancel} />
      <section className="sheet datepicker top" role="dialog" aria-label="Повторять произвольно">
        <div className="dp-head">
          <button className="round" onClick={onCancel} aria-label="Закрыть">
            <CloseIcon size={20} />
          </button>
          <strong>Повторять произвольно</strong>
          <button className="round accent" onClick={() => onApply(built)} aria-label="Готово">
            <CheckIcon size={22} />
          </button>
        </div>

        <div className="rp-card">
          <span className="rp-every">Каждые</span>
          <div className="wheels">
            <Wheel items={INTERVALS} value={parts.interval} onChange={(interval) => next({ interval })} label="Через сколько" />
            <Wheel items={UNITS} value={parts.freq} onChange={(freq) => next({ freq, byday: [], bymonthday: null })} label="Единица" />
          </div>
        </div>
        <p className="muted rp-preview">{describeRule(built, ctx)}</p>

        {parts.freq === 'WEEKLY' && (
          <div className="stages" role="group" aria-label="Дни недели">
            {WEEKDAYS.map((d) => (
              <button
                key={d}
                type="button"
                className={parts.byday.includes(d) ? 'chip on' : 'chip'}
                onClick={() => next({ byday: parts.byday.includes(d) ? parts.byday.filter((x) => x !== d) : [...parts.byday, d] })}
              >
                {WEEKDAY_LABEL[d]}
              </button>
            ))}
          </div>
        )}
        {parts.freq === 'MONTHLY' && (
          <div className="rp-days" role="group" aria-label="Число месяца">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((n) => (
              <button key={n} className={parts.bymonthday === n ? 'dp-day sel' : 'dp-day'} onClick={() => next({ bymonthday: parts.bymonthday === n ? null : n })}>
                {n}
              </button>
            ))}
          </div>
        )}
      </section>
    </>
  )
}
