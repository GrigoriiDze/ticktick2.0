interface Props {
  onAdd: () => void
}

export function HabitEmptyState({ onAdd }: Props) {
  return (
    <div className="hb-empty-state">
      <div className="hb-empty-art">
        <svg width="200" height="200" viewBox="0 0 200 200" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" opacity="0.45">
          <rect x="45" y="55" width="110" height="90" rx="8" />
          <path d="M100 55v90M45 80h55M100 80h55M45 105h55M100 105h55M45 130h55M100 130h55" strokeDasharray="3 3" />
          <path d="M165 45l15 15-70 70-15-15 70-70zM95 130l-8 2 2-8 6 6z" />
          <path d="M25 110h20v25c0 6-4 10-10 10s-10-4-10-10v-25zM25 118h-6c-3 0-5 2-5 5s2 5 5 5h6" />
          <circle cx="150" cy="140" r="14" />
          <path d="M144 140l4 4 8-8" />
          <path d="M75 35l2 4 4 2-4 2-2 4-2-4-4-2 4-2zM170 170l2 3 3 2-3 2-2 3-2-3-3-2 3-2z" fill="currentColor" />
        </svg>
      </div>
      <p className="hb-empty-hint">Выберите привычку для просмотра статистики</p>
      <button className="hb-sparkle-btn" onClick={onAdd} title="Создать привычку">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2l2.4 6.6L21 11l-6.6 2.4L12 20l-2.4-6.6L3 11l6.6-2.4z" />
        </svg>
      </button>
    </div>
  )
}

