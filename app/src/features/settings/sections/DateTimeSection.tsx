import { useState } from 'react'
import { ChevronLeft, ChevronRight } from '../../../ui/icons'
import { StorageService } from '../../../platform/storage'
import type { PickerModalConfig } from '../types'

interface Props {
  wrapClass: string
  onBack: () => void
  onOpenPicker: (cfg: PickerModalConfig) => void
}

export function DateTimeSection({ wrapClass, onBack, onOpenPicker }: Props) {
  const [timeFormat, setTimeFormat] = useState<'24' | '12'>(() =>
    StorageService.get<'24' | '12'>('time-format', '24'),
  )
  const [firstDay, setFirstDay] = useState<'mon' | 'sun' | 'sat'>(() =>
    StorageService.get<'mon' | 'sun' | 'sat'>('first-day', 'mon'),
  )
  const [countdownMode, setCountdownMode] = useState<boolean>(() =>
    StorageService.getBool('countdown-mode', false),
  )
  const [showWeekNumbers, setShowWeekNumbers] = useState<boolean>(() =>
    StorageService.getBool('tt_show_week_num', false),
  )
  const [userTz, setUserTz] = useState<string>(() =>
    StorageService.get<string>('tt_tz_name', Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Yekaterinburg'),
  )

  return (
    <section className={wrapClass} role="region" aria-label="Дата и время">
      <header className="m-settings-head">
        <button className="m-settings-back-btn" onClick={onBack} aria-label="Назад">
          <ChevronLeft size={24} />
        </button>
        <h2>Дата и время</h2>
      </header>

      <div className="m-set-group" style={{ marginTop: 8 }}>
        <button
          type="button"
          className="m-set-item"
          onClick={() =>
            onOpenPicker({
              title: 'Формат времени',
              selected: timeFormat,
              options: [
                { key: '24', label: '24-часовой (14:00)' },
                { key: '12', label: '12-часовой (2:00 PM)' },
              ],
              onSelect: (val) => {
                const next = val as '24' | '12'
                setTimeFormat(next)
                StorageService.set('time-format', next)
              },
            })
          }
        >
          <span className="m-set-item-text">Формат времени</span>
          <span className="m-set-item-val">{timeFormat === '24' ? '24-часовой' : '12-часовой'}</span>
          <ChevronRight size={18} className="m-set-item-arrow" />
        </button>

        <button
          type="button"
          className="m-set-item"
          onClick={() =>
            onOpenPicker({
              title: 'Первый день недели',
              selected: firstDay,
              options: [
                { key: 'mon', label: 'Понедельник' },
                { key: 'sun', label: 'Воскресенье' },
                { key: 'sat', label: 'Суббота' },
              ],
              onSelect: (val) => {
                const next = val as 'mon' | 'sun' | 'sat'
                setFirstDay(next)
                StorageService.set('first-day', next)
              },
            })
          }
        >
          <span className="m-set-item-text">Первый день недели</span>
          <span className="m-set-item-val">
            {firstDay === 'sun' ? 'Воскресенье' : firstDay === 'sat' ? 'Суббота' : 'Понедельник'}
          </span>
          <ChevronRight size={18} className="m-set-item-arrow" />
        </button>

        <div className="m-set-item" style={{ cursor: 'default' }}>
          <span className="m-set-item-text">Номер недели</span>
          <button
            type="button"
            className={`m-tt-switch${showWeekNumbers ? ' on' : ''}`}
            onClick={() => {
              const next = !showWeekNumbers
              setShowWeekNumbers(next)
              StorageService.set('tt_show_week_num', next ? '1' : '0')
            }}
            aria-pressed={showWeekNumbers}
          >
            <span />
          </button>
        </div>
      </div>

      <div className="m-set-group">
        <div className="m-set-item" style={{ cursor: 'default' }}>
          <span className="m-set-item-text">Режим обратного отсчета</span>
          <button
            type="button"
            className={`m-tt-switch${countdownMode ? ' on' : ''}`}
            onClick={() => {
              const next = !countdownMode
              setCountdownMode(next)
              StorageService.set('countdown-mode', next ? '1' : '0')
            }}
            aria-pressed={countdownMode}
          >
            <span />
          </button>
        </div>

        <button
          type="button"
          className="m-set-item"
          onClick={() =>
            onOpenPicker({
              title: 'Часовой пояс',
              selected: userTz,
              options: [
                { key: 'Europe/Moscow', label: 'Москва (GMT+3)' },
                { key: 'Asia/Yekaterinburg', label: 'Екатеринбург (GMT+5)' },
                { key: 'Asia/Novosibirsk', label: 'Новосибирск (GMT+7)' },
                { key: 'Asia/Almaty', label: 'Алматы (GMT+5)' },
                { key: 'Europe/Minsk', label: 'Минск (GMT+3)' },
                { key: 'UTC', label: 'UTC (GMT+0)' },
              ],
              onSelect: (val) => {
                setUserTz(val)
                StorageService.set('tt_tz_name', val)
              },
            })
          }
        >
          <span className="m-set-item-text">Часовой пояс</span>
          <span className="m-set-item-val">{userTz}</span>
          <ChevronRight size={18} className="m-set-item-arrow" />
        </button>
      </div>
    </section>
  )
}

