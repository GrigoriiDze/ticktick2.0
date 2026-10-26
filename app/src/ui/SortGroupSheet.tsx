import { useEffect } from 'react'
import type { GroupMode } from '../domain/groups'
import { GROUP_MODES } from '../domain/groups'
import type { SortMode, SortOrder } from '../domain/sort'
import { SORT_MODES } from '../domain/sort'

interface Props {
  open: boolean
  groupMode: GroupMode
  sortMode: SortMode
  sortOrder: SortOrder
  onChangeGroup: (m: GroupMode) => void
  onChangeSort: (m: SortMode) => void
  onChangeOrder: (o: SortOrder) => void
  onClose: () => void
}

export function SortGroupSheet({
  open,
  groupMode,
  sortMode,
  sortOrder,
  onChangeGroup,
  onChangeSort,
  onChangeOrder,
  onClose,
}: Props) {
  useEffect(() => {
    if (!open) return
    const onBack = (e: Event) => {
      e.preventDefault()
      onClose()
    }
    window.addEventListener('tt-back-request', onBack)
    return () => window.removeEventListener('tt-back-request', onBack)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="sheet-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label="Сортировка и группировка">
      <div className="sort-group-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-handle" aria-hidden="true" />

        <div className="sheet-header">
          <h3>Сортировка и группировка</h3>
          <button className="sheet-close-btn" onClick={onClose} aria-label="Закрыть">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Группировка */}
        <section className="sg-section">
          <div className="sg-section-title">ГРУППИРОВКА</div>
          <div className="sg-chip-row">
            {GROUP_MODES.map((gm) => {
              const active = gm.id === groupMode
              return (
                <button
                  key={gm.id}
                  type="button"
                  className={`sg-chip${active ? ' active' : ''}`}
                  onClick={() => onChangeGroup(gm.id)}
                >
                  {gm.title}
                </button>
              )
            })}
          </div>
        </section>

        {/* Сортировка */}
        <section className="sg-section">
          <div className="sg-section-title">СОРТИРОВКА</div>
          <div className="sg-chip-row">
            {SORT_MODES.map((sm) => {
              const active = sm.id === sortMode
              return (
                <button
                  key={sm.id}
                  type="button"
                  className={`sg-chip${active ? ' active' : ''}`}
                  onClick={() => onChangeSort(sm.id)}
                >
                  {sm.title}
                </button>
              )
            })}
          </div>
        </section>

        {/* Направление сортировки */}
        <section className="sg-section">
          <div className="sg-section-title">НАПРАВЛЕНИЕ</div>
          <div className="sg-order-toggle">
            <button
              type="button"
              className={`sg-order-btn${sortOrder === 'asc' ? ' active' : ''}`}
              onClick={() => onChangeOrder('asc')}
            >
              <span>По возрастанию</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="19" x2="12" y2="5" />
                <polyline points="5 12 12 5 19 12" />
              </svg>
            </button>
            <button
              type="button"
              className={`sg-order-btn${sortOrder === 'desc' ? ' active' : ''}`}
              onClick={() => onChangeOrder('desc')}
            >
              <span>По убыванию</span>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <polyline points="19 12 12 19 5 12" />
              </svg>
            </button>
          </div>
        </section>

        <button type="button" className="sg-apply-btn" onClick={onClose}>
          Готово
        </button>
      </div>
    </div>
  )
}

