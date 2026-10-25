import { useMemo, useState, type FormEvent } from 'react'
import { rangeTitle, shiftAnchor, weekDays } from '../domain/calendar'
import { type DateCtx, type DayKey, today } from '../domain/dates'
import { cycleStatus, habitStats, isActive, monthCells, scheduledDays, tapStatus } from '../domain/habits'
import { buildRule, ruleParts, WEEKDAYS, WEEKDAY_LABEL, type Weekday } from '../domain/repeat'
import type { CheckStatus, Habit, HabitCheckin } from '../domain/types'
import type { HabitPatch } from '../data/habits'

export const HABIT_COLORS = [
  '#FF8585', // Коралловый красный
  '#F18BEC', // Розовый
  '#B79BFF', // Фиолетовый
  '#6E81ED', // Индиго
  '#7BC4FA', // Голубой
  '#A0EFED', // Бирюзовый
  '#8EDB8E', // Салатовый
  '#F5C26B', // Оранжевый / Янтарный
]

const RU_WEEKDAYS = ['Пон.', 'Втр.', 'Срд.', 'Чтв.', 'Птн.', 'Сбт.', 'Вск.']
const RU_WEEKDAYS_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

interface Props {
  habits: Habit[]
  checkins: HabitCheckin[]
  ctx: DateCtx
  wide?: boolean
  onCreate: (name: string, patch?: Partial<HabitPatch>) => void
  onUpdate: (id: string, patch: HabitPatch) => void
  onArchive: (id: string, archived: boolean) => void
  onDelete: (id: string) => void
  onSet: (habitId: string, day: DayKey, status: CheckStatus | undefined) => void
}

type Checks = Map<DayKey, CheckStatus>

/** Подбор иконки по ключевым словам названия привычки */
export function HabitIcon({ name, size = 20 }: { name: string; size?: number }) {
  const s = { width: size, height: size, viewBox: '0 0 24 24', fill: 'currentColor' }
  const lower = name.toLowerCase()

  if (lower.includes('йог') || lower.includes('спорт') || lower.includes('заряд') || lower.includes('трен') || lower.includes('растяж')) {
    return (
      <svg {...s}>
        <circle cx="12" cy="4" r="2" />
        <path d="M15 9l-3 3-3-3v4l-3 5h2.5l2-3.5 2 3.5H18l-3-5z" />
      </svg>
    )
  }
  if (lower.includes('бег') || lower.includes('шаг') || lower.includes('гуля') || lower.includes('ходьб')) {
    return (
      <svg {...s}>
        <circle cx="13" cy="4" r="2" />
        <path d="M19 13l-4-2.5-1.5-3.5c-.3-.7-1-1-1.7-1-.5 0-.9.2-1.2.6L7 11.5l1.6 1.3 2.4-2.4 1 2.6-3 6h2l2.2-4.5 2.8 1.8V22h2v-4.5l-2.4-1.5 1-2.5 2.4 1.5z" />
      </svg>
    )
  }
  if (lower.includes('вод') || lower.includes('пить')) {
    return (
      <svg {...s}>
        <path d="M12 2.7c-.5.7-6 7.6-6 11.3 0 3.3 2.7 6 6 6s6-2.7 6-6c0-3.7-5.5-10.6-6-11.3zm0 15.3c-2.2 0-4-1.8-4-4 0-1.8 2.5-5.6 4-7.5 1.5 1.9 4 5.7 4 7.5 0 2.2-1.8 4-4 4z" />
      </svg>
    )
  }
  if (lower.includes('книг') || lower.includes('чит') || lower.includes('учеб') || lower.includes('образ') || lower.includes('англ') || lower.includes('язык')) {
    return (
      <svg {...s}>
        <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 15H5V5h7v13zm7 0h-6V5h6v13z" />
      </svg>
    )
  }
  if (lower.includes('возд') || lower.includes('отказ') || lower.includes('не кур') || lower.includes('без') || lower.includes('сахар') || lower.includes('алко')) {
    return (
      <svg {...s}>
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="2.2" />
        <path d="M5.6 5.6l12.8 12.8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    )
  }
  if (lower.includes('благод') || lower.includes('добр') || lower.includes('сердц') || lower.includes('люб')) {
    return (
      <svg {...s}>
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
      </svg>
    )
  }
  if (lower.includes('сон') || lower.includes('спат') || lower.includes('подъ') || lower.includes('рано')) {
    return (
      <svg {...s}>
        <path d="M12.3 2a10 10 0 0 0-.3 20 10 10 0 0 0 9.7-7.5c-.7.2-1.4.3-2.2.3A9.8 9.8 0 0 1 9.8 5c0-.8.1-1.6.3-2.3z" />
      </svg>
    )
  }
  if (lower.includes('медит') || lower.includes('дыхан') || lower.includes('спокой')) {
    return (
      <svg {...s}>
        <circle cx="12" cy="5" r="2.5" />
        <path d="M18.5 13.5c-.8-1.5-2.2-2.5-3.8-2.8-.7-.1-1.3-.1-2-.1-.7 0-1.3 0-2 .1-1.6.3-3 1.3-3.8 2.8L5.5 16l1.8 1 1.7-2.7c.5-.8 1.4-1.3 2.3-1.3h1.4c.9 0 1.8.5 2.3 1.3l1.7 2.7 1.8-1-1.7-2.5zM6 19h12v2H6z" />
      </svg>
    )
  }
  if (lower.includes('работ') || lower.includes('контент') || lower.includes('проект') || lower.includes('код') || lower.includes('бизнес')) {
    return (
      <svg {...s}>
        <path d="M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-10-2h4v2h-4V4zm10 15H4v-9h16v9z" />
      </svg>
    )
  }

  // Дефолтная иконка — звезда или галочка
  return (
    <svg {...s}>
      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
    </svg>
  )
}

export function Habits(props: Props) {
  const { habits, checkins, ctx, wide } = props
  const now = today(ctx)
  const [openId, setOpenId] = useState<string | null>(null)
  const [showArchive, setShowArchive] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)

  const checksBy = useMemo(() => {
    const m = new Map<string, Checks>()
    for (const c of checkins) {
      if (!m.has(c.habitId)) m.set(c.habitId, new Map())
      m.get(c.habitId)!.set(c.day, c.status)
    }
    return m
  }, [checkins])

  const sorted = useMemo(() => [...habits].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'ru')), [habits])
  const active = sorted.filter(isActive)
  const archived = sorted.filter((h) => !isActive(h))
  const opened = openId ? habits.find((h) => h.id === openId) ?? null : null

  // 7 дней текущей недели (Пон - Вск)
  const week = useMemo(() => weekDays(now), [now])

  function handleCreate(name: string, patch?: Partial<HabitPatch>) {
    props.onCreate(name, patch)
    setModalOpen(false)
  }

  return (
    <div className="hb-layout">
      <div className="hb-main">
        {/* Шапка экрана привычек */}
        <div className="hb-header">
          <button className="hb-title-btn" aria-label="Раздел привычки">
            <span>Привычка</span>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5.5 7.5L10 12l4.5-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <div className="hb-header-actions">
            <button className="round" onClick={() => (setEditingHabit(null), setModalOpen(true))} aria-label="Добавить привычку" title="Новая привычка">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M10 4v12M4 10h12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Недельная шкала Habit7DaysView (появляется на больших экранах) */}
        {wide && (
          <div className="hb-week-bar">
            <div className="hb-week-cols">
              {week.map((d, i) => {
                const isToday = d === now
                const dayNum = Number(d.slice(8))
                // Сколько привычек выполнено за этот день
                const scheduled = active.filter((h) => scheduledDays(h, d, d).has(d))
                const done = scheduled.filter((h) => checksBy.get(h.id)?.get(d) === 'done')
                const isFull = scheduled.length > 0 && done.length === scheduled.length
                const isPartial = done.length > 0 && done.length < scheduled.length

                return (
                  <div key={d} className={isToday ? 'hb-day-col today' : 'hb-day-col'}>
                    <span className="hb-day-title">{RU_WEEKDAYS[i]}</span>
                    <span className="hb-day-num">{dayNum}</span>
                    <div className={`hb-day-ring${isFull ? ' full' : isPartial ? ' partial' : ''}`}>
                      {isFull ? '✓' : ''}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Список привычек */}
        {active.length === 0 && archived.length === 0 ? (
          <div className="hb-empty">
            <p>Привычек пока нет. Нажмите «+» чтобы создать первую привычку</p>
          </div>
        ) : (
          <ul className="hb-list">
            {active.map((h) => (
              <HabitCard
                key={h.id}
                habit={h}
                checks={checksBy.get(h.id) ?? new Map()}
                now={now}
                week={week}
                wide={wide}
                selected={openId === h.id}
                onSelect={() => setOpenId(openId === h.id ? null : h.id)}
                onSet={props.onSet}
              />
            ))}
          </ul>
        )}

        {/* Секция архива */}
        {archived.length > 0 && (
          <div className="hb-archive-section">
            <button className="ghost archive-toggle" onClick={() => setShowArchive(!showArchive)}>
              Архив ({archived.length}) {showArchive ? '▴' : '▾'}
            </button>
            {showArchive && (
              <ul className="hb-list archived">
                {archived.map((h) => (
                  <HabitCard
                    key={h.id}
                    habit={h}
                    checks={checksBy.get(h.id) ?? new Map()}
                    now={now}
                    week={week}
                    wide={wide}
                    selected={openId === h.id}
                    onSelect={() => setOpenId(openId === h.id ? null : h.id)}
                    onSet={props.onSet}
                    readOnly
                  />
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Быстрое добавление внизу */}
        <div className="hb-bottom-add">
          <button className="hb-add-btn" onClick={() => (setEditingHabit(null), setModalOpen(true))}>
            <span className="hb-add-plus">+</span>
            <span>Новая привычка</span>
          </button>
        </div>
      </div>

      {/* Правая детальная панель (десктоп) */}
      {wide && (
        <aside className="hb-pane">
          {opened ? (
            <HabitDetail
              key={opened.id}
              habit={opened}
              checks={checksBy.get(opened.id) ?? new Map()}
              ctx={ctx}
              onEdit={() => {
                setEditingHabit(opened)
                setModalOpen(true)
              }}
              onArchive={(a) => props.onArchive(opened.id, a)}
              onDelete={() => {
                props.onDelete(opened.id)
                setOpenId(null)
              }}
              onSet={(day, status) => props.onSet(opened.id, day, status)}
            />
          ) : (
            <HabitEmptyState onAdd={() => (setEditingHabit(null), setModalOpen(true))} />
          )}
        </aside>
      )}

      {/* Модальное окно создания / редактирования */}
      {modalOpen && (
        <HabitModal
          habit={editingHabit}
          onSave={(name, patch) => {
            if (editingHabit) props.onUpdate(editingHabit.id, { name, ...patch })
            else handleCreate(name, patch)
            setModalOpen(false)
          }}
          onClose={() => setModalOpen(false)}
        />
      )}
    </div>
  )
}

/** Карточка привычки в списке */
function HabitCard(props: {
  habit: Habit
  checks: Checks
  now: DayKey
  week: DayKey[]
  wide?: boolean
  selected?: boolean
  readOnly?: boolean
  onSelect: () => void
  onSet: (habitId: string, day: DayKey, status: CheckStatus | undefined) => void
}) {
  const { habit, checks, now, week, wide, selected, readOnly } = props
  const stats = useMemo(() => habitStats(habit, checks, now), [habit, checks, now])
  const todayStatus = checks.get(now)

  return (
    <li className={`hb-card${selected ? ' selected' : ''}`} onClick={props.onSelect}>
      {/* Иконка привычки */}
      <div className="hb-icon-badge" style={{ background: habit.color }}>
        <HabitIcon name={habit.name} size={20} />
      </div>

      {/* Информация: заголовок и стрик */}
      <div className="hb-card-info">
        <div className="hb-card-title">{habit.name}</div>
        <div className="hb-card-meta">
          <span>⚡ {stats.total} дней</span>
          <span>🔥 День {stats.currentStreak}</span>
        </div>
      </div>

      {/* Правая часть: 7 точек чекина на десктопе, либо кнопка на мобильном */}
      {wide ? (
        <div className="hb-card-dots" onClick={(e) => e.stopPropagation()}>
          {week.map((day) => {
            const isFuture = day > now
            const isToday = day === now
            const status = checks.get(day)
            const isDone = status === 'done'

            return (
              <button
                key={day}
                disabled={isFuture || readOnly}
                className={`hb-dot-btn${isDone ? ' done' : isToday && !status ? ' today-pending' : ''}`}
                style={isDone ? { background: habit.color, borderColor: habit.color } : undefined}
                onClick={() => props.onSet(habit.id, day, tapStatus(status))}
                aria-label={`${day}: ${isDone ? 'Выполнено' : 'Отметить'}`}
                title={`${day}: ${isDone ? 'Выполнено' : 'Отметить'}`}
              >
                {isDone ? '✓' : ''}
              </button>
            )
          })}
        </div>
      ) : (
        !readOnly && (
          <button
            className={`habit-check ${todayStatus ?? ''}`}
            style={todayStatus === 'done' ? { background: habit.color, borderColor: habit.color } : undefined}
            onClick={(e) => {
              e.stopPropagation()
              props.onSet(habit.id, now, tapStatus(todayStatus))
            }}
            aria-label={todayStatus === 'done' ? 'Снять отметку' : 'Отметить'}
          >
            {todayStatus === 'done' ? '✓' : ''}
          </button>
        )
      )}
    </li>
  )
}

/** Детальная панель привычки (правая колонка) */
function HabitDetail(props: {
  habit: Habit
  checks: Checks
  ctx: DateCtx
  onEdit: () => void
  onArchive: (archived: boolean) => void
  onDelete: () => void
  onSet: (day: DayKey, status: CheckStatus | undefined) => void
}) {
  const { habit, checks, ctx } = props
  const now = today(ctx)
  const [anchor, setAnchor] = useState<DayKey>(now)
  const stats = useMemo(() => habitStats(habit, checks, now), [habit, checks, now])
  const cells = useMemo(() => monthCells(habit, checks, anchor, now), [habit, checks, anchor, now])

  // Подсчёт процента за текущий выбранный месяц
  const monthDoneCount = useMemo(() => {
    return cells.flat().filter((c) => c.inMonth && c.status === 'done').length
  }, [cells])
  const monthScheduledCount = useMemo(() => {
    return cells.flat().filter((c) => c.inMonth && c.scheduled).length
  }, [cells])
  const monthRate = monthScheduledCount > 0 ? Math.round((monthDoneCount / monthScheduledCount) * 100) : 0

  return (
    <div className="hb-detail">
      {/* Шапка детальной карточки */}
      <div className="hb-detail-header">
        <div className="hb-icon-badge large" style={{ background: habit.color }}>
          <HabitIcon name={habit.name} size={24} />
        </div>
        <div className="hb-detail-title-wrap">
          <h2 className="hb-detail-title">{habit.name}</h2>
          <span className="hb-detail-subtitle">{habit.repeat ? 'По расписанию' : 'Каждый день'}</span>
        </div>
        <div className="hb-detail-actions">
          <button className="round" onClick={props.onEdit} title="Редактировать">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M14.5 2.5l3 3L6 17H3v-3L14.5 2.5z" />
            </svg>
          </button>
          <button className="round" onClick={() => props.onArchive(isActive(habit))} title={isActive(habit) ? 'В архив' : 'Из архива'}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M3 5h14v12H3zM2 2h16v3H2zM8 9h4" />
            </svg>
          </button>
          <button className="round danger" onClick={() => window.confirm(`Удалить привычку «${habit.name}»?`) && props.onDelete()} title="Удалить">
            <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
              <path d="M4 6h12M7 6V4h6v2M6 6v11h8V6" />
            </svg>
          </button>
        </div>
      </div>

      {/* Метрики */}
      <div className="hb-stats-grid">
        <div className="hb-stat-card">
          <span className="hb-stat-icon">⚡</span>
          <span className="hb-stat-value">{stats.total}</span>
          <span className="hb-stat-label">Всего дней</span>
        </div>
        <div className="hb-stat-card">
          <span className="hb-stat-icon">🔥</span>
          <span className="hb-stat-value">{stats.currentStreak}</span>
          <span className="hb-stat-label">Текущая серия</span>
        </div>
        <div className="hb-stat-card">
          <span className="hb-stat-icon">🏆</span>
          <span className="hb-stat-value">{stats.bestStreak}</span>
          <span className="hb-stat-label">Лучшая серия</span>
        </div>
        <div className="hb-stat-card">
          <span className="hb-stat-icon">🎯</span>
          <span className="hb-stat-value">{monthRate}%</span>
          <span className="hb-stat-label">В этом месяце</span>
        </div>
      </div>

      {/* Месячный календарь чекинов */}
      <div className="hb-calendar-box">
        <div className="hm-nav">
          <button className="ghost" onClick={() => setAnchor(shiftAnchor('month', anchor, -1))} aria-label="Предыдущий месяц">
            ‹
          </button>
          <span className="hm-month-title">{rangeTitle('month', anchor)}</span>
          <button className="ghost" onClick={() => setAnchor(shiftAnchor('month', anchor, 1))} aria-label="Следующий месяц">
            ›
          </button>
        </div>

        <div className="hm">
          {RU_WEEKDAYS_SHORT.map((d) => (
            <span key={d} className="hm-head">
              {d}
            </span>
          ))}
          {cells.flat().map((c) => (
            <button
              key={c.day}
              disabled={c.future}
              className={`hm-cell${c.inMonth ? '' : ' other'}${c.scheduled ? '' : ' off'} ${c.status ?? (c.scheduled && !c.future && c.day < now ? 'miss' : '')}`}
              style={c.status === 'done' ? { background: habit.color, borderColor: habit.color, color: '#fff' } : undefined}
              onClick={() => props.onSet(c.day, cycleStatus(c.status))}
              aria-label={`${c.day}${c.status ? `, ${c.status === 'done' ? 'выполнено' : 'не выполнено'}` : ''}`}
            >
              {c.status === 'failed' ? '✕' : Number(c.day.slice(8))}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Заглушка правой панели (когда привычка не выбрана) по образцу оригинального TickTick */
function HabitEmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="hb-empty-state">
      <div className="hb-empty-art">
        {/* Художественная иллюстрация открытого блокнота, чашки и карандаша */}
        <svg width="200" height="200" viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.45">
          {/* Блокнот */}
          <rect x="45" y="55" width="110" height="90" rx="8" />
          <path d="M100 55v90M45 80h55M100 80h55M45 105h55M100 105h55M45 130h55M100 130h55" strokeDasharray="3 3" />
          {/* Карандаш */}
          <path d="M165 45l15 15-70 70-15-15 70-70zM95 130l-8 2 2-8 6 6z" />
          {/* Кружка */}
          <path d="M25 110h20v25c0 6-4 10-10 10s-10-4-10-10v-25zM25 118h-6c-3 0-5 2-5 5s2 5 5 5h6" />
          {/* Галочка в круге */}
          <circle cx="150" cy="140" r="14" />
          <path d="M144 140l4 4 8-8" />
          {/* Искорки */}
          <path d="M75 35l2 4 4 2-4 2-2 4-2-4-4-2 4-2zM170 170l2 3 3 2-3 2-2 3-2-3-3-2 3-2z" fill="currentColor" />
        </svg>
      </div>
      <p className="hb-empty-hint">Выберите привычку для просмотра статистики</p>
      <button className="hb-sparkle-btn" onClick={onAdd} title="Создать привычку">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z" />
        </svg>
      </button>
    </div>
  )
}

/** Модальное окно создания и редактирования привычки */
function HabitModal({
  habit,
  onSave,
  onClose,
}: {
  habit: Habit | null
  onSave: (name: string, patch: Partial<HabitPatch>) => void
  onClose: () => void
}) {
  const [name, setName] = useState(habit?.name ?? '')
  const [color, setColor] = useState(habit?.color ?? HABIT_COLORS[0])
  const [reminder, setReminder] = useState(habit?.reminders[0] ?? '')
  const parts = habit?.repeat ? ruleParts(habit.repeat) : null
  const [selectedDays, setSelectedDays] = useState<Set<Weekday>>(() => new Set<Weekday>(parts?.freq === 'WEEKLY' ? parts.byday : WEEKDAYS))
  const [isEveryDay, setIsEveryDay] = useState(() => !habit?.repeat || (parts?.freq === 'WEEKLY' && parts.byday.length === 0))

  function toggleDay(d: Weekday) {
    const next = new Set(selectedDays)
    if (next.has(d)) next.delete(d)
    else next.add(d)
    if (next.size > 0) {
      setSelectedDays(next)
      setIsEveryDay(next.size === 7)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const text = name.trim()
    if (!text) return

    let repeat: string | null = null
    if (!isEveryDay && selectedDays.size > 0 && selectedDays.size < 7) {
      repeat = buildRule({ freq: 'WEEKLY', interval: 1, byday: WEEKDAYS.filter((d) => selectedDays.has(d)), bymonthday: null })
    }

    onSave(text, {
      color,
      repeat,
      reminders: reminder ? [reminder] : [],
    })
  }

  return (
    <>
      <div className="scrim on" onClick={onClose} />
      <div className="dialog hb-modal" role="dialog" aria-label={habit ? 'Редактировать привычку' : 'Новая привычка'}>
        <div className="hb-modal-header">
          <h3>{habit ? 'Редактировать привычку' : 'Новая привычка'}</h3>
          <button className="round" onClick={onClose} aria-label="Закрыть">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="hb-modal-form">
          <div className="hb-modal-row">
            <div className="hb-icon-badge large" style={{ background: color }}>
              <HabitIcon name={name || 'Привычка'} size={24} />
            </div>
            <input
              autoFocus
              className="hb-modal-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Название привычки (например, Пить воду)"
            />
          </div>

          {/* Палитра цветов */}
          <div className="hb-form-group">
            <label className="hb-form-label">Цвет</label>
            <div className="hb-color-swatches">
              {HABIT_COLORS.map((c) => (
                <button
                  type="button"
                  key={c}
                  className={`hb-color-swatch${color === c ? ' on' : ''}`}
                  style={{ background: c }}
                  onClick={() => setColor(c)}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          {/* Расписание */}
          <div className="hb-form-group">
            <label className="hb-form-label">Дни повторения</label>
            <div className="hb-repeat-chips">
              <button
                type="button"
                className={`chip${isEveryDay ? ' on' : ''}`}
                onClick={() => {
                  setIsEveryDay(true)
                  setSelectedDays(new Set(WEEKDAYS))
                }}
              >
                Каждый день
              </button>
              <button
                type="button"
                className={`chip${!isEveryDay && selectedDays.size === 5 && !selectedDays.has('SA') && !selectedDays.has('SU') ? ' on' : ''}`}
                onClick={() => {
                  setIsEveryDay(false)
                  setSelectedDays(new Set(['MO', 'TU', 'WE', 'TH', 'FR']))
                }}
              >
                По будням
              </button>
            </div>
            <div className="hb-weekday-picker">
              {WEEKDAYS.map((d) => (
                <button
                  type="button"
                  key={d}
                  className={`hb-day-chip${!isEveryDay && selectedDays.has(d) ? ' on' : ''}`}
                  onClick={() => toggleDay(d)}
                >
                  {WEEKDAY_LABEL[d]}
                </button>
              ))}
            </div>
          </div>

          {/* Напоминание */}
          <div className="hb-form-group">
            <label className="hb-form-label">Напоминание</label>
            <input
              type="time"
              className="hb-time-input"
              value={reminder}
              onChange={(e) => setReminder(e.target.value)}
            />
          </div>

          <div className="hb-modal-footer">
            <button type="button" className="ghost" onClick={onClose}>
              Отмена
            </button>
            <button type="submit" className="primary" disabled={!name.trim()}>
              {habit ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
