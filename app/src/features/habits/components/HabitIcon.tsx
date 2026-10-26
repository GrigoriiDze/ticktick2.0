export function HabitIcon({ name, size = 22 }: { name: string; size?: number }) {
  const s = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none' }
  const lower = name.toLowerCase()

  // Завтрак / Тост с яичницей (photo_12, photo_15)
  if (lower.includes('завтр') || lower.includes('тост') || lower.includes('еда')) {
    return (
      <svg {...s}>
        <path d="M6 9c0-2.2 1.8-3.5 6-3.5s6 1.3 6 3.5c0 1.2-.5 2-1 2.5V18a2 2 0 01-2 2H9a2 2 0 01-2-2v-6.5C6.5 11 6 10.2 6 9z" fill="#F59E0B" />
        <path d="M7.5 9.2c0-1.5 1.3-2.4 4.5-2.4s4.5.9 4.5 2.4c0 .9-.4 1.5-.8 1.9v6.4a.8.8 0 01-.8.8H9.1a.8.8 0 01-.8-.8v-6.4c-.4-.4-.8-1-.8-1.9z" fill="#FFFBEB" />
        <circle cx="12" cy="13.5" r="2.1" fill="#FBBF24" />
      </svg>
    )
  }

  // Велосипед (photo_18, photo_41)
  if (lower.includes('велос') || lower.includes('байк')) {
    return (
      <svg {...s}>
        <circle cx="7" cy="16.5" r="3.2" stroke="#ffffff" strokeWidth="1.8" />
        <circle cx="17" cy="16.5" r="3.2" stroke="#ffffff" strokeWidth="1.8" />
        <circle cx="12.5" cy="6" r="1.8" fill="#ffffff" />
        <path d="M7 16.5l3.5-5h4l2.5 5M10.5 11.5l1.5-3 2.5 1.5" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  // Стакан воды (photo_15, photo_16)
  if (lower.includes('вод') || lower.includes('пить')) {
    return (
      <svg {...s}>
        <path d="M6.5 4.5h11l-1.3 14a2 2 0 01-2 1.8H9.8a2 2 0 01-2-1.8L6.5 4.5z" fill="#ffffff" fillOpacity="0.9" />
        <path d="M7.4 10h9.2l-.7 8a1 1 0 01-1 .9H9.1a1 1 0 01-1-.9l-.7-8z" fill="#38BDF8" />
        <circle cx="10.5" cy="14" r="1" fill="#ffffff" />
        <circle cx="13.5" cy="16" r="0.8" fill="#ffffff" />
      </svg>
    )
  }

  // Фрукты / Банан (photo_15, photo_16)
  if (lower.includes('фрукт') || lower.includes('банан') || lower.includes('яблок')) {
    return (
      <svg {...s}>
        <path d="M15.5 5c1 4.5-1.5 9.5-6.5 12.5-1.5.9-3 .8-3.5 0-.4-.6.3-1.6 1.5-2.4 4-2.5 6.2-6 6.8-10.1.2-1 1.5-1 1.7 0z" fill="#FACC15" />
        <path d="M15.2 4.5c.4-.5 1.2-.3 1.4.4.5 2-.2 5-2 7.5" stroke="#CA8A04" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    )
  }

  // Солнце / Рано вставать (photo_15)
  if (lower.includes('встав') || lower.includes('утр') || lower.includes('солн') || lower.includes('проверк')) {
    return (
      <svg {...s}>
        <circle cx="12" cy="12" r="5.5" fill="#F59E0B" />
        <path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21M5.6 5.6l1.6 1.6M16.8 16.8l1.6 1.6M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }

  // Луна Zzz / Рано ложиться / Сон (photo_15)
  if (lower.includes('сон') || lower.includes('спат') || lower.includes('лож') || lower.includes('ночь')) {
    return (
      <svg {...s}>
        <path d="M13.5 4.5a7.5 7.5 0 106 11.5 6.5 6.5 0 01-6-11.5z" fill="#FDE047" />
        <path d="M15 6h3l-3 3.5h3" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  }

  // Бег / Спорт / Зарядка / Тренировка
  if (lower.includes('йог') || lower.includes('спорт') || lower.includes('заряд') || lower.includes('трен') || lower.includes('бег') || lower.includes('шаг')) {
    return (
      <svg {...s} fill="#ffffff">
        <circle cx="13.5" cy="4.5" r="2" />
        <path d="M19 13l-4-2.5-1.5-3.5c-.3-.7-1-1-1.7-1-.5 0-.9.2-1.2.6L7 11.5l1.6 1.3 2.4-2.4 1 2.6-3 6h2l2.2-4.5 2.8 1.8V21h2v-4.5l-2.4-1.5 1-2.5 2.4 1.5z" />
      </svg>
    )
  }

  // Книга / Чтение / Учеба
  if (lower.includes('книг') || lower.includes('чит') || lower.includes('учеб') || lower.includes('англ') || lower.includes('язык')) {
    return (
      <svg {...s}>
        <rect x="5" y="4" width="14" height="16" rx="2.5" fill="#3B82F6" />
        <rect x="8" y="7" width="8" height="2" rx="1" fill="#ffffff" />
        <rect x="8" y="11" width="5" height="1.8" rx="0.9" fill="#93C5FD" />
      </svg>
    )
  }

  // Отказ / Воздержание / Без сахара
  if (lower.includes('возд') || lower.includes('отказ') || lower.includes('не кур') || lower.includes('без') || lower.includes('сахар') || lower.includes('алко')) {
    return (
      <svg {...s}>
        <circle cx="12" cy="12" r="8.5" stroke="#ffffff" strokeWidth="2.2" />
        <path d="M6 6l12 12" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    )
  }

  // Сердце / Благодарность / Дневник
  if (lower.includes('благод') || lower.includes('добр') || lower.includes('сердц') || lower.includes('дневн')) {
    return (
      <svg {...s} fill="#ffffff">
        <path d="M12 20.5l-1.4-1.25C5.6 14.8 2.5 11.9 2.5 8.4 2.5 5.5 4.8 3.2 7.7 3.2c1.6 0 3.2.75 4.3 1.95 1.1-1.2 2.7-1.95 4.3-1.95 2.9 0 5.2 2.3 5.2 5.2 0 3.5-3.1 6.4-8.1 10.85L12 20.5z" />
      </svg>
    )
  }

  // Смайл / звезда по умолчанию
  return (
    <svg {...s}>
      <circle cx="12" cy="12" r="8.5" fill="#FDE047" />
      <circle cx="9.2" cy="10.2" r="1.2" fill="#CA8A04" />
      <circle cx="14.8" cy="10.2" r="1.2" fill="#CA8A04" />
      <path d="M8.5 14c1 1.6 2.2 2.3 3.5 2.3s2.5-.7 3.5-2.3" stroke="#CA8A04" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}

