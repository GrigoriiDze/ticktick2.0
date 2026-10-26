import { ChevronLeft } from '../../../ui/icons'

interface Props {
  wrapClass: string
  onBack: () => void
  showToast: (msg: string) => void
}

export function WidgetsSection({ wrapClass, onBack, showToast }: Props) {
  return (
    <section className={wrapClass} role="region" aria-label="Виджеты">
      <header className="m-settings-head">
        <button className="m-settings-back-btn" onClick={onBack} aria-label="Назад">
          <ChevronLeft size={24} />
        </button>
        <h2>Виджеты</h2>
      </header>

      <div className="m-widgets-grid">
        <div className="m-widget-preview-wrap" onClick={() => showToast('Зажмите пустое место на рабочем столе телефона → Виджеты → Задачи')}>
          <div className="m-widget-card">
            <div style={{ fontSize: 38, lineHeight: 1 }}>🍅</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', margin: '6px 0 8px' }}>Сегодня: 0m</div>
            <div style={{ background: '#4772fa', color: '#fff', borderRadius: 99, padding: '6px 18px', fontSize: 13, fontWeight: 600 }}>▶ Начать</div>
          </div>
          <span>Фокус</span>
        </div>

        <div className="m-widget-preview-wrap" onClick={() => showToast('Зажмите пустое место на рабочем столе телефона → Виджеты → Задачи')}>
          <div className="m-widget-card" style={{ background: '#8be27b', alignItems: 'flex-start', color: '#1e3a1e' }}>
            <div style={{ fontSize: 12 }}><strong>16</strong> Days</div>
            <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>Поесть фр...</div>
            <div style={{ fontSize: 40, alignSelf: 'flex-end', marginTop: 'auto' }}>🍌</div>
          </div>
          <span>Привычка сегодняшнего дня.</span>
        </div>

        <div className="m-widget-preview-wrap" onClick={() => showToast('Зажмите пустое место на рабочем столе телефона → Виджеты → Задачи')}>
          <div className="m-widget-card" style={{ alignItems: 'flex-start' }}>
            <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Добавить за...</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>📅 Сегодня</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>📥 Входящие</div>
            <div style={{ color: '#4772fa', fontSize: 22, alignSelf: 'flex-end', marginTop: 'auto' }}>+</div>
          </div>
          <span>Быстрое добавление задачи</span>
        </div>

        <div className="m-widget-preview-wrap" onClick={() => showToast('Зажмите пустое место на рабочем столе телефона → Виджеты → Задачи')}>
          <div className="m-widget-card">
            <div style={{ fontSize: 13, fontWeight: 700 }}>🎆 Новый год</div>
            <div style={{ fontSize: 34, fontWeight: 800, color: '#4772fa', margin: '4px 0' }}>68</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Дней до</div>
          </div>
          <span>обратный отсчет</span>
        </div>
      </div>
    </section>
  )
}
