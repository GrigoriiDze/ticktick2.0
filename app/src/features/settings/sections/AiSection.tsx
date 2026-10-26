import { ChevronLeft, ChevronRight } from '../../../ui/icons'
import { copyMcpConfig } from '../components/copyMcpConfig'

interface Props {
  wrapClass: string
  onBack: () => void
  aiVoice: boolean
  setAiVoice: (val: boolean) => void
  aiImprove: boolean
  setAiImprove: (val: boolean) => void
  mcpNotice: string
  setMcpNotice: (val: string) => void
}

export function AiSection({
  wrapClass,
  onBack,
  aiVoice,
  setAiVoice,
  aiImprove,
  setAiImprove,
  mcpNotice,
  setMcpNotice,
}: Props) {
  return (
    <section className={wrapClass} role="region" aria-label="Функции ИИ">
      <header className="m-settings-head">
        <button className="m-settings-back-btn" onClick={onBack} aria-label="Назад">
          <ChevronLeft size={24} />
        </button>
        <h2>Функции ИИ</h2>
      </header>

      <div className="m-set-group" style={{ marginTop: 8 }}>
        <div className="m-set-item" style={{ cursor: 'default' }}>
          <div className="m-tabbar-row-body">
            <div className="m-set-item-text">Добавление AI голоса</div>
            <div className="m-set-item-sub">
              В процессе добавления звуков автоматически определяются подходящие названия задач, время выполнения задач и другие необходимые атрибуты.
            </div>
          </div>
          <button
            type="button"
            className={`m-tt-switch${aiVoice ? ' on' : ''}`}
            onClick={() => setAiVoice(!aiVoice)}
            aria-pressed={aiVoice}
          >
            <span />
          </button>
        </div>
      </div>

      <h3 className="m-set-group-title">Потребление</h3>
      <div className="m-set-group">
        <div className="m-set-item" style={{ cursor: 'default' }}>
          <div className="m-tabbar-row-body">
            <div className="m-set-item-text">Ежемесячный лимит</div>
            <div className="m-set-item-sub">Использовано 0% Время обновления: 25 окт., 21:24</div>
          </div>
        </div>
      </div>

      <h3 className="m-set-group-title">Приватность</h3>
      <div className="m-set-group">
        <div className="m-set-item" style={{ cursor: 'default' }}>
          <div className="m-tabbar-row-body">
            <div className="m-set-item-text">Помогите нам улучшить ИИ.</div>
            <div className="m-set-item-sub">
              После открытия ваших данных использования будут использоваться для улучшения качества работы ИИ.
            </div>
          </div>
          <button
            type="button"
            className={`m-tt-switch${aiImprove ? ' on' : ''}`}
            onClick={() => setAiImprove(!aiImprove)}
            aria-pressed={aiImprove}
          >
            <span />
          </button>
        </div>
      </div>

      <h3 className="m-set-group-title">Связь/Контакты</h3>
      <div className="m-set-group">
        <button
          type="button"
          className="m-set-item"
          onClick={() => void copyMcpConfig().then(setMcpNotice).catch((e: Error) => setMcpNotice(e.message))}
        >
          <div className="m-tabbar-row-body">
            <div className="m-set-item-text">Сервер MCP</div>
            <div className="m-set-item-sub">В платформах вроде ChatGPT, Claude, VS Code используется символ TickTick. Нажмите, чтобы скопировать конфиг MCP.</div>
          </div>
          <ChevronRight size={18} />
        </button>
        <button
          type="button"
          className="m-set-item"
          onClick={() => void copyMcpConfig().then(setMcpNotice).catch((e: Error) => setMcpNotice(e.message))}
        >
          <span className="m-set-item-text">TickTick CLI</span>
          <ChevronRight size={18} />
        </button>
      </div>
      {mcpNotice && (
        <div className="m-set-group" style={{ marginTop: 8 }}>
          <p className="muted" style={{ padding: '12px 16px', margin: 0, fontSize: 13 }}>{mcpNotice}</p>
        </div>
      )}
    </section>
  )
}
