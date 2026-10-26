import { ChevronLeft, ChevronRight } from '../../../ui/icons'

interface Props {
  wrapClass: string
  onBack: () => void
  recDate: boolean
  setRecDate: (val: boolean) => void
  removeDateText: boolean
  setRemoveDateText: (val: boolean) => void
  recTags: boolean
  setRecTags: (val: boolean) => void
  removeTagText: boolean
  setRemoveTagText: (val: boolean) => void
  showToast: (msg: string) => void
}

export function SmartRecSection({
  wrapClass,
  onBack,
  recDate,
  setRecDate,
  removeDateText,
  setRemoveDateText,
  recTags,
  setRecTags,
  removeTagText,
  setRemoveTagText,
  showToast,
}: Props) {
  return (
    <section className={wrapClass} role="region" aria-label="Умное Распознавание">
      <header className="m-settings-head">
        <button className="m-settings-back-btn" onClick={onBack} aria-label="Назад">
          <ChevronLeft size={24} />
        </button>
        <h2>Умное Распознавание</h2>
      </header>

      <h3 className="m-set-group-title">Распознавание даты</h3>
      <div className="m-set-group">
        <div className="m-set-item" style={{ cursor: 'default' }}>
          <div className="m-tabbar-row-body">
            <div className="m-set-item-text">Включить распознавание даты</div>
            <div className="m-set-item-sub">
              При добавлении новой задачи с помощью панели быстрого добавления или голосового ввода информация о дате и времени автоматически анализируется как напоминание.
            </div>
          </div>
          <button
            type="button"
            className={`m-tt-switch${recDate ? ' on' : ''}`}
            onClick={() => setRecDate(!recDate)}
            aria-pressed={recDate}
          >
            <span />
          </button>
        </div>

        <div className="m-set-item" style={{ cursor: 'default' }}>
          <div className="m-tabbar-row-body">
            <div className="m-set-item-text">Удалить дату и время в имени задачи</div>
            <div className="m-set-item-sub">
              Если параметр выбран, выделенное время и дата будут удалены при добавлении задачи.
            </div>
          </div>
          <button
            type="button"
            className={`m-tt-switch${removeDateText ? ' on' : ''}`}
            onClick={() => setRemoveDateText(!removeDateText)}
            aria-pressed={removeDateText}
          >
            <span />
          </button>
        </div>

        <button
          type="button"
          className="m-set-item"
          onClick={() =>
            showToast('Примеры: «Встреча завтра в 15:00», «Оплатить счёт в пятницу #важно»')
          }
        >
          <span className="m-set-item-text">Примеры</span>
          <ChevronRight size={18} />
        </button>
      </div>

      <h3 className="m-set-group-title">Распознавание меток</h3>
      <div className="m-set-group">
        <div className="m-set-item" style={{ cursor: 'default' }}>
          <div className="m-tabbar-row-body">
            <div className="m-set-item-text">Умные метки для идентификации</div>
          </div>
          <button
            type="button"
            className={`m-tt-switch${recTags ? ' on' : ''}`}
            onClick={() => setRecTags(!recTags)}
            aria-pressed={recTags}
          >
            <span />
          </button>
        </div>

        <div className="m-set-item" style={{ cursor: 'default' }}>
          <div className="m-tabbar-row-body">
            <div className="m-set-item-text">Удалить метки в названии задачи</div>
            <div className="m-set-item-sub">
              Удалите метки из имени задачи при добавлении её через быстрое добавление.
            </div>
          </div>
          <button
            type="button"
            className={`m-tt-switch${removeTagText ? ' on' : ''}`}
            onClick={() => setRemoveTagText(!removeTagText)}
            aria-pressed={removeTagText}
          >
            <span />
          </button>
        </div>
      </div>
    </section>
  )
}
