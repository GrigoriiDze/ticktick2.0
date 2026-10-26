import { ChevronLeft, ChevronRight } from '../../../ui/icons'
import { copyMcpConfig } from '../components/copyMcpConfig'
import type { ImportBundle } from '../../../import/bundle'

interface Props {
  wrapClass: string
  bundle: ImportBundle | null
  imp: string | null
  impBusy: boolean
  pickFile: (file: File | undefined) => Promise<void>
  runBundle: () => Promise<void>
  exportBackup: () => Promise<void>
  onBack: () => void
  showToast: (msg: string) => void
}

export function BackupSection({
  wrapClass,
  bundle,
  imp,
  impBusy,
  pickFile,
  runBundle,
  exportBackup,
  onBack,
  showToast,
}: Props) {
  return (
    <section className={wrapClass} role="region" aria-label="Интеграции и импорт">
      <header className="m-settings-head">
        <button className="m-settings-back-btn" onClick={onBack} aria-label="Назад">
          <ChevronLeft size={24} />
        </button>
        <h2>Интеграции и импорт</h2>
      </header>

      <div className="m-set-group" style={{ marginTop: 8 }}>
        <label className="m-set-item" style={{ cursor: 'pointer' }}>
          <span className="m-set-brand-icon" style={{ background: '#4772fa', color: '#fff' }}>📅</span>
          <span className="m-set-item-text">Импорт из TickTick (.csv / .json)</span>
          <input
            type="file"
            accept=".json,.csv,application/json,text/csv"
            hidden
            onChange={(e) => {
              const input = e.target
              void pickFile(input.files?.[0]).then(() => (input.value = ''))
            }}
          />
          <ChevronRight size={18} className="m-set-item-arrow" />
        </label>
        <button type="button" className="m-set-item" onClick={() => void exportBackup()} disabled={impBusy}>
          <span className="m-set-brand-icon" style={{ background: '#10b981', color: '#fff' }}>⬇</span>
          <span className="m-set-item-text">Экспорт резервной копии (.json)</span>
          <ChevronRight size={18} className="m-set-item-arrow" />
        </button>
        <button
          type="button"
          className="m-set-item"
          onClick={() => showToast('Выберите экспортированный файл .csv или .json для переноса')}
        >
          <span className="m-set-brand-icon" style={{ background: '#191919', color: '#fff', fontWeight: 800 }}>N</span>
          <span className="m-set-item-text">Notion</span>
          <ChevronRight size={18} className="m-set-item-arrow" />
        </button>
      </div>

      {imp && (
        <div className="m-set-group">
          <p className="muted" style={{ padding: '12px 16px', margin: 0, fontSize: 13 }}>{imp}</p>
        </div>
      )}

      {bundle && (
        <div style={{ padding: '0 16px 12px' }}>
          <button className="primary" style={{ width: '100%' }} onClick={() => void runBundle()} disabled={impBusy}>
            Импортировать в аккаунт
          </button>
        </div>
      )}

      <h3 className="m-set-group-title">Импорт</h3>
      <div className="m-set-group">
        <label className="m-set-item" style={{ cursor: 'pointer' }}>
          <span className="m-set-brand-icon" style={{ background: '#e44332', color: '#fff' }}>✓</span>
          <span className="m-set-item-text">Todoist / Резервная копия (.csv / .json)</span>
          <input
            type="file"
            accept=".json,.csv,application/json,text/csv"
            hidden
            onChange={(e) => {
              const input = e.target
              void pickFile(input.files?.[0]).then(() => (input.value = ''))
            }}
          />
          <ChevronRight size={18} className="m-set-item-arrow" />
        </label>
        <label className="m-set-item" style={{ cursor: 'pointer' }}>
          <span className="m-set-brand-icon" style={{ background: '#2564cf', color: '#fff' }}>✔</span>
          <span className="m-set-item-text">Microsoft To Do (.csv / .json)</span>
          <input
            type="file"
            accept=".json,.csv,application/json,text/csv"
            hidden
            onChange={(e) => {
              const input = e.target
              void pickFile(input.files?.[0]).then(() => (input.value = ''))
            }}
          />
          <ChevronRight size={18} className="m-set-item-arrow" />
        </label>
      </div>

      <h3 className="m-set-group-title">Интеграция</h3>
      <div className="m-set-group">
        <button type="button" className="m-set-item" onClick={() => void copyMcpConfig().then(showToast)}>
          <span className="m-set-brand-icon" style={{ background: '#ff4f00', color: '#fff' }}>✳</span>
          <span className="m-set-item-text">Zapier / MCP токен</span>
          <ChevronRight size={18} className="m-set-item-arrow" />
        </button>
        <button type="button" className="m-set-item" onClick={() => void copyMcpConfig().then(showToast)}>
          <span className="m-set-brand-icon" style={{ background: '#191919', color: '#fff', fontSize: 9, fontWeight: 800 }}>IFTTT</span>
          <span className="m-set-item-text">IFTTT</span>
          <ChevronRight size={18} className="m-set-item-arrow" />
        </button>
        <button type="button" className="m-set-item" onClick={() => void copyMcpConfig().then(showToast)}>
          <span className="m-set-brand-icon" style={{ background: '#2aabee', color: '#fff' }}>✈</span>
          <span className="m-set-item-text">Telegram</span>
          <ChevronRight size={18} className="m-set-item-arrow" />
        </button>
      </div>
    </section>
  )
}

