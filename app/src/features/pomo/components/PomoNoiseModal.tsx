import { WHITE_NOISE_LABELS, type WhiteNoiseId } from '../../../platform/audio'

interface Props {
  open: boolean
  whiteNoise: WhiteNoiseId
  onSelect: (id: WhiteNoiseId) => void
  onClose: () => void
}

export function PomoNoiseModal({ open, whiteNoise, onSelect, onClose }: Props) {
  if (!open) return null

  return (
    <div className="tt-modal-backdrop" onClick={onClose}>
      <div className="tt-modal-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Белый шум">
        <h3 className="tt-modal-title">Белый шум</h3>
        <div className="tt-modal-options">
          {(Object.keys(WHITE_NOISE_LABELS) as WhiteNoiseId[]).map((id) => {
            const active = whiteNoise === id
            return (
              <button
                key={id}
                type="button"
                className={active ? 'tt-modal-opt active' : 'tt-modal-opt'}
                onClick={() => {
                  onSelect(id)
                  onClose()
                }}
              >
                <span className="tt-modal-radio">{active ? '●' : '○'}</span>
                <span className="tt-modal-opt-label">{WHITE_NOISE_LABELS[id]}</span>
              </button>
            )
          })}
        </div>
        <div className="tt-modal-footer">
          <button type="button" className="tt-modal-cancel" onClick={onClose}>
            Готово
          </button>
        </div>
      </div>
    </div>
  )
}

