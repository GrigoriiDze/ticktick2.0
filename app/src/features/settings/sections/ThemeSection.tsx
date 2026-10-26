import { useState } from 'react'
import { ChevronLeft, ChevronRight } from '../../../ui/icons'
import { applyDisplayPrefs, type Accent, type ThemeMode } from '../../../platform/theme'
import { APP_ICONS, COLOR_SERIES, SEASON_SERIES } from '../constants'
import type { PickerModalConfig } from '../types'

interface Props {
  wrapClass: string
  selectedThemeId: string
  appIconId: string
  fontSize: string
  showSidebarCounts: boolean
  hideNote: boolean
  showListColor: boolean
  onBack: () => void
  onPickTheme: (id: string, accent: Accent, mode: ThemeMode) => void
  onSetAppIconId: (id: string) => void
  onSetFontSize: (size: string) => void
  onSetShowSidebarCounts: (v: boolean) => void
  onSetHideNote: (v: boolean) => void
  onSetShowListColor: (v: boolean) => void
  onOpenPicker: (cfg: PickerModalConfig) => void
  showToast: (msg: string) => void
}

export function ThemeSection({
  wrapClass,
  selectedThemeId,
  appIconId,
  fontSize,
  showSidebarCounts,
  hideNote,
  showListColor,
  onBack,
  onPickTheme,
  onSetAppIconId,
  onSetFontSize,
  onSetShowSidebarCounts,
  onSetHideNote,
  onSetShowListColor,
  onOpenPicker,
  showToast,
}: Props) {
  const [themeTab, setThemeTab] = useState<'theme' | 'icons' | 'screen'>('theme')

  return (
    <section className={wrapClass} role="region" aria-label="Тема">
      <header className="m-settings-head m-theme-header-bar">
        <button className="m-settings-back-btn" onClick={onBack} aria-label="Назад">
          <ChevronLeft size={24} />
        </button>
        <div className="m-theme-top-tabs">
          <button
            className={`m-theme-top-tab${themeTab === 'theme' ? ' active' : ''}`}
            onClick={() => setThemeTab('theme')}
          >
            Тема
          </button>
          <button
            className={`m-theme-top-tab${themeTab === 'icons' ? ' active' : ''}`}
            onClick={() => setThemeTab('icons')}
          >
            Иконки
          </button>
          <button
            className={`m-theme-top-tab${themeTab === 'screen' ? ' active' : ''}`}
            onClick={() => setThemeTab('screen')}
          >
            Экран
          </button>
        </div>
      </header>

      {themeTab === 'screen' ? (
        <>
          <div className="m-set-group" style={{ marginTop: 8 }}>
            <button
              type="button"
              className="m-set-item"
              onClick={() =>
                onOpenPicker({
                  title: 'Размер шрифта',
                  selected: fontSize,
                  options: [
                    { key: 'normal', label: 'Стандартный' },
                    { key: 'large', label: 'Большой' },
                    { key: 'xlarge', label: 'Огромный' },
                  ],
                  onSelect: (val) => {
                    onSetFontSize(val)
                    applyDisplayPrefs()
                  },
                })
              }
            >
              <span className="m-set-item-text" style={{ fontWeight: 600 }}>Размер шрифта</span>
              <span className="m-set-item-val">
                {fontSize === 'large' ? 'Большой' : fontSize === 'xlarge' ? 'Огромный' : 'Стандартный'}
              </span>
              <ChevronRight size={18} className="m-set-item-arrow" />
            </button>
          </div>

          <div className="m-set-group" style={{ padding: '16px' }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Количество боковых панелей</div>
            <div className="m-screen-compare-grid">
              <button
                type="button"
                className={`m-screen-opt-card${showSidebarCounts ? ' on' : ''}`}
                onClick={() => {
                  onSetShowSidebarCounts(true)
                  applyDisplayPrefs()
                }}
              >
                {showSidebarCounts && (
                  <span className="m-swatch-check">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                )}
                <div className="m-screen-mock-row">
                  <span className="m-screen-mock-ico">25</span>
                  <span>Сегодня</span>
                  <small>3</small>
                </div>
                <div className="m-screen-mock-row">
                  <span className="m-screen-mock-ico">▭</span>
                  <span>Все зада..</span>
                  <small>16</small>
                </div>
              </button>

              <button
                type="button"
                className={`m-screen-opt-card${!showSidebarCounts ? ' on' : ''}`}
                onClick={() => {
                  onSetShowSidebarCounts(false)
                  applyDisplayPrefs()
                }}
              >
                {!showSidebarCounts && (
                  <span className="m-swatch-check">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                )}
                <div className="m-screen-mock-row">
                  <span className="m-screen-mock-ico">25</span>
                  <span>Сегодня</span>
                </div>
                <div className="m-screen-mock-row">
                  <span className="m-screen-mock-ico">▭</span>
                  <span>Все задачи</span>
                </div>
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: 13, color: 'var(--muted)', margin: '8px 0 14px' }}>
              <span>Показать</span>
              <span>Скрыть</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 4 }}>
              <span style={{ fontSize: 15 }}>Скрыть заметку.</span>
              <button
                type="button"
                className={`m-tt-switch${hideNote ? ' on' : ''}`}
                onClick={() => {
                  const next = !hideNote
                  onSetHideNote(next)
                  applyDisplayPrefs()
                }}
                aria-pressed={hideNote}
              >
                <span />
              </button>
            </div>
          </div>

          <div className="m-set-group" style={{ padding: '16px' }}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>Цвет списка</div>
            <div className="m-screen-compare-grid">
              <button
                type="button"
                className={`m-screen-opt-card stripe-demo${showListColor ? ' on' : ''}`}
                onClick={() => {
                  onSetShowListColor(true)
                  applyDisplayPrefs()
                }}
              >
                {showListColor && (
                  <span className="m-swatch-check">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                )}
                <div className="m-screen-mock-row">
                  <span className="m-screen-mock-box" />
                  <span>Задача</span>
                </div>
                <div className="m-screen-mock-row">
                  <span className="m-screen-mock-box" />
                  <span>Задача</span>
                </div>
              </button>

              <button
                type="button"
                className={`m-screen-opt-card${!showListColor ? ' on' : ''}`}
                onClick={() => {
                  onSetShowListColor(false)
                  applyDisplayPrefs()
                }}
              >
                {!showListColor && (
                  <span className="m-swatch-check">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                )}
                <div className="m-screen-mock-row">
                  <span className="m-screen-mock-box" />
                  <span>Задача</span>
                </div>
                <div className="m-screen-mock-row">
                  <span className="m-screen-mock-box" />
                  <span>Задача</span>
                </div>
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-around', fontSize: 13, color: 'var(--muted)', marginTop: 8 }}>
              <span>Показать</span>
              <span>Скрыть</span>
            </div>
          </div>
        </>
      ) : themeTab === 'icons' ? (
        <div className="m-set-group m-theme-card-group" style={{ marginTop: 8 }}>
          <h3 className="m-theme-section-title">Значок приложения</h3>
          <div className="m-theme-grid">
            {APP_ICONS.map((ic) => {
              const isSel = appIconId === ic.id
              return (
                <button
                  key={ic.id}
                  type="button"
                  className="m-theme-swatch-item"
                  onClick={() => {
                    onSetAppIconId(ic.id)
                    showToast(`Выбрана иконка «${ic.title}»`)
                  }}
                >
                  <div className="m-theme-swatch-box" style={{ background: ic.color }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    {isSel && (
                      <span className="m-swatch-check">
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </span>
                    )}
                  </div>
                  <span className="m-theme-label">{ic.title}</span>
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <>
          <div className="m-set-group m-theme-card-group" style={{ marginTop: 8 }}>
            <h3 className="m-theme-section-title">Цветная Серия</h3>
            <div className="m-theme-grid">
              {COLOR_SERIES.map((t) => {
                const isSel = selectedThemeId === t.id
                return (
                  <button
                    key={t.id}
                    type="button"
                    className="m-theme-swatch-item"
                    onClick={() => onPickTheme(t.id, t.accent, t.mode)}
                  >
                    <div
                      className={`m-theme-swatch-box${t.border ? ' bordered' : ''}`}
                      style={{ background: t.color }}
                    >
                      {t.materialYou && (
                        <div className="m-material-you-circle">
                          <span style={{ background: '#bce3d4' }} />
                          <span style={{ background: '#e8d5b5' }} />
                          <span style={{ background: '#f5b895' }} />
                          <span style={{ background: '#53a8b6' }} />
                        </div>
                      )}
                      {isSel && (
                        <span className="m-swatch-check">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </span>
                      )}
                    </div>
                    <span className="m-theme-label">{t.title}</span>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="m-set-group m-theme-card-group">
            <h3 className="m-theme-section-title">Серия "Времена года"</h3>
            <div className="m-theme-grid">
              {SEASON_SERIES.map((s) => {
                const isSel = selectedThemeId === s.id
                return (
                  <button
                    key={s.id}
                    type="button"
                    className="m-theme-swatch-item"
                    onClick={() => onPickTheme(s.id, s.accent, 'light')}
                  >
                    <div className="m-theme-swatch-box" style={{ background: s.bg }}>
                      {isSel && (
                        <span className="m-swatch-check">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                        </span>
                      )}
                    </div>
                    <span className="m-theme-label">{s.title}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </section>
  )
}

