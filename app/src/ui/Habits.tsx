import { useEffect, useMemo, useState } from 'react'
import { weekdayIndex, weekDays } from '../domain/calendar'
import { today, type DayKey } from '../domain/dates'
import { isActive, scheduledDays, tapStatus } from '../domain/habits'
import type { Habit } from '../domain/types'
import type { HabitPatch } from '../data/habits'
import { HabitLogSheet } from './HabitLogSheet'
import { MobileHabitRow } from '../features/habits/components/MobileHabitRow'
import { MobileHabitDetailScreen } from '../features/habits/components/MobileHabitDetailScreen'
import { MobileHabitGalleryScreen } from '../features/habits/components/MobileHabitGalleryScreen'
import { MobileHabitFormScreen } from '../features/habits/components/MobileHabitFormScreen'
import { HabitCard } from '../features/habits/components/HabitCard'
import { HabitDetail } from '../features/habits/components/HabitDetail'
import { HabitEmptyState } from '../features/habits/components/HabitEmptyState'
import { HabitModal } from '../features/habits/components/HabitModal'
import {
  RU_WEEKDAYS,
  RU_WEEKDAYS_LOWER,
} from '../features/habits/constants'
import type { Checks, HabitsProps } from '../features/habits/types'

export { HabitIcon } from '../features/habits/components/HabitIcon'
export { HABIT_COLORS } from '../features/habits/constants'
export type { HabitsProps } from '../features/habits/types'

export function Habits(props: HabitsProps) {
  const { habits, checkins, ctx, wide } = props
  const now = today(ctx)
  const [selectedDay, setSelectedDay] = useState<DayKey>(now)
  const [openId, setOpenId] = useState<string | null>(null)
  const [showArchive, setShowArchive] = useState(false)
  const [groupCollapsed, setGroupCollapsed] = useState(false)
  const [modalStep, setModalStep] = useState<'closed' | 'gallery' | 'form'>('closed')
  const [editingHabit, setEditingHabit] = useState<Habit | null>(null)
  const [prefill, setPrefill] = useState<{ name: string; color: string; quote: string } | null>(null)
  const [logHabitId, setLogHabitId] = useState<string | null>(null)

  useEffect(() => {
    if (modalStep === 'closed' && !openId && !logHabitId) return
    const onBack = (e: Event) => {
      e.preventDefault()
      if (modalStep === 'form' && !editingHabit) {
        setModalStep('gallery')
      } else if (modalStep !== 'closed') {
        setModalStep('closed')
        setEditingHabit(null)
        setPrefill(null)
      } else if (logHabitId) {
        setLogHabitId(null)
      } else if (openId) {
        setOpenId(null)
      }
    }
    window.addEventListener('tt-back-request', onBack)
    return () => window.removeEventListener('tt-back-request', onBack)
  }, [modalStep, openId, editingHabit, logHabitId])

  const checksBy = useMemo(() => {
    const m = new Map<string, Checks>()
    for (const c of checkins) {
      if (!m.has(c.habitId)) m.set(c.habitId, new Map())
      m.get(c.habitId)!.set(c.day, c.status)
    }
    return m
  }, [checkins])

  const sorted = useMemo(
    () => [...habits].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name, 'ru')),
    [habits],
  )
  const active = sorted.filter(isActive)
  const archived = sorted.filter((h) => !isActive(h))
  const opened = openId ? habits.find((h) => h.id === openId) ?? null : null

  const week = useMemo(() => weekDays(now), [now])

  function handleCreate(name: string, patch?: Partial<HabitPatch>) {
    props.onCreate(name, patch)
    setModalStep('closed')
    setEditingHabit(null)
    setPrefill(null)
  }

  function openGallery() {
    setEditingHabit(null)
    setPrefill(null)
    setModalStep(wide ? 'form' : 'gallery')
  }

  function openEdit(h: Habit) {
    setEditingHabit(h)
    setPrefill(null)
    setModalStep('form')
  }

  // ==================== МОБИЛЬНЫЙ ЭКРАН ПРИВЫЧЕК ====================
  if (!wide) {
    return (
      <div className="m-hb-screen">
        <header className="m-hb-head">
          <h1 className="m-hb-title">Привычка</h1>
          <div className="m-hb-head-actions">
            <button
              className="m-cal-btn"
              onClick={() => {
                if (active[0]) setOpenId(active[0].id)
              }}
              aria-label="Статистика привычек"
              title="Статистика"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="8.5" />
                <path d="M12 3.5V12h8.5" />
              </svg>
            </button>
            <button
              className="m-cal-btn"
              onClick={() => setShowArchive((v) => !v)}
              aria-label="Журнал и архив"
              title="Архив"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <rect x="5" y="3.5" width="14" height="17" rx="3" />
                <path d="M9.5 3.5v6" />
              </svg>
            </button>
            <button
              className="m-cal-btn"
              onClick={openGallery}
              aria-label="Управление привычками"
              title="Управление"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <line x1="4" y1="7" x2="20" y2="7" />
                <circle cx="9" cy="7" r="2" fill="var(--bg)" />
                <line x1="4" y1="12" x2="20" y2="12" />
                <circle cx="15" cy="12" r="2" fill="var(--bg)" />
                <line x1="4" y1="17" x2="20" y2="17" />
                <circle cx="10" cy="17" r="2" fill="var(--bg)" />
              </svg>
            </button>
          </div>
        </header>

        <div className="m-hb-week-strip">
          {week.map((d) => {
            const isSel = d === selectedDay
            const isToday = d === now
            const wd = RU_WEEKDAYS_LOWER[weekdayIndex(d)]
            return (
              <button key={d} className="m-tg-day-btn" onClick={() => setSelectedDay(d)}>
                <span className={`m-tg-wd${isToday ? ' today-wd' : ''}`}>{wd}</span>
                <span className={`m-tg-num${isSel ? ' today' : isToday ? ' sel' : ''}`}>
                  {Number(d.slice(8))}
                </span>
              </button>
            )
          })}
        </div>

        <div className="m-hb-body">
          {active.length === 0 && archived.length === 0 ? (
            <div className="m-hb-card">
              <div className="m-hb-card-head">
                <span className="m-hb-group-title">Другие</span>
                <span className="m-hb-group-count">0</span>
              </div>
              <div className="m-cal-list-empty">Нет активных привычек. Нажмите «+», чтобы выбрать из галереи</div>
            </div>
          ) : (
            <div className="m-hb-card">
              <button
                type="button"
                className="m-hb-card-head"
                onClick={() => setGroupCollapsed((c) => !c)}
              >
                <span className="m-hb-group-title">Другие</span>
                <span className="m-hb-group-count">
                  {active.length}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ transform: groupCollapsed ? 'rotate(-90deg)' : 'none', transition: 'transform 0.15s' }}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </button>

              {!groupCollapsed && (
                <div className="m-hb-rows">
                  {active.map((h) => (
                    <MobileHabitRow
                      key={h.id}
                      habit={h}
                      checks={checksBy.get(h.id) ?? new Map()}
                      day={selectedDay}
                      now={now}
                      onOpen={() => setOpenId(h.id)}
                      onEdit={() => openEdit(h)}
                      onDelete={() => props.onDelete(h.id)}
                      onToggleDay={() => {
                        const cur = checksBy.get(h.id)?.get(selectedDay)
                        props.onSet(h.id, selectedDay, tapStatus(cur))
                      }}
                      onOpenLog={() => setLogHabitId(h.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {archived.length > 0 && (
            <div className="m-hb-card">
              <button
                type="button"
                className="m-hb-card-head"
                onClick={() => setShowArchive((s) => !s)}
              >
                <span className="m-hb-group-title">Архив</span>
                <span className="m-hb-group-count">
                  {archived.length}
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{ transform: showArchive ? 'none' : 'rotate(-90deg)', transition: 'transform 0.15s' }}
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </button>
              {showArchive && (
                <div className="m-hb-rows">
                  {archived.map((h) => (
                    <MobileHabitRow
                      key={h.id}
                      habit={h}
                      checks={checksBy.get(h.id) ?? new Map()}
                      day={selectedDay}
                      now={now}
                      onOpen={() => setOpenId(h.id)}
                      onEdit={() => openEdit(h)}
                      onDelete={() => props.onDelete(h.id)}
                      onToggleDay={() => {}}
                      onOpenLog={() => setLogHabitId(h.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <button className="primary fab" onClick={openGallery} aria-label="Новая привычка">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        {opened && (
          <MobileHabitDetailScreen
            habit={opened}
            checks={checksBy.get(opened.id) ?? new Map()}
            ctx={ctx}
            selectedDay={selectedDay}
            onClose={() => setOpenId(null)}
            onEdit={() => openEdit(opened)}
            onArchive={(a) => props.onArchive(opened.id, a)}
            onDelete={() => {
              props.onDelete(opened.id)
              setOpenId(null)
            }}
            onSet={(day, status) => props.onSet(opened.id, day, status)}
          />
        )}

        <HabitLogSheet
          open={Boolean(logHabitId)}
          habit={logHabitId ? habits.find((h) => h.id === logHabitId) ?? null : null}
          day={selectedDay}
          initialStatus={logHabitId ? checksBy.get(logHabitId)?.get(selectedDay) : undefined}
          initialNote={logHabitId ? (checkins.find((c) => c.habitId === logHabitId && c.day === selectedDay)?.note ?? null) : null}
          onSave={(hId, day, status, note) => {
            props.onSet(hId, day, status, note)
          }}
          onClose={() => setLogHabitId(null)}
        />

        {modalStep === 'gallery' && (
          <MobileHabitGalleryScreen
            onClose={() => setModalStep('closed')}
            onPickTemplate={(t) => {
              setPrefill({ name: t.name, color: t.color, quote: t.quote })
              setModalStep('form')
            }}
            onCreateCustom={() => {
              setPrefill(null)
              setModalStep('form')
            }}
          />
        )}

        {modalStep === 'form' && (
          <MobileHabitFormScreen
            habit={editingHabit}
            prefill={prefill}
            onBack={() => {
              if (editingHabit) {
                setModalStep('closed')
                setEditingHabit(null)
              } else {
                setModalStep('gallery')
              }
            }}
            onSave={(name, patch) => {
              if (editingHabit) {
                props.onUpdate(editingHabit.id, { name, ...patch })
                setModalStep('closed')
                setEditingHabit(null)
              } else {
                handleCreate(name, patch)
              }
            }}
          />
        )}
      </div>
    )
  }

  // ==================== ДЕСКТОПНЫЙ ЭКРАН ПРИВЫЧЕК ====================
  return (
    <div className="hb-layout">
      <div className="hb-main">
        <div className="hb-header">
          <button className="hb-title-btn" aria-label="Раздел привычки">
            <span>Привычка</span>
            <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5.5 7.5L10 12l4.5-4.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          <div className="hb-header-actions">
            <button className="round" onClick={openGallery} aria-label="Добавить привычку" title="Новая привычка">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M10 4v12M4 10h12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="hb-week-bar">
          <div className="hb-week-cols">
            {week.map((d, i) => {
              const isToday = d === now
              const dayNum = Number(d.slice(8))
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

        <div className="hb-bottom-add">
          <button className="hb-add-btn" onClick={openGallery}>
            <span className="hb-add-plus">+</span>
            <span>Новая привычка</span>
          </button>
        </div>
      </div>

      <aside className="hb-pane">
        {opened ? (
          <HabitDetail
            key={opened.id}
            habit={opened}
            checks={checksBy.get(opened.id) ?? new Map()}
            ctx={ctx}
            onEdit={() => openEdit(opened)}
            onArchive={(a) => props.onArchive(opened.id, a)}
            onDelete={() => {
              props.onDelete(opened.id)
              setOpenId(null)
            }}
            onSet={(day, status) => props.onSet(opened.id, day, status)}
          />
        ) : (
          <HabitEmptyState onAdd={openGallery} />
        )}
      </aside>

      {modalStep !== 'closed' && (
        <HabitModal
          habit={editingHabit}
          onSave={(name, patch) => {
            if (editingHabit) props.onUpdate(editingHabit.id, { name, ...patch })
            else handleCreate(name, patch)
            setModalStep('closed')
            setEditingHabit(null)
          }}
          onClose={() => {
            setModalStep('closed')
            setEditingHabit(null)
          }}
        />
      )}
    </div>
  )
}
