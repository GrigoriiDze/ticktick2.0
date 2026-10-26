import { useState } from 'react'
import { ChevronLeft, ChevronRight } from '../../../ui/icons'
import {
  COMPLETION_SOUND_LABELS,
  NOTIFICATION_SOUND_LABELS,
  playCompletionSound,
  playNotificationSound,
  triggerCompletionVibration,
  type CompletionSoundId,
  type NotificationSoundId,
} from '../../../platform/audio'
import {
  refreshNotificationChannel,
  sendTestNotification,
  setStatusBarQuickAddNotification,
  syncDailySummaryNotification,
} from '../../../platform/notifications'
import type { PickerModalConfig } from '../types'
import { useAppSettings } from '../hooks/useAppSettings'

interface Props {
  wrapClass: string
  settings: ReturnType<typeof useAppSettings>
  onBack: () => void
  onOpenAdvanced: () => void
  onOpenPicker: (cfg: PickerModalConfig) => void
  showToast: (msg: string) => void
}

export function NotificationsSection({
  wrapClass,
  settings,
  onBack,
  onOpenAdvanced,
  onOpenPicker,
  showToast,
}: Props) {
  const {
    dailySummaryEnabled,
    setDailySummaryEnabled,
    dailySummaryTime,
    setDailySummaryTime,
    statusBarQuickAdd,
    setStatusBarQuickAdd,
    notificationSound,
    setNotificationSound,
    vibrateNotif,
    setVibrateNotif,
    completionSound,
    setCompletionSound,
    vibrateDone,
    setVibrateDone,
  } = settings

  const [emailNotif, setEmailNotif] = useState(false)
  const [localCalNotif, setLocalCalNotif] = useState(true)
  const [notifResult, setNotifResult] = useState<string | null>(null)

  return (
    <section className={wrapClass} role="region" aria-label="Звуки и уведомления">
      <header className="m-settings-head">
        <button className="m-settings-back-btn" onClick={onBack} aria-label="Назад">
          <ChevronLeft size={24} />
        </button>
        <h2>Звуки и уведомления</h2>
      </header>

      <div className="m-set-group" style={{ marginTop: 8 }}>
        <button
          type="button"
          className="m-set-item"
          onClick={() =>
            onOpenPicker({
              title: 'Ежедневное напоминание',
              selected: dailySummaryEnabled ? dailySummaryTime : 'off',
              options: [
                { key: 'off', label: 'Выключено' },
                { key: '08:00', label: 'Каждое утро в 08:00' },
                { key: '09:00', label: 'Каждое утро в 09:00' },
                { key: '10:00', label: 'Каждое утро в 10:00' },
                { key: '18:00', label: 'Каждый вечер в 18:00' },
                { key: '20:00', label: 'Каждый вечер в 20:00' },
              ],
              onSelect: (val) => {
                if (val === 'off') {
                  setDailySummaryEnabled(false)
                } else {
                  setDailySummaryEnabled(true)
                  setDailySummaryTime(val)
                }
                void syncDailySummaryNotification()
              },
            })
          }
        >
          <div className="m-tabbar-row-body">
            <div className="m-set-item-text">Ежедневное напоминание</div>
            <div className="m-set-item-sub">
              {dailySummaryEnabled ? `Включено (${dailySummaryTime})` : 'Получайте ежедневный обзор в установленное время'}
            </div>
          </div>
          <ChevronRight size={18} className="m-set-item-arrow" />
        </button>
      </div>

      <div className="m-set-group">
        <div className="m-set-item" style={{ cursor: 'default' }}>
          <div className="m-tabbar-row-body">
            <div className="m-set-item-text">Уведомления и панель состояния</div>
            <div className="m-set-item-sub">Быстро добавляйте задачи из строки состояния телефона</div>
          </div>
          <button
            type="button"
            className={`m-tt-switch${statusBarQuickAdd ? ' on' : ''}`}
            onClick={() => {
              const next = !statusBarQuickAdd
              setStatusBarQuickAdd(next)
              void setStatusBarQuickAddNotification(next)
            }}
            aria-pressed={statusBarQuickAdd}
          >
            <span />
          </button>
        </div>

        <button
          type="button"
          className="m-set-item"
          onClick={() =>
            onOpenPicker({
              title: 'Звук уведомления',
              selected: notificationSound,
              options: (Object.keys(NOTIFICATION_SOUND_LABELS) as NotificationSoundId[]).map((k) => ({
                key: k,
                label: NOTIFICATION_SOUND_LABELS[k],
              })),
              onSelect: (val) => {
                const s = val as NotificationSoundId
                setNotificationSound(s)
                playNotificationSound(s)
                void refreshNotificationChannel().then(() => {
                  window.dispatchEvent(new Event('tt-reminders-changed'))
                })
              },
            })
          }
        >
          <div className="m-tabbar-row-body">
            <div className="m-set-item-text">Звук уведомления</div>
            <div className="m-set-item-sub">{NOTIFICATION_SOUND_LABELS[notificationSound]}</div>
          </div>
          <ChevronRight size={18} className="m-set-item-arrow" />
        </button>

        <button
          type="button"
          className="m-set-item"
          onClick={() =>
            onOpenPicker({
              title: 'Вибрация уведомлений',
              selected: vibrateNotif ? 'on' : 'off',
              options: [
                { key: 'on', label: 'Включить' },
                { key: 'off', label: 'Выключить' },
              ],
              onSelect: (val) => {
                const on = val === 'on'
                setVibrateNotif(on)
                if (on) triggerCompletionVibration(true)
                void refreshNotificationChannel().then(() => {
                  window.dispatchEvent(new Event('tt-reminders-changed'))
                })
              },
            })
          }
        >
          <div className="m-tabbar-row-body">
            <div className="m-set-item-text">Вибрация</div>
            <div className="m-set-item-sub">{vibrateNotif ? 'Включить' : 'Выключить'}</div>
          </div>
          <ChevronRight size={18} className="m-set-item-arrow" />
        </button>

        <button type="button" className="m-set-item" onClick={onOpenAdvanced}>
          <span className="m-set-item-text">Расширенные настройки</span>
          <ChevronRight size={18} className="m-set-item-arrow" />
        </button>
      </div>

      <div className="m-set-group">
        <div className="m-set-item" style={{ cursor: 'default' }}>
          <span className="m-set-item-text">Уведомления по электронной почте</span>
          <button
            type="button"
            className={`m-tt-switch${emailNotif ? ' on' : ''}`}
            onClick={() => setEmailNotif(!emailNotif)}
            aria-pressed={emailNotif}
          >
            <span />
          </button>
        </div>
        <div className="m-set-item" style={{ cursor: 'default' }}>
          <span className="m-set-item-text">Уведомления локального календаря.</span>
          <button
            type="button"
            className={`m-tt-switch${localCalNotif ? ' on' : ''}`}
            onClick={() => setLocalCalNotif(!localCalNotif)}
            aria-pressed={localCalNotif}
          >
            <span />
          </button>
        </div>
      </div>

      <div className="m-set-group">
        <button
          type="button"
          className="m-set-item"
          onClick={() =>
            onOpenPicker({
              title: 'Звук завершения',
              selected: completionSound,
              options: (Object.keys(COMPLETION_SOUND_LABELS) as CompletionSoundId[]).map((k) => ({
                key: k,
                label: COMPLETION_SOUND_LABELS[k],
              })),
              onSelect: (val) => {
                const s = val as CompletionSoundId
                setCompletionSound(s)
                playCompletionSound(s)
              },
            })
          }
        >
          <div className="m-tabbar-row-body">
            <div className="m-set-item-text">Звук завершения</div>
            <div className="m-set-item-sub">{COMPLETION_SOUND_LABELS[completionSound]}</div>
          </div>
          <ChevronRight size={18} className="m-set-item-arrow" />
        </button>

        <div className="m-set-item" style={{ cursor: 'default' }}>
          <div className="m-tabbar-row-body">
            <div className="m-set-item-text">Вибрация</div>
            <div className="m-set-item-sub">При завершении или перетаскивании задачи происходит легкое вибрирование.</div>
          </div>
          <button
            type="button"
            className={`m-tt-switch${vibrateDone ? ' on' : ''}`}
            onClick={() => {
              const next = !vibrateDone
              setVibrateDone(next)
              if (next) triggerCompletionVibration(true)
            }}
            aria-pressed={vibrateDone}
          >
            <span />
          </button>
        </div>
      </div>

      <div className="m-set-group">
        <button
          type="button"
          className="m-set-item"
          onClick={() =>
            void sendTestNotification()
              .then((msg) => {
                setNotifResult(msg)
                showToast(msg)
              })
              .catch((e: Error) => setNotifResult(e.message))
          }
        >
          <span className="m-set-item-text">Напоминания не работают?</span>
          <span className="m-set-item-val" style={{ color: '#4772fa' }}>Проверить</span>
          <ChevronRight size={18} className="m-set-item-arrow" />
        </button>
      </div>

      {notifResult && (
        <div className="m-set-group">
          <p className="muted" style={{ padding: '12px 16px', margin: 0, fontSize: 13 }}>{notifResult}</p>
        </div>
      )}
    </section>
  )
}

