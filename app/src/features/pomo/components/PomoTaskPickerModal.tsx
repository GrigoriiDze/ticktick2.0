import type { Task } from '../../../domain/types'

interface Props {
  open: boolean
  taskId: string | null
  openTasks: Task[]
  onSelect: (id: string | null) => void
  onClose: () => void
}

export function PomoTaskPickerModal({ open, taskId, openTasks, onSelect, onClose }: Props) {
  if (!open) return null

  return (
    <div className="tt-modal-backdrop" onClick={onClose}>
      <div className="tt-modal-sheet" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Выберите задачу">
        <h3 className="tt-modal-title">Выберите задачу для фокусировки</h3>
        <div className="tt-modal-options">
          <button
            type="button"
            className={taskId === null ? 'tt-modal-opt active' : 'tt-modal-opt'}
            onClick={() => {
              onSelect(null)
              onClose()
            }}
          >
            <span className="tt-modal-radio">{taskId === null ? '●' : '○'}</span>
            <span className="tt-modal-opt-label">Фокус (без привязки к задаче)</span>
          </button>
          {openTasks.map((t) => (
            <button
              key={t.id}
              type="button"
              className={taskId === t.id ? 'tt-modal-opt active' : 'tt-modal-opt'}
              onClick={() => {
                onSelect(t.id)
                onClose()
              }}
            >
              <span className="tt-modal-radio">{taskId === t.id ? '●' : '○'}</span>
              <span className="tt-modal-opt-label">{t.title}</span>
            </button>
          ))}
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

