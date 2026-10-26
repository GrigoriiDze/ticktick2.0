import { ChevronLeft, ChevronRight } from '../../../ui/icons'
import type { PickerModalConfig } from '../types'

interface Props {
  wrapClass: string
  onBack: () => void
  defaultDate: string
  setDefaultDate: (val: string) => void
  defaultPriority: string
  setDefaultPriority: (val: string) => void
  defaultReminderNone: boolean
  setDefaultReminderNone: (val: boolean) => void
  defaultReminderAllDay: boolean
  setDefaultReminderAllDay: (val: boolean) => void
  setPickerModal: (cfg: PickerModalConfig | null) => void
}

export function DefaultsSection({
  wrapClass,
  onBack,
  defaultDate,
  setDefaultDate,
  defaultPriority,
  setDefaultPriority,
  defaultReminderNone,
  setDefaultReminderNone,
  defaultReminderAllDay,
  setDefaultReminderAllDay,
  setPickerModal,
}: Props) {
  return (
    <section className={wrapClass} role="region" aria-label="Значения по умолчанию">
      <header className="m-settings-head">
        <button className="m-settings-back-btn" onClick={onBack} aria-label="Назад">
          <ChevronLeft size={24} />
        </button>
        <h2>Значения по умолчанию</h2>
      </header>

      <div className="m-set-group" style={{ marginTop: 8 }}>
        <button
          type="button"
          className="m-set-item"
          onClick={() =>
            setPickerModal({
              title: 'Дата по умолчанию',
              selected: defaultDate,
              options: [
                { key: 'none', label: 'Нет' },
                { key: 'today', label: 'Сегодня' },
                { key: 'tomorrow', label: 'Завтра' },
              ],
              onSelect: setDefaultDate,
            })
          }
        >
          <span className="m-set-item-text">Дата по умолчанию</span>
          <span className="m-set-item-val">
            {defaultDate === 'today' ? 'Сегодня' : defaultDate === 'tomorrow' ? 'Завтра' : 'Нет'}
          </span>
          <ChevronRight size={18} />
        </button>

        <button
          type="button"
          className="m-set-item"
          onClick={() =>
            setPickerModal({
              title: 'Приоритет по умолчанию',
              selected: defaultPriority,
              options: [
                { key: '0', label: 'Без приоритета' },
                { key: '1', label: 'Низкий приоритет' },
                { key: '3', label: 'Средний приоритет' },
                { key: '5', label: 'Высокий приоритет' },
              ],
              onSelect: setDefaultPriority,
            })
          }
        >
          <span className="m-set-item-text">Приоритет по умолчанию</span>
          <span className="m-set-item-val">
            {defaultPriority === '5'
              ? 'Высокий'
              : defaultPriority === '3'
                ? 'Средний'
                : defaultPriority === '1'
                  ? 'Низкий'
                  : 'Нет'}
          </span>
          <ChevronRight size={18} />
        </button>

        <div className="m-set-item" style={{ cursor: 'default' }}>
          <div className="m-tabbar-row-body">
            <div className="m-set-item-text">Напоминание для задач со временем</div>
            <div className="m-set-item-sub">Автоматически напоминать в момент срока задачи</div>
          </div>
          <button
            type="button"
            className={`m-tt-switch${!defaultReminderNone ? ' on' : ''}`}
            onClick={() => {
              setDefaultReminderNone(!defaultReminderNone)
              window.dispatchEvent(new Event('tt-reminders-changed'))
            }}
            aria-pressed={!defaultReminderNone}
          >
            <span />
          </button>
        </div>

        <div className="m-set-item" style={{ cursor: 'default' }}>
          <div className="m-tabbar-row-body">
            <div className="m-set-item-text">Напоминание для задач на весь день</div>
            <div className="m-set-item-sub">Напоминать в 09:00 в день срока задачи</div>
          </div>
          <button
            type="button"
            className={`m-tt-switch${defaultReminderAllDay ? ' on' : ''}`}
            onClick={() => {
              setDefaultReminderAllDay(!defaultReminderAllDay)
              window.dispatchEvent(new Event('tt-reminders-changed'))
            }}
            aria-pressed={defaultReminderAllDay}
          >
            <span />
          </button>
        </div>
      </div>
    </section>
  )
}
