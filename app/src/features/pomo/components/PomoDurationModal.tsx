import type { PomoMode } from '../../../domain/pomo'

interface Props {
  open: boolean
  mode: PomoMode
  durationSec: number
  shortBreakMins: number
  longBreakMins: number
  onSelectPomo: (mins: number) => void
  onSelectBreak: (mode: 'shortBreak' | 'longBreak', mins: number) => void
  onClose: () => void
}

export function PomoDurationModal({
  open,
  mode,
  durationSec,
  shortBreakMins,
  longBreakMins,
  onSelectPomo,
  onSelectBreak,
  onClose,
}: Props) {
  if (!open) return null

  return (
    <div className="tt-modal-backdrop" onClick={onClose}>
      <div className="tt-modal-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Длительность Помо">
        <h3 className="tt-modal-title">Длительность и режим</h3>
        <div className="tt-modal-options">
          {[15, 20, 25, 30, 45, 60, 90].map((m) => {
            const active = mode === 'pomo' && Math.round(durationSec / 60) === m
            return (
              <button
                key={m}
                type="button"
                className={active ? 'tt-modal-opt active' : 'tt-modal-opt'}
                onClick={() => {
                  onSelectPomo(m)
                  onClose()
                }}
              >
                <span className="tt-modal-radio">{active ? '●' : '○'}</span>
                <span className="tt-modal-opt-label">Помодоро — {m} минут</span>
              </button>
            )
          })}
          <button
            type="button"
            className={mode === 'shortBreak' ? 'tt-modal-opt active' : 'tt-modal-opt'}
            onClick={() => {
              onSelectBreak('shortBreak', shortBreakMins)
              onClose()
            }}
          >
            <span className="tt-modal-radio">{mode === 'shortBreak' ? '●' : '○'}</span>
            <span className="tt-modal-opt-label">Короткий перерыв ({shortBreakMins} мин)</span>
          </button>
          <button
            type="button"
            className={mode === 'longBreak' ? 'tt-modal-opt active' : 'tt-modal-opt'}
            onClick={() => {
              onSelectBreak('longBreak', longBreakMins)
              onClose()
            }}
          >
            <span className="tt-modal-radio">{mode === 'longBreak' ? '●' : '○'}</span>
            <span className="tt-modal-opt-label">Длинный перерыв ({longBreakMins} мин)</span>
          </button>
        </div>
        <div className="tt-modal-footer">
          <button type="button" className="tt-modal-cancel" onClick={onClose}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  )
}

