import { WHITE_NOISE_LABELS, type WhiteNoiseId } from '../../../platform/audio'

interface Props {
  open: boolean
  whiteNoise: WhiteNoiseId
  onOpenNoise: () => void
  onOpenDuration: () => void
  onOpenStats: () => void
  onOpenSettings: () => void
  onClose: () => void
}

export function PomoMoreMenuModal({
  open,
  whiteNoise,
  onOpenNoise,
  onOpenDuration,
  onOpenStats,
  onOpenSettings,
  onClose,
}: Props) {
  if (!open) return null

  return (
    <div className="tt-modal-backdrop" onClick={onClose}>
      <div className="tt-modal-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Меню Фокуса">
        <h3 className="tt-modal-title">Фокус</h3>
        <div className="tt-modal-options">
          <button
            type="button"
            className="tt-modal-opt"
            onClick={() => {
              onClose()
              onOpenNoise()
            }}
          >
            <span className="tt-modal-opt-label">♪ Белый шум ({WHITE_NOISE_LABELS[whiteNoise]})</span>
          </button>
          <button
            type="button"
            className="tt-modal-opt"
            onClick={() => {
              onClose()
              onOpenDuration()
            }}
          >
            <span className="tt-modal-opt-label">⏱ Переключить режим (Помо / Перерыв)</span>
          </button>
          <button
            type="button"
            className="tt-modal-opt"
            onClick={() => {
              onClose()
              onOpenStats()
            }}
          >
            <span className="tt-modal-opt-label">📊 Статистика по фокусу</span>
          </button>
          <button
            type="button"
            className="tt-modal-opt"
            onClick={() => {
              onClose()
              onOpenSettings()
            }}
          >
            <span className="tt-modal-opt-label">⚙ Настройки фокусировки</span>
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

