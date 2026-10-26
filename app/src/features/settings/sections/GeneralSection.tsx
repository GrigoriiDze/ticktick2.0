import { ChevronLeft, ChevronRight } from '../../../ui/icons'
import type { MenuListId, TaskViewMode } from '../../../platform/theme'
import { MENU_LIST_CHOICES } from '../constants'
import type { PickerModalConfig, SettingsScreen } from '../types'

interface Props {
  wrapClass: string
  setScreen: (screen: SettingsScreen) => void
  appLanguage: string
  setAppLanguage: (val: string) => void
  taskMode: TaskViewMode
  setTaskMode: (val: TaskViewMode) => void
  onTaskMode?: (mode: TaskViewMode) => void
  cellularAttachments: boolean
  setCellularAttachments: (val: boolean) => void
  menuLists: MenuListId[]
  onMenuLists: (lists: MenuListId[]) => void
  passcodeLock: boolean
  setPasscodeLock: (val: boolean) => void
  setPickerModal: (cfg: PickerModalConfig | null) => void
  showToast: (msg: string) => void
}

export function GeneralSection({
  wrapClass,
  setScreen,
  appLanguage,
  setAppLanguage,
  taskMode,
  setTaskMode,
  onTaskMode,
  cellularAttachments,
  setCellularAttachments,
  menuLists,
  onMenuLists,
  passcodeLock,
  setPasscodeLock,
  setPickerModal,
  showToast,
}: Props) {
  return (
    <section className={wrapClass} role="region" aria-label="Общие">
      <header className="m-settings-head">
        <button className="m-settings-back-btn" onClick={() => setScreen('main')} aria-label="Назад">
          <ChevronLeft size={24} />
        </button>
        <h2>Общие</h2>
      </header>

      <div className="m-set-group" style={{ marginTop: 8 }}>
        <button
          type="button"
          className="m-set-item"
          onClick={() =>
            setPickerModal({
              title: 'Язык приложения',
              selected: appLanguage,
              options: [
                { key: 'system', label: 'Следовать системе' },
                { key: 'ru', label: 'Русский' },
                { key: 'en', label: 'English' },
              ],
              onSelect: setAppLanguage,
            })
          }
        >
          <div className="m-tabbar-row-body">
            <div className="m-set-item-text">Язык</div>
            <div className="m-set-item-sub">
              {appLanguage === 'ru' ? 'Русский' : appLanguage === 'en' ? 'English' : 'Следовать системе'}
            </div>
          </div>
          <ChevronRight size={18} />
        </button>
        <button type="button" className="m-set-item" onClick={() => setScreen('tabbar')}>
          <span className="m-set-item-text">Ярлыки</span>
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="m-set-group">
        <button
          className="m-set-item"
          onClick={() => {
            const next: TaskViewMode = taskMode === 'page' ? 'dialog' : 'page'
            setTaskMode(next)
            onTaskMode?.(next)
          }}
        >
          <span className="m-set-item-text">Страница с подробностями задачи</span>
          <span className="m-set-item-val">{taskMode === 'page' ? 'На весь экран' : 'Шторка'}</span>
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="m-set-group">
        <button className="m-set-item" onClick={() => setScreen('smart_rec')}>
          <span className="m-set-item-text">Умное Распознавание</span>
          <ChevronRight size={18} />
        </button>
        <button type="button" className="m-set-item" onClick={() => setScreen('defaults')}>
          <span className="m-set-item-text">Быстрое добавление задач</span>
          <ChevronRight size={18} />
        </button>
        <button type="button" className="m-set-item" onClick={() => setScreen('defaults')}>
          <span className="m-set-item-text">Значения по умолчанию</span>
          <ChevronRight size={18} />
        </button>
        <div className="m-set-item" style={{ cursor: 'default' }}>
          <div className="m-tabbar-row-body">
            <div className="m-set-item-text">Выгрузка/загрузка вложений</div>
            <div className="m-set-item-sub">Использование сотовых данных для вложений в задаче</div>
          </div>
          <button
            type="button"
            className={`m-tt-switch${cellularAttachments ? ' on' : ''}`}
            onClick={() => setCellularAttachments(!cellularAttachments)}
            aria-pressed={cellularAttachments}
          >
            <span />
          </button>
        </div>
        <button
          type="button"
          className="m-set-item"
          onClick={() => showToast('Совместная работа над списками включена')}
        >
          <span className="m-set-item-text">Сотрудничество</span>
          <ChevronRight size={18} />
        </button>
        <button
          type="button"
          className="m-set-item"
          onClick={() => showToast('Вы можете дублировать любую задачу как шаблон из её меню ⋮')}
        >
          <span className="m-set-item-text">Управление шаблоном</span>
          <ChevronRight size={18} />
        </button>
      </div>

      <h3 className="m-set-group-title">Умные списки в боковом меню</h3>
      <div className="m-set-group">
        {MENU_LIST_CHOICES.map(([id, title]) => {
          const mId = id as MenuListId
          const on = menuLists.includes(mId)
          return (
            <div key={id} className="m-set-item" style={{ cursor: 'default' }}>
              <span className="m-set-item-text">{title}</span>
              <button
                type="button"
                className={`m-tt-switch${on ? ' on' : ''}`}
                onClick={() =>
                  onMenuLists(
                    !on
                      ? (MENU_LIST_CHOICES.map(([x]) => x as MenuListId).filter((x) => x === mId || menuLists.includes(x)))
                      : menuLists.filter((x) => x !== mId),
                  )
                }
                aria-pressed={on}
              >
                <span />
              </button>
            </div>
          )
        })}
      </div>

      <div className="m-set-group">
        <div className="m-set-item" style={{ cursor: 'default' }}>
          <span className="m-set-item-text">Ограничить доступ (Блокировка)</span>
          <button
            type="button"
            className={`m-tt-switch${passcodeLock ? ' on' : ''}`}
            onClick={() => setPasscodeLock(!passcodeLock)}
            aria-pressed={passcodeLock}
          >
            <span />
          </button>
        </div>
      </div>
    </section>
  )
}
