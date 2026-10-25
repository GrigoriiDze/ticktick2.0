interface Props {
  leaving?: boolean
  trashCount: number
  onOpenTrash: () => void
  onOpenDone: () => void
  onOpenSearch: () => void
  onOpenAssistant: () => void
  onOpenMatrix: () => void
  onOpenPomo?: () => void
  onOpenCountdown: () => void
  onOpenSettings: () => void
  onClose: () => void
}

/** Вкладка «Ещё»: редко нужные разделы. Настройки (тема, цвет, уведомления, выход) вынесены на свой экран */
export function MoreSheet({ trashCount, onOpenTrash, onOpenDone, onOpenSearch, onOpenAssistant, onOpenMatrix, onOpenPomo, onOpenCountdown, onOpenSettings, onClose, leaving }: Props) {
  return (
    <>
      <div className={leaving ? 'scrim on leaving' : 'scrim on'} onClick={onClose} />
      <section className={leaving ? 'sheet more-sheet leaving' : 'sheet more-sheet'} role="dialog" aria-label="Ещё">
        <button className="more-item" onClick={onOpenSearch}>
          Поиск
        </button>
        <button className="more-item" onClick={onOpenAssistant}>
          Помощник
        </button>
        <button className="more-item" onClick={onOpenDone}>
          Выполнено
        </button>
        <button className="more-item" onClick={onOpenMatrix}>
          Матрица Эйзенхауэра
        </button>
        {onOpenPomo && (
          <button className="more-item" onClick={onOpenPomo}>
            Фокус (Помодоро)
          </button>
        )}
        <button className="more-item" onClick={onOpenCountdown}>
          Обратный отсчёт
        </button>
        {trashCount > 0 && (
          <button className="more-item" onClick={onOpenTrash}>
            Корзина <span className="muted">{trashCount}</span>
          </button>
        )}
        <button className="more-item" onClick={onOpenSettings}>
          Настройки
        </button>
      </section>
    </>
  )
}
