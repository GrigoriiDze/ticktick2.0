import { useMemo, useState } from 'react'
import { HabitIcon } from './HabitIcon'
import { GALLERY_TEMPLATES, type GalleryTemplate } from '../constants'

interface Props {
  onClose: () => void
  onPickTemplate: (t: GalleryTemplate) => void
  onCreateCustom: () => void
}

export function MobileHabitGalleryScreen(props: Props) {
  const [cat, setCat] = useState<'suggested' | 'routine' | 'health' | 'sport'>('suggested')
  const list = useMemo(
    () => (cat === 'suggested' ? GALLERY_TEMPLATES : GALLERY_TEMPLATES.filter((t) => t.category === cat)),
    [cat],
  )

  return (
    <div className="m-hb-subscreen">
      <header className="m-hb-subhead">
        <button type="button" className="m-hb-back-btn" onClick={props.onClose} aria-label="Назад">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <h2 className="m-hb-subtitle">Галерея</h2>
      </header>

      <div className="m-hb-cat-tabs">
        <button type="button" className={`m-hb-cat-pill${cat === 'suggested' ? ' on' : ''}`} onClick={() => setCat('suggested')}>
          Предложенные
        </button>
        <button type="button" className={`m-hb-cat-pill${cat === 'routine' ? ' on' : ''}`} onClick={() => setCat('routine')}>
          Рутина
        </button>
        <button type="button" className={`m-hb-cat-pill${cat === 'health' ? ' on' : ''}`} onClick={() => setCat('health')}>
          Здоровье
        </button>
        <button type="button" className={`m-hb-cat-pill${cat === 'sport' ? ' on' : ''}`} onClick={() => setCat('sport')}>
          Спорт
        </button>
      </div>

      <div className="m-hb-gallery-list">
        {list.map((t) => (
          <div key={t.id} className="m-hb-gallery-card" onClick={() => props.onPickTemplate(t)}>
            <div className="m-hb-avatar" style={{ background: t.color }}>
              <HabitIcon name={t.name} size={24} />
            </div>
            <div className="m-hb-gallery-info">
              <div className="m-hb-gallery-name">{t.name}</div>
              <div className="m-hb-gallery-quote">{t.quote}</div>
            </div>
            <button
              type="button"
              className="m-hb-gallery-plus"
              onClick={(e) => {
                e.stopPropagation()
                props.onPickTemplate(t)
              }}
              aria-label={`Добавить ${t.name}`}
            >
              +
            </button>
          </div>
        ))}
      </div>

      <div className="m-hb-bottom-bar">
        <button type="button" className="m-hb-primary-pill" onClick={props.onCreateCustom}>
          Создать новую привычку
        </button>
      </div>
    </div>
  )
}

