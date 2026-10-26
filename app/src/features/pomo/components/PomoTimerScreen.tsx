import type { PomoMode, PomoStatus } from '../../../domain/pomo'
import { formatTimer } from '../../../domain/pomo'
import { WHITE_NOISE_LABELS, type WhiteNoiseId } from '../../../platform/audio'
import { ChevronRight } from '../../../ui/icons'
import type { Task } from '../../../domain/types'

interface Props {
  mode: PomoMode
  status: PomoStatus
  displaySec: number
  progress: number
  whiteNoise: WhiteNoiseId
  selectedTask: Task | null
  todayStats: { pomoCount: number; minutes: number }
  onSwitchTab: (tab: 'pomo' | 'stopwatch') => void
  onToggleStartPause: () => void
  onStopOrFinish: () => void
  onOpenTaskPicker: () => void
  onOpenDurationPicker: () => void
  onOpenNoiseModal: () => void
  onOpenAddRecord: () => void
  onOpenStats: () => void
  onOpenMoreMenu: () => void
}

export function PomoTimerScreen({
  mode,
  status,
  displaySec,
  progress,
  whiteNoise,
  selectedTask,
  todayStats,
  onSwitchTab,
  onToggleStartPause,
  onStopOrFinish,
  onOpenTaskPicker,
  onOpenDurationPicker,
  onOpenNoiseModal,
  onOpenAddRecord,
  onOpenStats,
  onOpenMoreMenu,
}: Props) {
  const isStopwatch = mode === 'stopwatch'
  const isBreak = mode === 'shortBreak' || mode === 'longBreak'
  const ringColor = isBreak ? '#0cce9c' : '#4772fa'

  const radius = 122
  const circumference = 2 * Math.PI * radius
  const dashOffset = circumference * (1 - Math.min(1, Math.max(0, progress)))

  return (
    <div className="m-focus-page">
      <header className="m-focus-toolbar">
        <div className="m-focus-tabs" role="tablist" aria-label="Режим фокуса">
          <button
            type="button"
            role="tab"
            aria-selected={!isStopwatch}
            className={!isStopwatch ? 'm-focus-tab active' : 'm-focus-tab'}
            onClick={() => onSwitchTab('pomo')}
          >
            Помо
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isStopwatch}
            className={isStopwatch ? 'm-focus-tab active' : 'm-focus-tab'}
            onClick={() => onSwitchTab('stopwatch')}
          >
            Секундомер
          </button>
        </div>

        <div className="m-focus-toolbar-actions">
          <button
            type="button"
            className="m-focus-icon-btn"
            onClick={onOpenAddRecord}
            aria-label="Добавить запись фокуса"
            title="Добавить запись фокуса"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </button>
          <button
            type="button"
            className="m-focus-icon-btn"
            onClick={onOpenStats}
            aria-label="Статистика фокуса"
            title="Статистика фокуса"
          >
            <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
          </button>
          <button
            type="button"
            className="m-focus-icon-btn"
            onClick={onOpenMoreMenu}
            aria-label="Меню фокуса"
            title="Ещё"
          >
            <svg width="21" height="21" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5.5" r="1.8" />
              <circle cx="12" cy="12" r="1.8" />
              <circle cx="12" cy="18.5" r="1.8" />
            </svg>
          </button>
        </div>
      </header>

      <div className="m-focus-center">
        <button
          type="button"
          className="m-focus-entity-btn"
          onClick={onOpenTaskPicker}
        >
          <span>{selectedTask ? selectedTask.title : 'Фокус'}</span>
          <ChevronRight size={16} />
        </button>

        <div
          className="m-focus-ring-wrap"
          onClick={() => {
            if (status === 'idle' && !isStopwatch) {
              onOpenDurationPicker()
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="Изменить длительность таймера"
        >
          <svg width="268" height="268" viewBox="0 0 268 268" className="m-focus-ring-svg">
            <circle
              cx="134"
              cy="134"
              r={radius}
              fill="none"
              stroke="var(--focus-ring-track, rgba(25, 25, 25, 0.08))"
              strokeWidth="3.5"
            />
            <circle
              cx="134"
              cy="134"
              r={radius}
              fill="none"
              stroke={ringColor}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              transform="rotate(-90 134 134)"
              style={{ transition: 'stroke-dashoffset 0.25s linear' }}
            />
          </svg>
          <div className="m-focus-ring-inner">
            <div className="m-focus-time">{formatTimer(displaySec)}</div>
            {isBreak && (
              <div className="m-focus-submode">
                {mode === 'shortBreak' ? 'Короткий перерыв' : 'Длинный перерыв'}
              </div>
            )}
            {whiteNoise !== 'none' && (
              <div className="m-focus-noise-badge">♪ {WHITE_NOISE_LABELS[whiteNoise]}</div>
            )}
          </div>
        </div>

        <div className="m-focus-controls">
          {status === 'idle' ? (
            <button
              type="button"
              className="m-focus-start-btn"
              style={isBreak ? { background: '#0cce9c' } : undefined}
              onClick={onToggleStartPause}
            >
              {isBreak ? 'Начать перерыв' : 'Начать'}
            </button>
          ) : (
            <div className="m-focus-running-bar">
              <button
                type="button"
                className={whiteNoise !== 'none' ? 'm-focus-circle-btn active' : 'm-focus-circle-btn'}
                onClick={onOpenNoiseModal}
                aria-label="Белый шум"
                title="Белый шум"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
              </button>

              <button
                type="button"
                className="m-focus-start-btn running"
                onClick={onToggleStartPause}
              >
                {status === 'running' ? 'Пауза' : 'Продолжить'}
              </button>

              <button
                type="button"
                className="m-focus-circle-btn stop"
                onClick={onStopOrFinish}
                aria-label="Стоп"
                title="Завершить"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2.5" />
                </svg>
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          className="m-focus-today-summary"
          onClick={onOpenStats}
        >
          Сегодня: {todayStats.pomoCount} Помо, {todayStats.minutes}м
        </button>
      </div>
    </div>
  )
}

