import { useState } from 'react'
import { ChevronLeft } from '../../../ui/icons'
import { StorageService } from '../../../platform/storage'

interface Props {
  wrapClass: string
  onBack: () => void
}

export function NotificationsAdvancedSection({ wrapClass, onBack }: Props) {
  const [reminderPopup, setReminderPopup] = useState<boolean>(() =>
    StorageService.getBool('tt_reminder_popup', true),
  )
  const [priorityRingtone, setPriorityRingtone] = useState<boolean>(() =>
    StorageService.getBool('tt_priority_ringtone', false),
  )
  const [constantReminder, setConstantReminder] = useState<boolean>(() =>
    StorageService.getBool('tt_constant_reminder', false),
  )
  const [ignoreDoze, setIgnoreDoze] = useState<boolean>(() =>
    StorageService.getBool('tt_ignore_doze', true),
  )
  const [overrideDnd, setOverrideDnd] = useState<boolean>(() =>
    StorageService.getBool('tt_override_dnd', false),
  )

  return (
    <section className={wrapClass} role="region" aria-label="Расширенные настройки">
      <header className="m-settings-head">
        <button className="m-settings-back-btn" onClick={onBack} aria-label="Назад">
          <ChevronLeft size={24} />
        </button>
        <h2>Расширенные настройки</h2>
      </header>

      <div className="m-set-group" style={{ marginTop: 8 }}>
        <div className="m-set-item" style={{ cursor: 'default' }}>
          <div className="m-tabbar-row-body">
            <div className="m-set-item-text">Всплывающее окно напоминаний</div>
            <div className="m-set-item-sub">Показывать карточку напоминания поверх экрана</div>
          </div>
          <button
            type="button"
            className={`m-tt-switch${reminderPopup ? ' on' : ''}`}
            onClick={() => {
              const next = !reminderPopup
              setReminderPopup(next)
              StorageService.set('tt_reminder_popup', next ? '1' : '0')
            }}
            aria-pressed={reminderPopup}
          >
            <span />
          </button>
        </div>

        <div className="m-set-item" style={{ cursor: 'default' }}>
          <div className="m-tabbar-row-body">
            <div className="m-set-item-text">Рингтон по приоритету</div>
            <div className="m-set-item-sub">Усиленный сигнал для задач с высоким приоритетом</div>
          </div>
          <button
            type="button"
            className={`m-tt-switch${priorityRingtone ? ' on' : ''}`}
            onClick={() => {
              const next = !priorityRingtone
              setPriorityRingtone(next)
              StorageService.set('tt_priority_ringtone', next ? '1' : '0')
            }}
            aria-pressed={priorityRingtone}
          >
            <span />
          </button>
        </div>

        <div className="m-set-item" style={{ cursor: 'default' }}>
          <div className="m-tabbar-row-body">
            <div className="m-set-item-text">Постоянное напоминание</div>
            <div className="m-set-item-sub">Уведомление остаётся активным до выполнения задачи</div>
          </div>
          <button
            type="button"
            className={`m-tt-switch${constantReminder ? ' on' : ''}`}
            onClick={() => {
              const next = !constantReminder
              setConstantReminder(next)
              StorageService.set('tt_constant_reminder', next ? '1' : '0')
            }}
            aria-pressed={constantReminder}
          >
            <span />
          </button>
        </div>

        <div className="m-set-item" style={{ cursor: 'default' }}>
          <div className="m-tabbar-row-body">
            <div className="m-set-item-text">Режим оповещения (Doze Mode)</div>
            <div className="m-set-item-sub">Точные будильники даже в спящем режиме энергосбережения</div>
          </div>
          <button
            type="button"
            className={`m-tt-switch${ignoreDoze ? ' on' : ''}`}
            onClick={() => {
              const next = !ignoreDoze
              setIgnoreDoze(next)
              StorageService.set('tt_ignore_doze', next ? '1' : '0')
            }}
            aria-pressed={ignoreDoze}
          >
            <span />
          </button>
        </div>

        <div className="m-set-item" style={{ cursor: 'default' }}>
          <div className="m-tabbar-row-body">
            <div className="m-set-item-text">Переопределить «Не беспокоить»</div>
            <div className="m-set-item-sub">Проигрывать звук важных напоминаний в режиме DND</div>
          </div>
          <button
            type="button"
            className={`m-tt-switch${overrideDnd ? ' on' : ''}`}
            onClick={() => {
              const next = !overrideDnd
              setOverrideDnd(next)
              StorageService.set('tt_override_dnd', next ? '1' : '0')
            }}
            aria-pressed={overrideDnd}
          >
            <span />
          </button>
        </div>
      </div>
    </section>
  )
}

