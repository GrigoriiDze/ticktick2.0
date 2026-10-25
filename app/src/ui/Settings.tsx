import { useState } from 'react'
import { describeBundle, parseBundle, type ImportBundle } from '../import/bundle'
import type { WriteResult } from '../import/write'
import { sendTestNotification } from '../platform/notifications'
import {
  MENU_LIST_CHOICES,
  getAccent,
  getTaskMode,
  getTheme,
  setAccent,
  setTaskMode,
  setTheme,
  type Accent,
  type MenuListId,
  type TaskViewMode,
  type ThemeMode,
} from '../platform/theme'
import { checkForUpdate, type UpdateInfo } from '../platform/updates'
import { ChevronLeft, ChevronRight } from './icons'
import {
  ALL_TAB_INFOS,
  getActiveTabs,
  setActiveTabs,
  TabIcon,
  type Tab,
} from './TabBar'

export interface Props {
  leaving?: boolean
  email: string | null
  onTaskMode: (mode: TaskViewMode) => void
  menuLists: MenuListId[]
  onMenuLists: (ids: MenuListId[]) => void
  onSignOut: () => void
  onImport: (bundle: ImportBundle, onProgress: (done: number, total: number) => void) => Promise<WriteResult>
  onClose: () => void
}

export function useImportAndUpdates(onImport: Props['onImport']) {
  const [bundle, setBundle] = useState<ImportBundle | null>(null)
  const [imp, setImp] = useState<string | null>(null)
  const [impBusy, setImpBusy] = useState(false)

  async function pickFile(file: File | undefined) {
    setBundle(null)
    if (!file) return
    try {
      const b = parseBundle(await file.text())
      setBundle(b)
      setImp(`В файле: ${describeBundle(b)}`)
    } catch (e) {
      setImp((e as Error).message)
    }
  }

  async function runBundle() {
    if (!bundle) return
    setImpBusy(true)
    setImp('Записываю, это может занять минуту. Не закрывайте приложение')
    try {
      const r = await onImport(bundle, (done, total) => setImp(`Записано ${done} из ${total}`))
      setImp(`Готово. Добавлено задач ${r.tasks.added}, списков ${r.projects.added}, привычек ${r.habits.added}.`)
      setBundle(null)
    } catch (e) {
      setImp((e as Error).message || 'Не удалось записать')
    } finally {
      setImpBusy(false)
    }
  }

  const [upd, setUpd] = useState<{ text: string; update: UpdateInfo | null } | null>(null)
  const [checking, setChecking] = useState(false)

  async function check() {
    setChecking(true)
    try {
      const r = await checkForUpdate()
      setUpd({
        text: r.update
          ? `Вышла версия ${r.update.versionName}: ${r.update.notes || 'Обновление готово'}`
          : `Установлена последняя версия ${r.current.versionName}`,
        update: r.update,
      })
    } catch (e) {
      setUpd({ text: (e as Error).message || 'Не удалось проверить обновления', update: null })
    } finally {
      setChecking(false)
    }
  }

  return { bundle, imp, impBusy, pickFile, runBundle, upd, checking, check }
}

type SettingsScreen = 'main' | 'theme' | 'datetime' | 'tabbar' | 'notifications' | 'import' | 'general'

interface ThemeItem {
  id: string
  title: string
  accent: Accent
  mode: ThemeMode
  color: string
}

const CLASSIC_THEMES: ThemeItem[] = [
  { id: 'blue', title: 'Голубая', accent: 'blue', mode: 'light', color: '#4772fa' },
  { id: 'pink', title: 'Розовая', accent: 'pink', mode: 'light', color: '#ec4899' },
  { id: 'green', title: 'Зеленая', accent: 'green', mode: 'light', color: '#2faa6b' },
  { id: 'yellow', title: 'Желтая', accent: 'yellow', mode: 'light', color: '#f59e0b' },
  { id: 'slate', title: 'Черная', accent: 'slate', mode: 'dark', color: '#1e293b' },
  { id: 'standard', title: 'Стандартная', accent: 'blue', mode: 'light', color: '#2563eb' },
  { id: 'gray', title: 'Серая', accent: 'gray', mode: 'light', color: '#64748b' },
  { id: 'white', title: 'Белая', accent: 'blue', mode: 'light', color: '#ffffff' },
  { id: 'dark', title: 'Темный', accent: 'blue', mode: 'dark', color: '#18181b' },
  { id: 'amoled', title: 'Истинный черный', accent: 'slate', mode: 'dark', color: '#000000' },
  { id: 'purple', title: 'Фиолетовая', accent: 'purple', mode: 'light', color: '#8a63e6' },
  { id: 'red', title: 'Красная', accent: 'red', mode: 'light', color: '#e5484d' },
]

export function Settings(props: Props) {
  const { email, onTaskMode, menuLists, onMenuLists, onSignOut, onImport, onClose, leaving } = props
  const [screen, setScreen] = useState<SettingsScreen>('main')

  // Theme state
  const [curTheme, setCurTheme] = useState<ThemeMode>(getTheme)
  const [curAccent, setCurAccent] = useState<Accent>(getAccent)

  // Date & Time state
  const [timeFormat, setTimeFormat] = useState<'24' | '12'>(() => {
    try {
      return (localStorage.getItem('time-format') as '24' | '12') || '24'
    } catch {
      return '24'
    }
  })
  const [firstDay, setFirstDay] = useState<'mon' | 'sun'>(() => {
    try {
      return (localStorage.getItem('first-day') as 'mon' | 'sun') || 'mon'
    } catch {
      return 'mon'
    }
  })
  const [countdownMode, setCountdownMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('countdown-mode') === '1'
    } catch {
      return false
    }
  })

  // Tabs state
  const [activeTabs, setActiveTabsState] = useState<Tab[]>(getActiveTabs)

  // Import and updates hook
  const { bundle, imp, impBusy, pickFile, runBundle, upd, checking, check: checkUpdates } = useImportAndUpdates(onImport)
  const [notifResult, setNotifResult] = useState<string | null>(null)
  const [taskMode, setTaskModeState] = useState<TaskViewMode>(getTaskMode)

  function pickTheme(t: ThemeItem) {
    setAccent(t.accent)
    setTheme(t.mode)
    setCurAccent(t.accent)
    setCurTheme(t.mode)
  }

  function removeTab(tabId: Tab) {
    if (activeTabs.length <= 2) return
    const next = activeTabs.filter((t) => t !== tabId)
    setActiveTabsState(next)
    setActiveTabs(next)
  }

  function addTab(tabId: Tab) {
    if (activeTabs.length >= 5) return
    const next = [...activeTabs, tabId]
    setActiveTabsState(next)
    setActiveTabs(next)
  }

  const inactiveTabs = ALL_TAB_INFOS.filter((t) => !activeTabs.includes(t.id))
  const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Европа/Москва'

  // Sub-screens
  if (screen === 'theme') {
    return (
      <section className={leaving ? 'page m-theme-screen leaving' : 'page m-theme-screen'} role="region" aria-label="Тема">
        <header className="m-settings-head">
          <button className="m-settings-back-btn" onClick={() => setScreen('main')} aria-label="Назад">
            <ChevronLeft size={22} />
          </button>
          <h2>Внешний вид</h2>
        </header>

        <div className="m-theme-tabs">
          <button className="m-theme-tab active">Тема</button>
          <button className="m-theme-tab">Иконки приложений</button>
        </div>

        <h3 className="m-theme-section-title">Классические</h3>

        <div className="m-theme-grid">
          {CLASSIC_THEMES.map((t) => {
            const isSel = (t.mode === 'dark' ? curTheme === 'dark' : curTheme !== 'dark') && curAccent === t.accent
            return (
              <button
                key={t.id}
                className={`m-theme-card${isSel ? ' active' : ''}${t.mode === 'dark' ? ' dark' : ''}`}
                onClick={() => pickTheme(t)}
              >
                <div className="m-theme-preview">
                  <div className="m-theme-preview-bar" style={{ backgroundColor: t.color }} />
                  <div className="m-theme-preview-body">
                    <div className="m-theme-preview-line" style={{ width: '70%' }} />
                    <div className="m-theme-preview-line" style={{ width: '90%' }} />
                    <div className="m-theme-preview-line" style={{ width: '50%' }} />
                  </div>
                  {isSel && (
                    <div className="m-theme-check">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    </div>
                  )}
                </div>
                <span className="m-theme-label">{t.title}</span>
              </button>
            )
          })}
        </div>
      </section>
    )
  }

  if (screen === 'datetime') {
    return (
      <section className={leaving ? 'page m-settings-screen leaving' : 'page m-settings-screen'} role="region" aria-label="Дата и время">
        <header className="m-settings-head">
          <button className="m-settings-back-btn" onClick={() => setScreen('main')} aria-label="Назад">
            <ChevronLeft size={22} />
          </button>
          <h2>Дата и время</h2>
        </header>

        <div className="m-set-group" style={{ marginTop: 8 }}>
          <button
            className="m-set-item"
            onClick={() => {
              const next = timeFormat === '24' ? '12' : '24'
              setTimeFormat(next)
              try { localStorage.setItem('time-format', next) } catch {}
            }}
          >
            <span className="m-set-item-text">Формат времени</span>
            <span className="m-set-item-val">{timeFormat === '24' ? '24-часовой' : '12-часовой'}</span>
            <ChevronRight size={18} className="m-set-item-arrow" />
          </button>

          <button
            className="m-set-item"
            onClick={() => {
              const next = firstDay === 'mon' ? 'sun' : 'mon'
              setFirstDay(next)
              try { localStorage.setItem('first-day', next) } catch {}
            }}
          >
            <span className="m-set-item-text">Первый день недели</span>
            <span className="m-set-item-val">{firstDay === 'mon' ? 'Понедельник' : 'Воскресенье'}</span>
            <ChevronRight size={18} className="m-set-item-arrow" />
          </button>
        </div>

        <div className="m-set-group">
          <div className="m-set-item" style={{ cursor: 'default' }}>
            <span className="m-set-item-text">Режим обратного отсчета</span>
            <label className="switch dp-switch" style={{ margin: 0 }}>
              <input
                type="checkbox"
                checked={countdownMode}
                onChange={(e) => {
                  setCountdownMode(e.target.checked)
                  try { localStorage.setItem('countdown-mode', e.target.checked ? '1' : '0') } catch {}
                }}
              />
              <span />
            </label>
          </div>

          <div className="m-set-item" style={{ cursor: 'default' }}>
            <span className="m-set-item-text">Часовой пояс</span>
            <span className="m-set-item-val">{userTz}</span>
          </div>
        </div>
      </section>
    )
  }

  if (screen === 'tabbar') {
    const tabMap = new Map(ALL_TAB_INFOS.map((t) => [t.id, t.label]))
    return (
      <section className={leaving ? 'page m-tabbar-screen leaving' : 'page m-tabbar-screen'} role="region" aria-label="Панель вкладок">
        <header className="m-settings-head">
          <button className="m-settings-back-btn" onClick={() => setScreen('main')} aria-label="Назад">
            <ChevronLeft size={22} />
          </button>
          <h2>Панель вкладок</h2>
        </header>

        <h3 className="m-set-group-title">Активные вкладки (до 5)</h3>
        <div className="m-set-group">
          {activeTabs.map((tabId) => (
            <div key={tabId} className="m-set-item">
              <button
                className="m-tab-badge-btn del"
                onClick={() => removeTab(tabId)}
                aria-label={`Удалить ${tabMap.get(tabId)}`}
                title="Удалить"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" fill="none">
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
              <span className="m-set-item-icon">
                <TabIcon tab={tabId} active={true} />
              </span>
              <span className="m-set-item-text">{tabMap.get(tabId)}</span>
              <span className="m-tab-drag-handle" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="4" y1="8" x2="20" y2="8" />
                  <line x1="4" y1="16" x2="20" y2="16" />
                </svg>
              </span>
            </div>
          ))}
        </div>

        {inactiveTabs.length > 0 && (
          <>
            <h3 className="m-set-group-title">Неактивные вкладки</h3>
            <div className="m-set-group">
              {inactiveTabs.map((t) => (
                <div key={t.id} className="m-set-item">
                  <button
                    className="m-tab-badge-btn add"
                    onClick={() => addTab(t.id)}
                    aria-label={`Добавить ${t.label}`}
                    title="Добавить"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3" fill="none">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                  <span className="m-set-item-icon">
                    <TabIcon tab={t.id} active={false} />
                  </span>
                  <span className="m-set-item-text">{t.label}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    )
  }

  if (screen === 'import') {
    return (
      <section className={leaving ? 'page m-settings-screen leaving' : 'page m-settings-screen'} role="region" aria-label="Импорт">
        <header className="m-settings-head">
          <button className="m-settings-back-btn" onClick={() => setScreen('main')} aria-label="Назад">
            <ChevronLeft size={22} />
          </button>
          <h2>Импорт и интеграция</h2>
        </header>

        <div className="m-set-group" style={{ marginTop: 8 }}>
          <label className="m-set-item" style={{ cursor: 'pointer' }}>
            <span className="m-set-item-text">Импорт из TickTick (файл .json)</span>
            <input
              type="file"
              accept=".json,application/json"
              hidden
              onChange={(e) => {
                const input = e.target
                void pickFile(input.files?.[0]).then(() => (input.value = ''))
              }}
            />
            <ChevronRight size={18} className="m-set-item-arrow" />
          </label>
        </div>

        {imp && (
          <div className="m-set-group">
            <p className="muted" style={{ padding: '12px 16px', margin: 0, fontSize: 13 }}>{imp}</p>
          </div>
        )}

        {bundle && (
          <div style={{ padding: '0 16px' }}>
            <button className="primary" style={{ width: '100%' }} onClick={() => void runBundle()} disabled={impBusy}>
              Импортировать в аккаунт
            </button>
          </div>
        )}
      </section>
    )
  }

  if (screen === 'notifications') {
    return (
      <section className={leaving ? 'page m-settings-screen leaving' : 'page m-settings-screen'} role="region" aria-label="Уведомления">
        <header className="m-settings-head">
          <button className="m-settings-back-btn" onClick={() => setScreen('main')} aria-label="Назад">
            <ChevronLeft size={22} />
          </button>
          <h2>Звуки и уведомления</h2>
        </header>

        <div className="m-set-group" style={{ marginTop: 8 }}>
          <button
            className="m-set-item"
            onClick={() => void sendTestNotification().then(setNotifResult).catch((e: Error) => setNotifResult(e.message))}
          >
            <span className="m-set-item-text">Отправить тестовое уведомление</span>
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

  if (screen === 'general') {
    return (
      <section className={leaving ? 'page m-settings-screen leaving' : 'page m-settings-screen'} role="region" aria-label="Общие">
        <header className="m-settings-head">
          <button className="m-settings-back-btn" onClick={() => setScreen('main')} aria-label="Назад">
            <ChevronLeft size={22} />
          </button>
          <h2>Общие настройки</h2>
        </header>

        <h3 className="m-set-group-title">Карточка задачи</h3>
        <div className="m-set-group">
          {(['page', 'dialog'] as TaskViewMode[]).map((mode) => (
            <button
              key={mode}
              className="m-set-item"
              onClick={() => {
                setTaskModeState(mode)
                setTaskMode(mode)
                onTaskMode(mode)
              }}
            >
              <span className="m-set-item-text">{mode === 'page' ? 'Страница на весь экран' : 'Всплывающее окно'}</span>
              {taskMode === mode && (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          ))}
        </div>

        <h3 className="m-set-group-title">Списки в боковом меню</h3>
        <div className="m-set-group">
          {MENU_LIST_CHOICES.map(([id, title]) => (
            <div key={id} className="m-set-item" style={{ cursor: 'default' }}>
              <span className="m-set-item-text">{title}</span>
              <label className="switch dp-switch" style={{ margin: 0 }}>
                <input
                  type="checkbox"
                  checked={menuLists.includes(id)}
                  onChange={(e) =>
                    onMenuLists(
                      e.target.checked
                        ? MENU_LIST_CHOICES.map(([x]) => x).filter((x) => x === id || menuLists.includes(x))
                        : menuLists.filter((x) => x !== id),
                    )
                  }
                />
                <span />
              </label>
            </div>
          ))}
        </div>
      </section>
    )
  }

  // Главный экран настроек 1-в-1 по Photo 3
  return (
    <section className={leaving ? 'page m-settings-screen leaving' : 'page m-settings-screen'} role="region" aria-label="Настройки">
      <header className="m-settings-head">
        <h2>Настройки</h2>
        {onClose && (
          <button className="round" style={{ marginLeft: 'auto', display: 'none' }} onClick={onClose} aria-label="Закрыть" />
        )}
      </header>

      {/* Карточка профиля пользователя */}
      <div className="m-set-profile-card">
        <div className="m-set-avatar-wrap">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </div>
        <div className="m-set-profile-info">
          <h3 className="m-set-profile-name">{email ? email : 'Войти или Зарегистрироваться'}</h3>
          <p className="m-set-profile-sub">{email ? 'Аккаунт синхронизирован' : 'Синхронизация между устройствами'}</p>
        </div>
        <ChevronRight size={20} className="m-set-item-arrow" />
      </div>

      {/* Секция 1: Панель вкладок */}
      <div className="m-set-group">
        <button className="m-set-item" onClick={() => setScreen('tabbar')}>
          <span className="m-set-item-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="14" rx="3" />
              <line x1="8" y1="19" x2="8" y2="15" />
              <line x1="16" y1="19" x2="16" y2="15" />
            </svg>
          </span>
          <span className="m-set-item-text">Панель вкладок</span>
          <ChevronRight size={18} className="m-set-item-arrow" />
        </button>
      </div>

      {/* Секция 2: Вид, Дата и время, Звуки, Виджеты, Общие */}
      <div className="m-set-group">
        <button className="m-set-item" onClick={() => setScreen('theme')}>
          <span className="m-set-item-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="13.5" cy="6.5" r="2.5" />
              <circle cx="17.5" cy="10.5" r="2.5" />
              <circle cx="8.5" cy="7.5" r="2.5" />
              <circle cx="6.5" cy="12.5" r="2.5" />
              <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.9 0 1.6-.7 1.6-1.6 0-.4-.2-.8-.5-1.1-.3-.3-.4-.7-.4-1.1 0-.9.7-1.6 1.6-1.6H16c3.3 0 6-2.7 6-6 0-5.5-4.5-10-10-10z" />
            </svg>
          </span>
          <span className="m-set-item-text">Вид</span>
          <ChevronRight size={18} className="m-set-item-arrow" />
        </button>

        <button className="m-set-item" onClick={() => setScreen('datetime')}>
          <span className="m-set-item-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </span>
          <span className="m-set-item-text">Дата и время</span>
          <ChevronRight size={18} className="m-set-item-arrow" />
        </button>

        <button className="m-set-item" onClick={() => setScreen('notifications')}>
          <span className="m-set-item-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          </span>
          <span className="m-set-item-text">Звуки и уведомления</span>
          <ChevronRight size={18} className="m-set-item-arrow" />
        </button>

        <button
          className="m-set-item"
          onClick={() => alert('Виджеты рабочего стола настраиваются через стандартное меню добавления виджетов на рабочем столе телефона.')}
        >
          <span className="m-set-item-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1.5" />
            </svg>
          </span>
          <span className="m-set-item-text">Виджеты</span>
          <ChevronRight size={18} className="m-set-item-arrow" />
        </button>

        <button className="m-set-item" onClick={() => setScreen('general')}>
          <span className="m-set-item-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="21" x2="4" y2="14" />
              <line x1="4" y1="10" x2="4" y2="3" />
              <line x1="12" y1="21" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12" y2="3" />
              <line x1="20" y1="21" x2="20" y2="16" />
              <line x1="20" y1="12" x2="20" y2="3" />
              <line x1="1" y1="14" x2="7" y2="14" />
              <line x1="9" y1="8" x2="15" y2="8" />
              <line x1="17" y1="16" x2="23" y2="16" />
            </svg>
          </span>
          <span className="m-set-item-text">Общие</span>
          <ChevronRight size={18} className="m-set-item-arrow" />
        </button>
      </div>

      {/* Секция 3: Импорт и интеграция */}
      <div className="m-set-group">
        <button className="m-set-item" onClick={() => setScreen('import')}>
          <span className="m-set-item-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </span>
          <span className="m-set-item-text">Импорт и интеграция</span>
          <ChevronRight size={18} className="m-set-item-arrow" />
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
              alert('Ссылка на приложение скопирована в буфер обмена')
            }
          }}
        >
          <span className="m-set-item-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 12 20 22 4 22 4 12" />
              <rect x="2" y="7" width="20" height="5" />
              <line x1="12" y1="22" x2="12" y2="7" />
              <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
              <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
            </svg>
          </span>
          <span className="m-set-item-text">Рекомендовано друзьям</span>
          <ChevronRight size={18} className="m-set-item-arrow" />
        </button>

        <button className="m-set-item" onClick={() => alert('TickTick 2.0 — версия 2.0. Все права защищены.')}>
          <span className="m-set-item-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </span>
          <span className="m-set-item-text">Помощь</span>
          <ChevronRight size={18} className="m-set-item-arrow" />
        </button>
      </div>

      {/* Секция 5: Обновление и Выход */}
      <div className="m-set-group">
        <button className="m-set-item" onClick={() => void checkUpdates()} disabled={checking}>
          <span className="m-set-item-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
          </span>
          <span className="m-set-item-text">Проверить обновления</span>
          <span className="m-set-item-val">{checking ? 'Проверка...' : 'v2.0'}</span>
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

        <button className="m-set-item" onClick={onSignOut} style={{ color: '#ef4444' }}>
          <span className="m-set-item-icon" style={{ color: '#ef4444' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
