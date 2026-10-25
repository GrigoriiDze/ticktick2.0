import { useEffect, useState, type ReactNode } from 'react'
import { resetPassword } from '../platform/auth'
import { notificationsSupported, sendTestNotification } from '../platform/notifications'
import { ACCENTS, MENU_LIST_CHOICES, getAccent, getTheme, setAccent, setTheme, type Accent, type MenuListId, type ThemeMode } from '../platform/theme'
import { useImportAndUpdates, type Props } from './Settings'

type Section = 'account' | 'smart' | 'notify' | 'look' | 'import' | 'keys' | 'about'

const ic = { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.5, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
const NAV: Array<{ id: Section; title: string; icon: ReactNode }> = [
  {
    id: 'account',
    title: 'Аккаунт',
    icon: (
      <svg {...ic}>
        <circle cx="12" cy="12" r="8.5" />
        <circle cx="12" cy="10" r="3" />
        <path d="M6.5 17.5c1.2-2 3.1-3 5.5-3s4.3 1 5.5 3" />
      </svg>
    ),
  },
  {
    id: 'smart',
    title: 'Умный список',
    icon: (
      <svg {...ic}>
        <path d="M4.5 6h15l-5.8 6.6v5.4l-3.4 1.6v-7z" />
      </svg>
    ),
  },
  {
    id: 'notify',
    title: 'Уведомления',
    icon: (
      <svg {...ic}>
        <path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 1.5h-15z" />
        <path d="M10 20.5a2.2 2.2 0 0 0 4 0" />
      </svg>
    ),
  },
  {
    id: 'look',
    title: 'Внешний вид',
    icon: (
      <svg {...ic}>
        <rect x="4" y="4" width="16" height="6" rx="2.5" />
        <path d="M12 10v3.5M9 13.5h6v6h-6z" />
      </svg>
    ),
  },
  {
    id: 'import',
    title: 'Интеграции и импорт',
    icon: (
      <svg {...ic}>
        <path d="M12 4v11M7.5 10.5L12 15l4.5-4.5M5 19.5h14" />
      </svg>
    ),
  },
  {
    id: 'keys',
    title: 'Горячие клавиши',
    icon: (
      <svg {...ic}>
        <rect x="3" y="6" width="18" height="12" rx="3" />
        <path d="M7 10h.01M11 10h.01M15 10h.01M7 14h10" />
      </svg>
    ),
  },
  {
    id: 'about',
    title: 'О приложении',
    icon: (
      <svg {...ic}>
        <circle cx="12" cy="12" r="8.5" />
        <path d="M12 11v5.5M12 7.8v.1" />
      </svg>
    ),
  },
]

const THEMES: Array<[ThemeMode, string]> = [
  ['system', 'По умолчанию'],
  ['light', 'Светлая'],
  ['dark', 'Тёмная'],
]

/** Строка группы: название слева, справа значение или кнопка */
const Row = ({ label, children, note }: { label: string; children?: ReactNode; note?: string }) => (
  <div className="ds-row">
    <div className="ds-row-main">
      <span className="ds-label">{label}</span>
      {children}
    </div>
    {note && <p className="ds-note">{note}</p>}
  </div>
)

const Chevrons = () => (
  <svg width="8" height="12" viewBox="0 0 8 12" aria-hidden="true" className="ds-chev">
    <path d="M1.5 4.5L4 2l2.5 2.5M1.5 7.5L4 10l2.5-2.5" fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

/**
 * Настройки на большом экране: окно с меню разделов слева, как в десктопном TickTick.
 * Размеры и цвета сняты замером. Показаны только разделы, функции которых в приложении есть
 */
export function SettingsDesktop({ email, menuLists, onMenuLists, onSignOut, onImport, onClose, leaving }: Props) {
  const nav = NAV
  const [section, setSection] = useState<Section>('account')
  const [mode, setMode] = useState<ThemeMode>(getTheme)
  const [accent, setAccentState] = useState<Accent>(getAccent)
  const [note, setNote] = useState<string | null>(null)
  const [perm, setPerm] = useState<NotificationPermission>(typeof Notification === 'undefined' ? 'denied' : Notification.permission)
  const { bundle, imp, impBusy, pickFile, runBundle, upd, checking, check } = useImportAndUpdates(onImport)

  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [onClose])

  const shown = (id: MenuListId) => menuLists.includes(id)
  const setShown = (id: MenuListId, on: boolean) => onMenuLists(MENU_LIST_CHOICES.map(([x]) => x).filter((x) => (x === id ? on : menuLists.includes(x))))

  const current = nav.find((n) => n.id === section) ?? nav[0]

  return (
    <div className={leaving ? 'ds-scrim leaving' : 'ds-scrim'} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <section className="ds" role="dialog" aria-label="Настройки">
        <aside className="ds-nav">
          <h1>Настройки</h1>
          {nav.map((n) => (
            <button key={n.id} className={n.id === current.id ? 'ds-nav-item on' : 'ds-nav-item'} onClick={() => (setSection(n.id), setNote(null))}>
              {n.icon}
              <span>{n.title}</span>
            </button>
          ))}
        </aside>
        <div className="ds-body">
          <button className="ds-close" onClick={onClose} aria-label="Закрыть">
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
              <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          {current.id === 'account' && (
            <div className="ds-account">
              <span className="ds-avatar" aria-hidden="true">
                {(email ?? 'A').slice(0, 1).toUpperCase()}
              </span>
              <div className="ds-group">
                <Row label="Электронная почта">
                  <span className="ds-value">{email ?? 'не указана'}</span>
                </Row>
                {email && (
                  <Row label="Пароль" note={note ?? undefined}>
                    <button className="ds-link" onClick={() => void resetPassword(email).then(() => setNote(`Письмо для нового пароля отправлено на ${email}`)).catch(() => setNote('Не удалось отправить письмо'))}>
                      Изменить пароль
                    </button>
                  </Row>
                )}
                <Row label="Выход из аккаунта">
                  <button className="ds-link danger" onClick={onSignOut}>
                    Выйти
                  </button>
                </Row>
              </div>
            </div>
          )}

          {current.id === 'smart' && (
            <>
              <h2 className="ds-title">Умный список</h2>
              <div className="ds-group">
                {MENU_LIST_CHOICES.map(([id, title]) => (
                  <Row key={id} label={title}>
                    <label className="ds-select">
                      <select value={shown(id) ? 'on' : 'off'} onChange={(e) => setShown(id, e.target.value === 'on')} aria-label={title}>
                        <option value="on">Показать</option>
                        <option value="off">Скрыть</option>
                      </select>
                      <Chevrons />
                    </label>
                  </Row>
                ))}
              </div>
            </>
          )}

          {current.id === 'notify' && (
            <>
              <h2 className="ds-title">Уведомления</h2>
              {notificationsSupported() ? (
                <div className="ds-group">
                  <Row label="Проверить уведомления" note={note ?? undefined}>
                    <button className="ds-link" onClick={() => void sendTestNotification().then(setNote).catch((e: Error) => setNote(e.message))}>
                      Отправить
                    </button>
                  </Row>
                </div>
              ) : (
                <div className="ds-group">
                  <Row label="Окно напоминания" note="Когда наступает время напоминания, в углу окна появляется карточка с кнопками «Отсрочка» и «Выполнено». Окно приложения должно быть открыто">
                    <span className="ds-value">Включено</span>
                  </Row>
                  <Row
                    label="Уведомления Windows"
                    note={typeof Notification === 'undefined' ? 'Эта программа не умеет показывать системные уведомления' : 'Нужны, чтобы увидеть напоминание, когда окно свёрнуто'}
                  >
                    {typeof Notification === 'undefined' ? (
                      <span className="ds-value">Недоступно</span>
                    ) : perm === 'granted' ? (
                      <span className="ds-value">Разрешены</span>
                    ) : perm === 'denied' ? (
                      <span className="ds-value">Запрещены в настройках</span>
                    ) : (
                      <button className="ds-link" onClick={() => void Notification.requestPermission().then(setPerm)}>
                        Разрешить
                      </button>
                    )}
                  </Row>
                </div>
              )}
            </>
          )}

          {current.id === 'look' && (
            <>
              <h2 className="ds-title">Тема</h2>
              <div className="ds-tiles" role="radiogroup" aria-label="Тема">
                {THEMES.map(([id, title]) => (
                  <button key={id} role="radio" aria-checked={mode === id} className="ds-tile" onClick={() => (setMode(id), setTheme(id))}>
                    <span className={`ds-swatch th-${id}${mode === id ? ' on' : ''}`}>{id === 'dark' && <i />}</span>
                    <span>{title}</span>
                  </button>
                ))}
              </div>
              <h2 className="ds-title">Цвет акцента</h2>
              <div className="ds-tiles" role="radiogroup" aria-label="Цвет акцента">
                {ACCENTS.map((a) => (
                  <button key={a.id} role="radio" aria-checked={accent === a.id} className="ds-tile" onClick={() => (setAccentState(a.id), setAccent(a.id))}>
                    <span className={accent === a.id ? 'ds-swatch on' : 'ds-swatch'} style={{ background: a.color }} />
                    <span>{a.title}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          {current.id === 'import' && (
            <>
              <h2 className="ds-title">Импорт</h2>
              <div className="ds-cards">
                <label className="ds-card">
                  <span className="ds-card-title">Импорт из TickTick</span>
                  <span className="ds-card-hint">Выберите файл, сохранённый скриптом выгрузки. То, что уже есть, повторно не добавится</span>
                  <input
                    type="file"
                    accept=".json,application/json"
                    hidden
                    onChange={(e) => {
                      const input = e.target
                      void pickFile(input.files?.[0]).then(() => (input.value = ''))
                    }}
                  />
                </label>
              </div>
              {imp && <p className="ds-status">{imp}</p>}
              {bundle && (
                <button className="ds-primary" onClick={() => void runBundle()} disabled={impBusy}>
                  Импортировать в мой аккаунт
                </button>
              )}
            </>
          )}

          {current.id === 'keys' && (
            <>
              <h2 className="ds-title">Горячие клавиши</h2>
              <div className="ds-group">
                {[
                  ['Ctrl + K или Ctrl + F', 'Поиск по всем задачам'],
                  ['N', 'Новая задача: курсор в строку добавления'],
                  ['Enter', 'Сохранить задачу из строки добавления'],
                  ['Esc', 'Закрыть историю, карточку задачи, окно'],
                  ['Правая кнопка мыши', 'Меню задачи: приоритет, дата, перенос, копия'],
                ].map(([k, v]) => (
                  <Row key={k} label={v}>
                    <kbd className="ds-kbd">{k}</kbd>
                  </Row>
                ))}
              </div>
            </>
          )}

          {current.id === 'about' && (
            <>
              <h2 className="ds-title">Обновления</h2>
              <div className="ds-group">
                <Row label="Проверить обновления">
                  <button className="ds-link" onClick={() => void check()} disabled={checking}>
                    Проверить
                  </button>
                </Row>
              </div>
              {upd && <p className="ds-status">{upd.text}</p>}
              {upd?.update && (
                <button className="ds-primary" onClick={() => window.open(upd.update!.apk, '_system')}>
                  Скачать и установить
                </button>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  )
}
