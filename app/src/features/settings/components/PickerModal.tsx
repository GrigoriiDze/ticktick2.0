import type { PickerModalConfig } from '../types'

interface Props {
  modal: PickerModalConfig | null
  toastMsg: string | null
  onClose: () => void
}

export function PickerModal({ modal, toastMsg, onClose }: Props) {
  return (
    <>
      {modal && (
        <div className="tt-modal-backdrop" onClick={onClose}>
          <div className="tt-modal-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={modal.title}>
            <h3 className="tt-modal-title">{modal.title}</h3>
            <div className="tt-modal-options">
              {modal.options.map((opt) => {
                const active = modal.selected === opt.key
                return (
                  <button
                    key={opt.key}
                    type="button"
                    className={active ? 'tt-modal-opt active' : 'tt-modal-opt'}
                    onClick={() => {
                      modal.onSelect(opt.key)
                      window.setTimeout(onClose, 150)
                    }}
                  >
                    <span className="tt-modal-radio">{active ? '●' : '○'}</span>
                    <span className="tt-modal-opt-label">{opt.label}</span>
                  </button>
                )
              })}
            </div>
            <div className="tt-modal-footer">
              <button type="button" className="tt-modal-cancel" onClick={onClose}>
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
      {toastMsg && <div className="tt-settings-toast">{toastMsg}</div>}
    </>
  )
}

