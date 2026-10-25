import { useEffect, useMemo, useState } from 'react'
import {
  focusStatsForDay,
  formatTimer,
  loadFocusSessions,
  POMO_DURATIONS,
  saveFocusSessions,
  type FocusSession,
  type PomoMode,
  type PomoStatus,
} from '../domain/pomo'
import type { Task } from '../domain/types'
import { playChime, playTick, setWhiteNoise } from '../platform/audio'
import type { RowActions } from './TaskList'

interface Props {
  tasks: Task[]
  actions: RowActions
}

type SoundMode = 'none' | 'tick' | 'noise'

export function Pomo({ tasks, actions }: Props) {
  const [mode, setMode] = useState<PomoMode>('pomo')
  const [status, setStatus] = useState<PomoStatus>('idle')
  const [timeLeft, setTimeLeft] = useState<number>(POMO_DURATIONS.pomo)
  const [stopwatchSec, setStopwatchSec] = useState<number>(0)
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [taskPickerOpen, setTaskPickerOpen] = useState(false)
  const [sound, setSound] = useState<SoundMode>('none')
  const [sessions, setSessions] = useState<FocusSession[]>(loadFocusSessions)

  const selectedTask = useMemo(() => tasks.find((t) => t.id === selectedTaskId) ?? null, [tasks, selectedTaskId])
  const openTasks = useMemo(() => tasks.filter((t) => t.status === 'open'), [tasks])

  // Общее время для текущего режима
  const totalDuration = mode === 'stopwatch' ? 0 : POMO_DURATIONS[mode]

  // Расчёт статистики за сегодня
  const todayStats = useMemo(() => {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000
    return focusStatsForDay(sessions, startOfDay, endOfDay)
  }, [sessions])

  // Управление белым шумом
  useEffect(() => {
    setWhiteNoise(status === 'running' && sound === 'noise')
    return () => setWhiteNoise(false)
  }, [status, sound])

  // Таймер отсчёта
  useEffect(() => {
    if (status !== 'running') return

    const interval = setInterval(() => {
      if (sound === 'tick') {
        playTick()
      }

      if (mode === 'stopwatch') {
        setStopwatchSec((s) => s + 1)
      } else {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            // Сессия завершилась
            playChime()
            setStatus('idle')

            if (mode === 'pomo') {
              const newSession: FocusSession = {
                id: String(Date.now()),
                taskId: selectedTaskId,
                taskTitle: selectedTask?.title ?? null,
                durationSec: POMO_DURATIONS.pomo,
                completedAt: Date.now(),
                mode: 'pomo',
              }
              const updated = [...sessions, newSession]
              setSessions(updated)
              saveFocusSessions(updated)
              // Переход на короткий перерыв
              setMode('shortBreak')
              return POMO_DURATIONS.shortBreak
            } else {
              // Перерыв закончился, возвращаем помодоро
              setMode('pomo')
              return POMO_DURATIONS.pomo
            }
          }
          return prev - 1
        })
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [status, mode, sound, selectedTaskId, selectedTask, sessions])

  function handleSwitchMode(newMode: PomoMode) {
    if (status === 'running') {
      if (!window.confirm('Текущая сессия будет сброшена. Переключить?')) return
    }
    setStatus('idle')
    setMode(newMode)
    if (newMode === 'stopwatch') {
      setStopwatchSec(0)
    } else {
      setTimeLeft(POMO_DURATIONS[newMode])
    }
  }

  function handleTogglePlay() {
    if (status === 'running') {
      setStatus('paused')
    } else {
      setStatus('running')
    }
  }

  function handleReset() {
    if (mode === 'stopwatch' && stopwatchSec > 60) {
      // Сохраняем сессию секундомера при сбросе
      const newSession: FocusSession = {
        id: String(Date.now()),
        taskId: selectedTaskId,
        taskTitle: selectedTask?.title ?? null,
        durationSec: stopwatchSec,
        completedAt: Date.now(),
        mode: 'stopwatch',
      }
      const updated = [...sessions, newSession]
      setSessions(updated)
      saveFocusSessions(updated)
    }
    setStatus('idle')
    if (mode === 'stopwatch') {
      setStopwatchSec(0)
    } else {
      setTimeLeft(POMO_DURATIONS[mode])
    }
  }

  // Расчёт SVG прогресса по кругу (радиус 110, длина окружности 2 * PI * 110 ≈ 691.15)
  const radius = 110
  const circumference = 2 * Math.PI * radius
  const progressFraction =
    mode === 'stopwatch'
      ? (stopwatchSec % 60) / 60
      : totalDuration > 0
        ? (totalDuration - timeLeft) / totalDuration
        : 0
  const strokeDashoffset = circumference - progressFraction * circumference

  const timeDisplay = mode === 'stopwatch' ? formatTimer(stopwatchSec) : formatTimer(timeLeft)

  const modeLabel =
    mode === 'pomo'
      ? 'Фокусировка'
      : mode === 'shortBreak'
        ? 'Короткий перерыв'
        : mode === 'longBreak'
          ? 'Длинный перерыв'
          : 'Секундомер'

  return (
    <div className="pomo-root">
      <div className="pomo-card">
        {/* Переключатель режимов */}
        <div className="pomo-tabs">
          <button
            type="button"
            className={`pomo-tab${mode === 'pomo' ? ' on' : ''}`}
            onClick={() => handleSwitchMode('pomo')}
          >
            Помодоро
          </button>
          <button
            type="button"
            className={`pomo-tab${mode === 'shortBreak' ? ' on' : ''}`}
            onClick={() => handleSwitchMode('shortBreak')}
          >
            Перерыв (5м)
          </button>
          <button
            type="button"
            className={`pomo-tab${mode === 'longBreak' ? ' on' : ''}`}
            onClick={() => handleSwitchMode('longBreak')}
          >
            Длинный (15м)
          </button>
          <button
            type="button"
            className={`pomo-tab${mode === 'stopwatch' ? ' on' : ''}`}
            onClick={() => handleSwitchMode('stopwatch')}
          >
            Секундомер
          </button>
        </div>

        {/* Круговой индикатор таймера */}
        <div className="pomo-timer-wrap">
          <svg className="pomo-ring" width="260" height="260" viewBox="0 0 260 260">
            <circle
              className="pomo-ring-bg"
              cx="130"
              cy="130"
              r={radius}
              fill="none"
              strokeWidth="8"
            />
            <circle
              className={`pomo-ring-progress ${mode}`}
              cx="130"
              cy="130"
              r={radius}
              fill="none"
              strokeWidth="8"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              transform="rotate(-90 130 130)"
            />
          </svg>
          <div className="pomo-timer-center">
            <span className="pomo-time">{timeDisplay}</span>
            <span className="pomo-mode-hint">{modeLabel}</span>
          </div>
        </div>

        {/* Привязка к задаче */}
        <div className="pomo-task-section">
          {selectedTask ? (
            <div className="pomo-selected-task">
              <input
                type="checkbox"
                checked={selectedTask.status === 'done'}
                onChange={() => actions.toggle(selectedTask)}
                title="Выполнить задачу"
              />
              <span className="pomo-selected-title" onClick={() => actions.open(selectedTask.id)}>
                {selectedTask.title}
              </span>
              <button
                type="button"
                className="pomo-clear-task"
                onClick={() => setSelectedTaskId(null)}
                title="Отвязать задачу"
              >
                ✕
              </button>
            </div>
          ) : (
            <div className="pomo-pick-task-wrap">
              <button
                type="button"
                className="pomo-pick-btn"
                onClick={() => setTaskPickerOpen(!taskPickerOpen)}
              >
                <span>🎯</span>
                <span>Выбрать задачу для фокуса</span>
              </button>

              {taskPickerOpen && (
                <div className="pomo-task-dropdown">
                  <div className="pomo-drop-head">Выберите задачу</div>
                  <div className="pomo-drop-list">
                    {openTasks.length === 0 ? (
                      <div className="pomo-drop-empty">Нет открытых задач</div>
                    ) : (
                      openTasks.map((t) => (
                        <button
                          key={t.id}
                          type="button"
                          className="pomo-drop-item"
                          onClick={() => {
                            setSelectedTaskId(t.id)
                            setTaskPickerOpen(false)
                          }}
                        >
                          {t.title}
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Кнопки управления */}
        <div className="pomo-controls">
          <button
            type="button"
            className="pomo-btn-secondary"
            onClick={handleReset}
            title="Сброс таймера"
            aria-label="Сброс"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
              <path d="M3 3v5h5" />
            </svg>
          </button>

          <button
            type="button"
            className={`pomo-play-btn ${status === 'running' ? 'pause' : 'play'}`}
            onClick={handleTogglePlay}
            aria-label={status === 'running' ? 'Пауза' : 'Старт'}
          >
            {status === 'running' ? (
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1.5" />
                <rect x="14" y="4" width="4" height="16" rx="1.5" />
              </svg>
            ) : (
              <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3" />
              </svg>
            )}
          </button>

          {/* Меню фонового звука */}
          <div className="pomo-sound-menu">
            <button
              type="button"
              className={`pomo-btn-secondary${sound !== 'none' ? ' on' : ''}`}
              title="Фоновый звук"
              onClick={() => {
                if (sound === 'none') setSound('tick')
                else if (sound === 'tick') setSound('noise')
                else setSound('none')
              }}
            >
              {sound === 'none' && <span>🔇</span>}
              {sound === 'tick' && <span>⏰</span>}
              {sound === 'noise' && <span>🌧️</span>}
            </button>
          </div>
        </div>

        {/* Статистика за день */}
        <div className="pomo-footer-stats">
          <span className="pomo-stat-item">
            <strong>{todayStats.minutes}</strong> мин концентрации
          </span>
          <span className="pomo-stat-dot">•</span>
          <span className="pomo-stat-item">
            <strong>{todayStats.pomoCount}</strong> помодоро завершено
          </span>
        </div>
      </div>
    </div>
  )
}
