import { CalendarIcon, PinIcon, TrashIcon } from '../icons'

/** Ширина трёх пилюль за коротким свайпом: 232px */
export const SWIPE_WIDTH = 232

/** Трей с 3 кнопками при свайпе задачи влево: «Изменить» (синий), «Дата» (оранжевый), «Удалить» (красный) */
export function SwipeLeftTray(props: {
  visible: boolean
  fullDelete?: boolean
  onEdit: () => void
  onDate: () => void
  onDelete: () => void
}) {
  const { visible, fullDelete, onEdit, onDate, onDelete } = props
  return (
    <div className={`swipe-actions swipe-left-tray${fullDelete ? ' full-del' : ''}`} aria-hidden={!visible}>
      {!fullDelete && (
        <>
          <button className="sw-pill sw-edit" onClick={onEdit} aria-label="Изменить" tabIndex={visible ? 0 : -1}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
              <rect x="4" y="4" width="16" height="16" rx="3.5" />
              <path d="M8 12h7M12 9l3 3-3 3" />
            </svg>
            <span>Изменить</span>
          </button>
          <button className="sw-pill sw-date" onClick={onDate} aria-label="Дата" tabIndex={visible ? 0 : -1}>
            <CalendarIcon size={15} />
            <span>Дата</span>
          </button>
        </>
      )}
      <button className="sw-pill sw-del" onClick={onDelete} aria-label="Удалить" tabIndex={visible ? 0 : -1}>
        <TrashIcon size={15} />
        <span>Удалить</span>
      </button>
    </div>
  )
}

/** Трей с 3 кнопками при свайпе задачи вправо: «Выполнено» (зеленый), «Закрепить» (оранжевый), «Пропустить» (фиолетовый) */
export function SwipeRightTray(props: {
  visible: boolean
  fullComplete?: boolean
  isPinned?: boolean
  onComplete: () => void
  onPin: () => void
  onSkip: () => void
}) {
  const { visible, fullComplete, isPinned, onComplete, onPin, onSkip } = props
  return (
    <div className={`swipe-actions swipe-right-tray${fullComplete ? ' full-done' : ''}`} aria-hidden={!visible}>
      <button className="sw-pill sw-complete" onClick={onComplete} aria-label="Выполнено" tabIndex={visible ? 0 : -1}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span>Выполнено</span>
      </button>
      {!fullComplete && (
        <>
          <button className="sw-pill sw-pin" onClick={onPin} aria-label={isPinned ? 'Открепить' : 'Закрепить'} tabIndex={visible ? 0 : -1}>
            <PinIcon size={15} />
            <span>{isPinned ? 'Открепить' : 'Закрепить'}</span>
          </button>
          <button className="sw-pill sw-skip" onClick={onSkip} aria-label="Пропустить" tabIndex={visible ? 0 : -1}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            <span>Пропустить</span>
          </button>
        </>
      )}
    </div>
  )
}

// Алиасы для обратной совместимости
export const SwipeActionsTray = SwipeLeftTray

export function SwipeCompleteTray(props: { visible: boolean; ready?: boolean }) {
  return (
    <div className={`swipe-complete${props.ready ? ' ready' : ''}`} aria-hidden={!props.visible}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
      </svg>
    </div>
  )
}

