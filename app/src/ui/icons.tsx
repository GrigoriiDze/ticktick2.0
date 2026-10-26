import type { SVGProps } from 'react'

/** Значки нарисованы для этого приложения, у всех одна сетка 24 на 24 и контурный стиль */
type P = SVGProps<SVGSVGElement> & { size?: number }

function base({ size = 18, ...rest }: P) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    ...rest,
  }
}

export const MicIcon = (p: P) => (
  <svg aria-hidden="true" {...base(p)}>
    <rect x="9" y="3" width="6" height="11" rx="3" />
    <path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3" />
  </svg>
)

export const MatrixIcon = (p: P) => (
  <svg aria-hidden="true" {...base(p)}>
    <rect x="4" y="4" width="7" height="7" rx="1.8" />
    <rect x="13" y="4" width="7" height="7" rx="1.8" />
    <rect x="4" y="13" width="7" height="7" rx="1.8" />
    <rect x="13" y="13" width="7" height="7" rx="1.8" />
  </svg>
)

export const NoteIcon = (p: P) => (
  <svg role="img" aria-label="Есть описание" {...base(p)}>
    <rect x="4" y="4" width="16" height="16" rx="3.5" />
    <path d="M8 9.5h8M8 13h8M8 16.5h4.5" />
  </svg>
)

export const AlarmIcon = (p: P) => (
  <svg role="img" aria-label="Есть напоминание" {...base(p)}>
    <circle cx="12" cy="13" r="7" />
    <path d="M12 9.5V13l2.4 1.6M4.5 6.5l3-2.5M19.5 6.5l-3-2.5" />
  </svg>
)

export const RepeatIcon = (p: P) => (
  <svg role="img" aria-label="Повторяется" {...base(p)}>
    <path d="M4 11V9.5A3.5 3.5 0 0 1 7.5 6H19l-2.5-2.5M20 13v1.5a3.5 3.5 0 0 1-3.5 3.5H5l2.5 2.5" />
  </svg>
)

export const PinIcon = (p: P) => (
  <svg role="img" aria-label="Закреплено" {...base(p)}>
    <path d="M9 4h6l-1 5 3 3v1.5H7V12l3-3-1-5zM12 13.5V20" />
  </svg>
)

export const ClockIcon = (p: P) => (
  <svg {...base(p)} aria-hidden="true">
    <circle cx="12" cy="12" r="8" />
    <path d="M12 7.5V12l3 2" />
  </svg>
)

export const CalendarIcon = (p: P) => (
  <svg {...base(p)} aria-hidden="true">
    <rect x="4" y="5.5" width="16" height="14.5" rx="3.5" />
    <path d="M8 3.5v4M16 3.5v4M4 10h16" />
  </svg>
)

export const FlagIcon = (p: P) => (
  <svg {...base(p)} aria-hidden="true">
    <path d="M6 20V5M6 5h11l-2.2 3.5L17 12H6" />
  </svg>
)

export const TagIcon = (p: P) => (
  <svg {...base(p)} aria-hidden="true">
    <path d="M3.5 12.2V5.5a2 2 0 0 1 2-2h6.7l8.3 8.3a2 2 0 0 1 0 2.8l-5.9 5.9a2 2 0 0 1-2.8 0L3.5 12.2z" />
    <circle cx="8" cy="8" r="1.3" />
  </svg>
)

export const ListIcon = (p: P) => (
  <svg {...base(p)} aria-hidden="true">
    <rect x="4" y="5" width="16" height="14" rx="3.5" />
    <path d="M4 14h4.5l1 2h5l1-2H20" />
  </svg>
)

export const SendIcon = (p: P) => (
  <svg {...base({ strokeWidth: 2.4, ...p })} aria-hidden="true">
    <path d="M12 19V6M6.5 11.5 12 6l5.5 5.5" />
  </svg>
)

export const CloseIcon = (p: P) => (
  <svg {...base({ strokeWidth: 2.2, ...p })} aria-hidden="true">
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
)

export const CheckIcon = (p: P) => (
  <svg {...base({ strokeWidth: 2.4, ...p })} aria-hidden="true">
    <path d="M5 12.5 10 17.5 19 7.5" />
  </svg>
)

export const ChevronRight = (p: P) => (
  <svg {...base({ strokeWidth: 2, ...p })} aria-hidden="true">
    <path d="M9.5 5.5 16 12l-6.5 6.5" />
  </svg>
)

export const ChevronLeft = (p: P) => (
  <svg {...base({ strokeWidth: 2, ...p })} aria-hidden="true">
    <path d="M14.5 5.5 8 12l6.5 6.5" />
  </svg>
)

export const ChevronDown = (p: P) => (
  <svg {...base({ strokeWidth: 2, ...p })} aria-hidden="true">
    <path d="M6 9.5 12 16l6-6.5" />
  </svg>
)

export const TrashIcon = (p: P) => (
  <svg {...base(p)} aria-hidden="true">
    <path d="M5 7h14M10 7V5h4v2M7 7l.8 12h8.4L17 7M10 11v5M14 11v5" />
  </svg>
)

export const ShareIcon = (p: P) => (
  <svg {...base(p)} aria-hidden="true">
    <path d="M12 15V4M8 8l4-4 4 4M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5" />
  </svg>
)

export const SkipIcon = (p: P) => (
  <svg {...base(p)} aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <path d="M9 9l6 6M15 9l-6 6" />
  </svg>
)

export const SubtaskIcon = (p: P) => (
  <svg {...base(p)} aria-hidden="true">
    <path d="M5 5v8a2 2 0 0 0 2 2h5M12 11.5l3.5 3.5-3.5 3.5M5 5h6" />
  </svg>
)

export const HistoryIcon = (p: P) => (
  <svg {...base(p)} aria-hidden="true">
    <path d="M4 12a8 8 0 1 0 2.5-5.8" />
    <path d="M4 4.5v4h4" />
    <path d="M12 8v4.2l2.8 1.8" />
  </svg>
)

export const DuplicateIcon = (p: P) => (
  <svg {...base(p)} aria-hidden="true">
    <rect x="8" y="8" width="12" height="12" rx="3" />
    <path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2" />
  </svg>
)

export const PrintIcon = (p: P) => (
  <svg {...base(p)} aria-hidden="true">
    <path d="M7 9V4h10v5" />
    <rect x="4" y="9" width="16" height="8" rx="2" />
    <path d="M7 14h10v6H7z" />
  </svg>
)

export const SearchIcon = (p: P) => (
  <svg {...base(p)} aria-hidden="true">
    <circle cx="11" cy="11" r="6.5" />
    <path d="M16 16l4 4" />
  </svg>
)

export const UndoIcon = (p: P) => (
  <svg {...base({ strokeWidth: 2.4, ...p })} aria-hidden="true">
    <path d="M9 7 5 11l4 4M5 11h8.5a4.5 4.5 0 0 1 0 9H11" />
  </svg>
)

export const SortIcon = (p: P) => (
  <svg {...base(p)} aria-hidden="true">
    <path d="M5 7h14M8 12h8M11 17h2" />
  </svg>
)

export const ViewIcon = (p: P) => (
  <svg {...base(p)} aria-hidden="true">
    <rect x="4" y="5" width="4" height="4" rx="1.2" />
    <rect x="4" y="15" width="4" height="4" rx="1.2" />
    <path d="M11.5 7h8M11.5 17h8" />
  </svg>
)


export const FilterIcon = (p: P) => (
  <svg {...base(p)} aria-hidden="true">
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
)
