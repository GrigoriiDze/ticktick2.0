import { ChevronLeft, ChevronRight } from '../../../ui/icons'
import { playPomoBell } from '../../../platform/audio'
import type { PomoSettings } from '../hooks/usePomoSettings'
import type { PomoMode, PomoStatus } from '../../../domain/pomo'

interface Props {
  settings: PomoSettings
  status: PomoStatus
  mode: PomoMode
  onUpdatePomoDuration: (sec: number) => void
  onBack: () => void
}

export function PomoSettingsScreen({
  settings,
  status,
  mode,
  onUpdatePomoDuration,
  onBack,
}: Props) {
  const {
    pomoMins,
    setPomoMins,
    shortBreakMins,
    setShortBreakMins,
    longBreakMins,
    setLongBreakMins,
    longBreakInterval,
    setLongBreakInterval,
    autoNextPomo,
    setAutoNextPomo,
    autoStartBreak,
    setAutoStartBreak,
  } = settings

  return (
    <section className="m-settings-screen" role="region" aria-label="Настройки фокусировки">
      <header className="m-settings-head">
        <button className="m-settings-back-btn" onClick={onBack} aria-label="Назад">
          <ChevronLeft size={24} />
        </button>
        <h2>Настройки фокусировки</h2>
      </header>

      <div className="m-set-group" style={{ marginTop: 8 }}>
        <button
          type="button"
          className="m-set-item"
          onClick={() => {
            const opts = [15, 20, 25, 30, 45, 60, 90]
            const next = opts[(opts.indexOf(pomoMins) + 1) % opts.length] ?? 25
            setPomoMins(next)
            if (status === 'idle' && mode === 'pomo') {
              onUpdatePomoDuration(next * 60)
            }
          }}
        >
          <span className="m-set-item-text">Длительность Помо</span>
          <span className="m-set-item-val">{pomoMins} мин</span>
          <ChevronRight size={18} className="m-set-item-arrow" />
        </button>

        <button
          type="button"
          className="m-set-item"
          onClick={() => {
            const opts = [3, 5, 10, 15]
            const next = opts[(opts.indexOf(shortBreakMins) + 1) % opts.length] ?? 5
            setShortBreakMins(next)
            if (status === 'idle' && mode === 'shortBreak') {
              onUpdatePomoDuration(next * 60)
            }
          }}
        >
          <span className="m-set-item-text">Короткий перерыв</span>
          <span className="m-set-item-val">{shortBreakMins} мин</span>
          <ChevronRight size={18} className="m-set-item-arrow" />
        </button>

        <button
          type="button"
          className="m-set-item"
          onClick={() => {
            const opts = [10, 15, 20, 30]
            const next = opts[(opts.indexOf(longBreakMins) + 1) % opts.length] ?? 15
            setLongBreakMins(next)
            if (status === 'idle' && mode === 'longBreak') {
              onUpdatePomoDuration(next * 60)
            }
          }}
        >
          <span className="m-set-item-text">Длинный перерыв</span>
          <span className="m-set-item-val">{longBreakMins} мин</span>
          <ChevronRight size={18} className="m-set-item-arrow" />
        </button>

        <button
          type="button"
          className="m-set-item"
          onClick={() => {
            const opts = [2, 3, 4, 6]
            const next = opts[(opts.indexOf(longBreakInterval) + 1) % opts.length] ?? 4
            setLongBreakInterval(next)
          }}
        >
          <span className="m-set-item-text">Интервал длинных перерывов</span>
          <span className="m-set-item-val">{longBreakInterval} Помо</span>
          <ChevronRight size={18} className="m-set-item-arrow" />
        </button>
      </div>

      <div className="m-set-group">
        <div className="m-set-item" style={{ cursor: 'default' }}>
          <span className="m-set-item-text">Автостарт следующего Помо</span>
          <button
            type="button"
            className={`m-tt-switch${autoNextPomo ? ' on' : ''}`}
            onClick={() => setAutoNextPomo(!autoNextPomo)}
          >
            <span />
          </button>
        </div>
        <div className="m-set-item" style={{ cursor: 'default' }}>
          <span className="m-set-item-text">Автостарт перерыва</span>
          <button
            type="button"
            className={`m-tt-switch${autoStartBreak ? ' on' : ''}`}
            onClick={() => setAutoStartBreak(!autoStartBreak)}
          >
            <span />
          </button>
        </div>
      </div>

      <div className="m-set-group">
        <button type="button" className="m-set-item" onClick={() => playPomoBell()}>
          <span className="m-set-item-text">Звук окончания фокусировки</span>
          <span className="m-set-item-val">Прослушать</span>
          <ChevronRight size={18} className="m-set-item-arrow" />
        </button>
      </div>
    </section>
  )
}

