import { useState } from 'react'
import { ChevronLeft, ChevronRight } from '../../../ui/icons'
import {
  ALL_TAB_INFOS,
  getActiveTabs,
  setActiveTabs,
  TabIcon,
  type Tab,
} from '../../../ui/TabBar'
import { StorageService } from '../../../platform/storage'
import type { PickerModalConfig } from '../types'

interface Props {
  wrapClass: string
  onBack: () => void
  onOpenPicker: (cfg: PickerModalConfig) => void
}

export function TabBarSection({ wrapClass, onBack, onOpenPicker }: Props) {
  const [activeTabs, setActiveTabsState] = useState<Tab[]>(getActiveTabs)
  const [maxNavTabs, setMaxNavTabs] = useState<string>(() =>
    StorageService.get<string>('tt_max_tabs', '5'),
  )

  function removeTab(tabId: Tab) {
    if (tabId === 'tasks' || activeTabs.length <= 2) return
    const next = activeTabs.filter((t) => t !== tabId)
    setActiveTabsState(next)
    setActiveTabs(next)
  }

  function addTab(tabId: Tab) {
    if (activeTabs.includes(tabId)) return
    const next = [...activeTabs, tabId]
    setActiveTabsState(next)
    setActiveTabs(next)
  }

  const infoMap = new Map(ALL_TAB_INFOS.map((t) => [t.id, t]))
  const inactiveTabs = ALL_TAB_INFOS.filter((t) => !activeTabs.includes(t.id))

  return (
    <section className={wrapClass} role="region" aria-label="Панель вкладок">
      <header className="m-settings-head">
        <button className="m-settings-back-btn" onClick={onBack} aria-label="Назад">
          <ChevronLeft size={24} />
        </button>
        <h2>Панель вкладок</h2>
      </header>

      <div className="m-set-group" style={{ marginTop: 8 }}>
        {activeTabs.map((tabId) => {
          const info = infoMap.get(tabId)
          const locked = tabId === 'tasks'
          return (
            <div key={tabId} className="m-set-item m-tabbar-row">
              <button
                className={`m-tab-badge-btn ${locked ? 'locked' : 'del'}`}
                onClick={() => removeTab(tabId)}
                disabled={locked}
                aria-label={`Удалить ${info?.label ?? tabId}`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.2" fill="none">
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>
              <span className="m-set-item-icon m-tabbar-row-icon">
                <TabIcon tab={tabId} active={false} day={25} />
              </span>
              <div className="m-tabbar-row-body">
                <div className="m-set-item-text">{info?.label ?? tabId}</div>
                {info?.desc && <div className="m-set-item-sub">{info.desc}</div>}
              </div>
              <span className="m-tab-drag-handle" aria-hidden="true">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                  <line x1="4" y1="7" x2="20" y2="7" />
                  <line x1="4" y1="12" x2="20" y2="12" />
                  <line x1="4" y1="17" x2="20" y2="17" />
                </svg>
              </span>
            </div>
          )
        })}
      </div>

      {inactiveTabs.length > 0 && (
        <>
          <h3 className="m-set-group-title">Отключено</h3>
          <div className="m-set-group">
            {inactiveTabs.map((t) => (
              <div key={t.id} className="m-set-item m-tabbar-row">
                <button
                  className="m-tab-badge-btn add"
                  onClick={() => addTab(t.id)}
                  aria-label={`Добавить ${t.label}`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3.2" fill="none">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                </button>
                <span className="m-set-item-icon m-tabbar-row-icon">
                  <TabIcon tab={t.id} active={false} day={25} />
                </span>
                <div className="m-tabbar-row-body">
                  <div className="m-set-item-text">{t.label}</div>
                  <div className="m-set-item-sub">{t.desc}</div>
                </div>
                <span className="m-tab-drag-handle" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                    <line x1="4" y1="7" x2="20" y2="7" />
                    <line x1="4" y1="12" x2="20" y2="12" />
                    <line x1="4" y1="17" x2="20" y2="17" />
                  </svg>
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="m-set-group">
        <button
          type="button"
          className="m-set-item"
          onClick={() =>
            onOpenPicker({
              title: 'Максимум вкладок в нижней панели',
              selected: maxNavTabs,
              options: [
                { key: '3', label: '3 вкладки' },
                { key: '4', label: '4 вкладки' },
                { key: '5', label: '5 вкладок (по умолчанию)' },
              ],
              onSelect: (val) => {
                setMaxNavTabs(val)
                StorageService.set('tt_max_tabs', val)
                setActiveTabs([...activeTabs])
              },
            })
          }
        >
          <span className="m-set-item-text">Максимальное количество вкладок в нижней навигации.</span>
          <span className="m-set-item-val">{maxNavTabs}</span>
          <ChevronRight size={18} className="m-set-item-arrow" />
        </button>
      </div>
      <p className="m-set-foot-note">
        Функции, превышающие максимальное количество, будут отображаться в разделе "Ещё".
      </p>
    </section>
  )
}

