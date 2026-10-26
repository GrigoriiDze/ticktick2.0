import type { FocusSession } from '../../../domain/pomo'
import { ChevronLeft } from '../../../ui/icons'

interface Props {
  todayStats: { pomoCount: number; minutes: number }
  totalPomoCount: number
  totalMins: number
  sessions: FocusSession[]
  onBack: () => void
  onOpenAddRecord: () => void
}

export function PomoStatsScreen({
  todayStats,
  totalPomoCount,
  totalMins,
  sessions,
  onBack,
  onOpenAddRecord,
}: Props) {
  return (
    <section className="m-settings-screen" role="region" aria-label="Статистика по фокусу">
      <header className="m-settings-head">
        <button className="m-settings-back-btn" onClick={onBack} aria-label="Назад">
          <ChevronLeft size={24} />
        </button>
        <h2>Статистика по фокусу</h2>
      </header>

      <div className="m-focus-stats-grid">
        <div className="m-focus-stat-card">
          <span className="m-focus-stat-label">Сегодняшние Помо</span>
          <strong className="m-focus-stat-val">{todayStats.pomoCount}</strong>
        </div>
        <div className="m-focus-stat-card">
          <span className="m-focus-stat-label">Фокус сегодня</span>
          <strong className="m-focus-stat-val">
            {Math.floor(todayStats.minutes / 60) > 0 ? `${Math.floor(todayStats.minutes / 60)}ч ` : ''}
            {todayStats.minutes % 60}м
          </strong>
        </div>
        <div className="m-focus-stat-card">
          <span className="m-focus-stat-label">Всего Помо</span>
          <strong className="m-focus-stat-val">{totalPomoCount}</strong>
        </div>
        <div className="m-focus-stat-card">
          <span className="m-focus-stat-label">Общая длительность</span>
          <strong className="m-focus-stat-val">
            {Math.floor(totalMins / 60)}ч {totalMins % 60}м
          </strong>
        </div>
      </div>

      <div className="m-set-group" style={{ padding: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <strong style={{ fontSize: 16 }}>Записи фокусировки</strong>
          <button
            type="button"
            className="ghost"
            style={{ color: '#4772fa', fontSize: 14, fontWeight: 600 }}
            onClick={onOpenAddRecord}
          >
            + Добавить
          </button>
        </div>
        {sessions.length === 0 ? (
          <p className="muted" style={{ textAlign: 'center', padding: '20px 0', margin: 0 }}>
            Пока нет завершённых сессий фокусировки
          </p>
        ) : (
          <ul className="pomo-log" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
            {[...sessions].reverse().slice(0, 30).map((s) => (
              <li
                key={s.id}
                className="pomo-log-row"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 0',
                  borderBottom: '1px solid rgba(128,128,128,0.1)',
                }}
              >
                <span
                  className="pomo-log-dot"
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: s.mode === 'stopwatch' ? '#0cce9c' : '#4772fa',
                  }}
                />
                <span className="pomo-log-title" style={{ flex: 1, fontWeight: 500 }}>
                  {s.taskTitle || 'Фокус'}
                </span>
                <span className="pomo-log-mins" style={{ color: '#4772fa', fontWeight: 600, marginRight: 10 }}>
                  +{Math.max(1, Math.round(s.durationSec / 60))} мин
                </span>
                <span className="pomo-log-time" style={{ fontSize: 12, color: 'var(--muted)' }}>
                  {new Date(s.completedAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

