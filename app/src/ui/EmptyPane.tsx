/** Правая колонка на большом экране, когда задача не выбрана: тихий рисунок вместо пустоты. Рисунок свой */
export function EmptyPane() {
  return (
    <aside className="pane-empty" aria-hidden="true">
      <svg viewBox="0 0 320 260" width="320" height="260" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="70" y="40" width="150" height="190" rx="16" />
        <rect x="112" y="24" width="66" height="28" rx="10" />
        <rect x="92" y="86" width="22" height="22" rx="7" />
        <path d="M97 97l5 5 8-10" />
        <path d="M128 97h70" />
        <rect x="92" y="130" width="22" height="22" rx="7" />
        <path d="M128 141h56" />
        <rect x="92" y="174" width="22" height="22" rx="7" />
        <path d="M128 185h64" />
        <path d="M236 150l38-38 18 18-38 38-26 8z" />
        <path d="M262 124l18 18" />
        <circle cx="56" cy="64" r="5" />
        <path d="M262 52l5 10 11 1-8 8 2 11-10-5-10 5 2-11-8-8 11-1z" />
      </svg>
    </aside>
  )
}
