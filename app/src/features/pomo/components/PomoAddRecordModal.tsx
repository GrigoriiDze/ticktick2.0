import { useState } from 'react'

interface Props {
  open: boolean
  onAdd: (minutes: number) => void
  onClose: () => void
}

export function PomoAddRecordModal({ open, onAdd, onClose }: Props) {
  const [manualMins, setManualMins] = useState(25)

  if (!open) return null

  return (
    <div className="tt-modal-backdrop" onClick={onClose}>
      <div className="tt-modal-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Добавить запись">
        <h3 className="tt-modal-title">Добавить запись фокуса</h3>
        <div style={{ padding: '8px 20px 16px' }}>
          <label style={{ display: 'block', fontSize: 13, color: 'var(--muted)', marginBottom: 6 }}>
            Длительность (минут)
          </label>
          <input
            type="number"
            min={1}
            max={300}
            value={manualMins}
            onChange={(e) => setManualMins(Number(e.target.value) || 25)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: 10,
              border: '1px solid var(--line)',
              fontSize: 16,
              background: 'var(--bg)',
              color: 'var(--text)',
            }}
          />
        </div>
        <div className="tt-modal-footer" style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="tt-modal-cancel" onClick={onClose}>
            Отмена
          </button>
          <button
            type="button"
            className="primary"
            style={{ flex: 1, borderRadius: 10, padding: '10px 16px' }}
            onClick={() => {
              onAdd(manualMins)
              onClose()
            }}
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  )
}

