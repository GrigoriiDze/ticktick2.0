import { ChevronLeft, ChevronRight } from '../../../ui/icons'
import { StorageService } from '../../../platform/storage'

interface Props {
  email: string | null
  wrapClass: string
  onBack: () => void
  showToast: (msg: string) => void
}

export function ProfileSection({ email, wrapClass, onBack, showToast }: Props) {
  const pomoStats = (() => {
    const s = StorageService.get<Array<{ kind?: string; minutes?: number }>>('pomo-sessions-v2', [])
    const totalCount = s.filter((x) => !x.kind || x.kind === 'pomo').length
    const mins = s.reduce((acc, x) => acc + (x.minutes || 0), 0)
    return {
      totalCount,
      durationStr: `${Math.floor(mins / 60)}h ${mins % 60}m`,
    }
  })()

  return (
    <section className={wrapClass} role="region" aria-label="Профиль">
      <header className="m-settings-head">
        <button className="m-settings-back-btn" onClick={onBack} aria-label="Назад">
          <ChevronLeft size={24} />
        </button>
        <span style={{ flex: 1 }} />
        <button
          className="m-settings-back-btn"
          style={{ marginRight: 0 }}
          aria-label="Ещё"
          onClick={() => showToast('Профиль синхронизирован с облаком')}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="12" cy="5.5" r="1.7" />
            <circle cx="12" cy="12" r="1.7" />
            <circle cx="12" cy="18.5" r="1.7" />
          </svg>
        </button>
      </header>

      <div className="m-prof-hero">
        <div className="m-prof-big-avatar">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 12c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2.5c-3.33 0-10 1.67-10 5V22h20v-2.5c0-3.33-6.67-5-10-5z" />
          </svg>
        </div>
        <div className="m-prof-name-row">
          <strong>{email || 'contactrayniz@gmail.com'}</strong>
          <ChevronRight size={18} className="m-set-item-arrow" />
        </div>
      </div>

      <button
        type="button"
        className="m-set-group"
        style={{
          textAlign: 'center',
          padding: '15px 16px',
          fontWeight: 500,
          width: 'calc(100% - 24px)',
          border: 0,
          cursor: 'pointer',
          color: 'var(--text)',
        }}
        onClick={() => showToast('Все функции Premium уже разблокированы!')}
      >
        Premium активирован ✓
      </button>

      <div className="m-set-group" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <strong style={{ fontSize: 16 }}>Мой орден</strong>
          <span style={{ color: 'var(--muted)', fontSize: 14, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            1 <ChevronRight size={16} />
          </span>
        </div>
        <div style={{ textAlign: 'center', padding: '8px 0 6px', color: 'var(--muted)', fontSize: 13 }}>
          Орден «Мастер планирования» получен
        </div>
      </div>

      <div className="m-set-group" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <strong style={{ fontSize: 16 }}>Мои Достижения</strong>
          <ChevronRight size={16} className="m-set-item-arrow" />
        </div>
        <div style={{ display: 'flex', gap: 40, marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Очки Достижений</div>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 2 }}>120</div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Уровень Lv.2</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>Практик</div>
          </div>
        </div>
      </div>

      <div className="m-set-group" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <strong style={{ fontSize: 16 }}>Статистика по фокусу</strong>
          <ChevronRight size={16} className="m-set-item-arrow" />
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Всего Помо</div>
        <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 6 }}>
          {pomoStats.totalCount}
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)' }}>Общая сфокусированная продолжительность</div>
        <div style={{ fontSize: 22, fontWeight: 700 }}>
          {pomoStats.durationStr}
        </div>
      </div>
    </section>
  )
}

