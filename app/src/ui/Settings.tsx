import { useState } from 'react'
import { describeBundle, parseBundle, type ImportBundle } from '../import/bundle'
import type { WriteResult } from '../import/write'
import { checkForUpdate, type UpdateInfo } from '../platform/updates'
import { notificationsSupported, sendTestNotification } from '../platform/notifications'
import { ACCENTS, MENU_LIST_CHOICES, getAccent, getTaskMode, getTheme, setAccent, setTaskMode, setTheme, type Accent, type MenuListId, type TaskViewMode, type ThemeMode } from '../platform/theme'
import { ChevronLeft } from './icons'

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

const THEMES: Array<[ThemeMode, string]> = [
  ['system', 'Как в системе'],
  ['light', 'Светлая'],
  ['dark', 'Тёмная'],
]

const TASK_MODES: Array<[TaskViewMode, string]> = [
  ['page', 'Страница'],
  ['dialog', 'Окно'],
]

/** Импорт из TickTick и проверка обновлений: одинаково работают на телефоне и в окне настроек для компьютера */
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
      setImp(`Готово. Добавлено задач ${r.tasks.added}, списков ${r.projects.added}, привычек ${r.habits.added}. Что уже было, не тронуто`)
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
      setUpd({ text: r.update ? `Вышла версия ${r.update.versionName}${r.update.notes ? `: ${r.update.notes}` : ''}` : `Установлена последняя версия ${r.current.versionName}`, update: r.update })
    } catch (e) {
      setUpd({ text: (e as Error).message || 'Не удалось проверить обновления', update: null })
    } finally {
      setChecking(false)
    }
  }

  return { bundle, imp, impBusy, pickFile, runBundle, upd, checking, check }
}

/** Настройки: вид приложения, уведомления и аккаунт. Открываются шестерёнкой в боковом меню */
export function Settings({ email, onTaskMode, menuLists, onMenuLists, onSignOut, onImport, onClose, leaving }: Props) {
  const { bundle, imp, impBusy, pickFile, runBundle, upd, checking, check } = useImportAndUpdates(onImport)
  const [mode, setMode] = useState<ThemeMode>(getTheme)
  const [accent, setAccentState] = useState<Accent>(getAccent)
  const [taskMode, setTaskModeState] = useState<TaskViewMode>(getTaskMode)
  const [result, setResult] = useState<string | null>(null)

  return (
    <section className={leaving ? 'page settings leaving' : 'page settings'} role="dialog" aria-label="Настройки">
      <header className="tp-head">
        <button className="round" onClick={onClose} aria-label="Назад">
          <ChevronLeft size={22} />
        </button>
        <strong className="settings-title">Настройки</strong>
        <span className="round-spacer" />
      </header>

      <div className="tp-scroll">
        <div className="set-card">
          <div className="set-row">
            <span className="set-label">Тема</span>
            <div className="seg theme-seg" role="radiogroup" aria-label="Тема">
              {THEMES.map(([id, title]) => (
                <button
                  key={id}
                  role="radio"
                  aria-checked={mode === id}
                  className={mode === id ? 'on p0' : 'p0'}
                  onClick={() => {
                    setMode(id)
                    setTheme(id)
                  }}
                >
                  {title}
                </button>
              ))}
            </div>
          </div>

          <div className="set-row">
            <span className="set-label">Цвет</span>
            <div className="accent-row" role="radiogroup" aria-label="Цвет акцента">
              {ACCENTS.map((a) => (
                <button
                  key={a.id}
                  role="radio"
                  aria-checked={accent === a.id}
                  aria-label={a.title}
                  className={accent === a.id ? 'accent-dot on' : 'accent-dot'}
                  style={{ background: a.color }}
                  onClick={() => {
                    setAccentState(a.id)
                    setAccent(a.id)
                  }}
                />
              ))}
            </div>
          </div>

          <div className="set-row">
            <span className="set-label">Карточка задачи</span>
            <div className="seg theme-seg" role="radiogroup" aria-label="Карточка задачи">
              {TASK_MODES.map(([id, title]) => (
                <button
                  key={id}
                  role="radio"
                  aria-checked={taskMode === id}
                  className={taskMode === id ? 'on p0' : 'p0'}
                  onClick={() => {
                    setTaskModeState(id)
                    setTaskMode(id)
                    onTaskMode(id)
                  }}
                >
                  {title}
                </button>
              ))}
            </div>
          </div>
        </div>

        {notificationsSupported() && (
          <div className="set-card">
            <button className="set-button" onClick={() => void sendTestNotification().then(setResult).catch((e: Error) => setResult(e.message))}>
              Проверить уведомления
            </button>
            {result && <p className="muted test-result">{result}</p>}
          </div>
        )}

        <div className="set-card">
          <p className="muted set-note">Какие списки показывать в боковом меню</p>
          {MENU_LIST_CHOICES.map(([id, title]) => (
            <label key={id} className="switch dp-switch">
              <input
                type="checkbox"
                checked={menuLists.includes(id)}
                onChange={(e) => onMenuLists(e.target.checked ? MENU_LIST_CHOICES.map(([x]) => x).filter((x) => x === id || menuLists.includes(x)) : menuLists.filter((x) => x !== id))}
              />
              <span>{title}</span>
            </label>
          ))}
        </div>

        <div className="set-card">
          <label className="set-button">
            Импорт из TickTick: выбрать файл
            <input type="file" accept=".json,application/json" hidden onChange={(e) => {
                const input = e.target
                void pickFile(input.files?.[0]).then(() => (input.value = ''))
              }}
            />
          </label>
          {imp && <p className="muted test-result">{imp}</p>}
          {bundle && (
            <button className="set-button" onClick={() => void runBundle()} disabled={impBusy}>
              Импортировать в мой аккаунт
            </button>
          )}
        </div>

        <div className="set-card">
          <button className="set-button" onClick={() => void check()} disabled={checking}>
            Проверить обновления
          </button>
          {upd && <p className="muted test-result">{upd.text}</p>}
          {upd?.update && (
            <button className="set-button" onClick={() => window.open(upd.update!.apk, '_system')}>
              Скачать и установить
            </button>
          )}
        </div>

        <div className="set-card">
          {email && <p className="muted set-account">{email}</p>}
          <button className="set-button danger" onClick={onSignOut}>
            Выйти
          </button>
        </div>
      </div>
    </section>
  )
}
