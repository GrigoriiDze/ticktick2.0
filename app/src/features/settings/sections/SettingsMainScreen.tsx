import { ChevronLeft, ChevronRight } from '../../../ui/icons'
import type { UpdateInfo } from '../../../platform/updates'
import type { SettingsScreen } from '../types'

interface Props {
  wrapClass: string
  email: string | null
  onClose?: () => void
  setScreen: (screen: SettingsScreen) => void
  showToast: (msg: string) => void
  checkUpdates: () => Promise<void>
  checking: boolean
  upd: { text: string; update: UpdateInfo | null } | null
  onSignOut: () => void
}

export function SettingsMainScreen({
  wrapClass,
  email,
  onClose,
  setScreen,
  showToast,
  checkUpdates,
  checking,
  upd,
  onSignOut,
}: Props) {
  return (
    <section className={wrapClass} role="region" aria-label="Настройки">
      <header className="m-settings-head">
        {onClose && (
          <button className="m-settings-back-btn" onClick={onClose} aria-label="Назад">
            <ChevronLeft size={24} />
          </button>
        )}
        <h2>Настройки</h2>
      </header>

      {/* Карточка профиля пользователя */}
      <div className="m-set-profile-card" onClick={() => setScreen('profile')}>
        <div className="m-set-avatar-wrap">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </div>
        <div className="m-set-profile-info">
          <h3 className="m-set-profile-name">{email ? email : 'Войти или Зарегистрироваться'}</h3>
          <p className="m-set-profile-sub">{email ? 'Статистика и достижения' : 'Синхронизация между устройствами'}</p>
        </div>
        <ChevronRight size={18} />
      </div>

      {/* Секция 1: Панель вкладок */}
      <div className="m-set-group">
        <button className="m-set-item" onClick={() => setScreen('tabbar')}>
          <span className="m-set-item-icon" style={{ color: '#4772fa' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="3" />
              <line x1="8" y1="19" x2="8" y2="14" />
              <line x1="16" y1="19" x2="16" y2="14" />
              <line x1="3" y1="14" x2="21" y2="14" />
            </svg>
          </span>
          <span className="m-set-item-text">Панель вкладок</span>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Секция 2: Внешний вид, Звуки, Дата, Виджеты, ИИ, Общие */}
      <div className="m-set-group">
        <button className="m-set-item" onClick={() => setScreen('theme')}>
          <span className="m-set-item-icon" style={{ color: '#2faa6b' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="13.5" cy="6.5" r="1.5" fill="currentColor" />
              <circle cx="17.5" cy="10.5" r="1.5" fill="currentColor" />
              <circle cx="8.5" cy="7.5" r="1.5" fill="currentColor" />
              <circle cx="6.5" cy="12.5" r="1.5" fill="currentColor" />
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.6 0-.4-.2-.8-.5-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.6 1.6-1.6H16c3.3 0 6-2.7 6-6 0-5.5-4.5-10-10-10z" />
            </svg>
          </span>
          <span className="m-set-item-text">Внешний вид</span>
          <ChevronRight size={18} />
        </button>

        <button className="m-set-item" onClick={() => setScreen('notifications')}>
          <span className="m-set-item-icon" style={{ color: '#f59e0b' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </span>
          <span className="m-set-item-text">Звуки и уведомления</span>
          <ChevronRight size={18} />
        </button>

        <button className="m-set-item" onClick={() => setScreen('datetime')}>
          <span className="m-set-item-icon" style={{ color: '#4772fa' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <polyline points="12 7 12 12 15.5 14" />
            </svg>
          </span>
          <span className="m-set-item-text">Дата и время</span>
          <ChevronRight size={18} />
        </button>

        <button className="m-set-item" onClick={() => setScreen('widgets')}>
          <span className="m-set-item-icon" style={{ color: '#8a63e6' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1.8" />
              <rect x="14" y="3" width="7" height="7" rx="1.8" />
              <rect x="14" y="14" width="7" height="7" rx="1.8" />
              <rect x="3" y="14" width="7" height="7" rx="1.8" />
            </svg>
          </span>
          <span className="m-set-item-text">Виджеты</span>
          <ChevronRight size={18} />
        </button>

        <button className="m-set-item" onClick={() => setScreen('ai')}>
          <span className="m-set-item-icon" style={{ color: '#6366f1' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M11 3c.5 4.2 2.8 6.5 7 7-4.2.5-6.5 2.8-7 7-.5-4.2-2.8-6.5-7-7 4.2-.5 6.5-2.8 7-7z" />
              <path d="M18.5 14.5c.2 1.6 1.1 2.5 2.7 2.7-1.6.2-2.5 1.1-2.7 2.7-.2-1.6-1.1-2.5-2.7-2.7 1.6-.2 2.5-1.1 2.7-2.7z" />
            </svg>
          </span>
          <span className="m-set-item-text">Функции ИИ</span>
          <ChevronRight size={18} />
        </button>

        <button className="m-set-item" onClick={() => setScreen('general')}>
          <span className="m-set-item-icon" style={{ color: '#2bb0b0' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="18" x2="20" y2="18" />
              <circle cx="9" cy="6" r="2" fill="var(--card)" />
              <circle cx="15" cy="12" r="2" fill="var(--card)" />
              <circle cx="10" cy="18" r="2" fill="var(--card)" />
            </svg>
          </span>
          <span className="m-set-item-text">Общие</span>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Секция 3: Интеграции и импорт */}
      <div className="m-set-group">
        <button className="m-set-item" onClick={() => setScreen('import')}>
          <span className="m-set-item-icon" style={{ color: '#f59e0b' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </span>
          <span className="m-set-item-text">Интеграции и импорт</span>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Секция 4: Рекомендовано друзьям, Помощь */}
      <div className="m-set-group">
        <button
          className="m-set-item"
          onClick={() => {
            if (navigator.share) {
              void navigator.share({ title: 'TickTick 2.0', text: 'Попробуй быстрый менеджер задач TickTick 2.0!', url: window.location.origin })
            } else {
              showToast('Ссылка на приложение скопирована в буфер обмена')
            }
          }}
        >
          <span className="m-set-item-icon" style={{ color: '#ec4899' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
            </svg>
          </span>
          <span className="m-set-item-text">Рекомендовано друзьям</span>
          <ChevronRight size={18} />
        </button>

        <button className="m-set-item" onClick={() => showToast('TickTick 2.0 — версия 2.0. Все функции активны.')}>
          <span className="m-set-item-icon" style={{ color: '#64748b' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9.5" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </span>
          <span className="m-set-item-text">Помощь и обратная связь</span>
          <ChevronRight size={18} />
        </button>
      </div>

      {/* Секция 5: Обновление и Выход */}
      <div className="m-set-group">
        <button className="m-set-item" onClick={() => void checkUpdates()} disabled={checking}>
          <span className="m-set-item-icon" style={{ color: '#4772fa' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
          </span>
          <span className="m-set-item-text">Проверить обновления</span>
          <span className="m-set-item-val">{checking ? 'Проверка...' : 'v2.0'}</span>
          <ChevronRight size={18} />
        </button>
        {upd && (
          <div style={{ padding: '8px 16px', fontSize: 13, color: 'var(--muted)' }}>
            {upd.text}
            {upd.update && (
              <button
                className="primary"
                style={{ marginTop: 8, width: '100%' }}
                onClick={() => window.open(upd.update!.apk, '_system')}
              >
                Скачать обновление
              </button>
            )}
          </div>
        )}

        <button className="m-set-item" onClick={onSignOut}>
          <span className="m-set-item-icon" style={{ color: '#ef4444' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </span>
          <span className="m-set-item-text" style={{ color: '#ef4444' }}>Выйти</span>
        </button>
      </div>
    </section>
  )
}
