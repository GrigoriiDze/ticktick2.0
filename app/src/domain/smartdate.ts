import { addDays, localToMs, today, type DateCtx, type DayKey } from './dates'

/** Что нашлось в названии задачи: срок, время и теги. Остаток текста становится названием */
export interface Smart {
  title: string
  day: DayKey | null
  time: string | null
  tags: string[]
}

const L = '(?<![\\p{L}\\p{N}_])'
const R = '(?![\\p{L}\\p{N}_])'

const WEEKDAYS: Record<string, number> = {
  воскресенье: 0,
  понедельник: 1,
  вторник: 2,
  среду: 3,
  четверг: 4,
  пятницу: 5,
  субботу: 6,
}

const MONTHS = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря']

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function dayOfWeek(day: DayKey): number {
  const [y, m, d] = day.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

function validDay(y: number, m: number, d: number): boolean {
  const t = new Date(Date.UTC(y, m - 1, d))
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d
}

/** Час из слов «7 вечера», «9 утра», «1 дня», «11 ночи» */
function hourWithPart(h: number, part: string): number | null {
  if (h < 1 || h > 12) return null
  switch (part) {
    case 'утра':
      return h === 12 ? 0 : h
    case 'дня':
      return h === 12 ? 12 : h + 12
    case 'вечера':
      return h === 12 ? 0 : h + 12
    case 'ночи':
      return h === 12 ? 0 : h >= 6 ? h + 12 : h
  }
  return null
}

interface Cut {
  from: number
  to: number
}

/**
 * Разбирает «Позвонить заказчику завтра в 7 вечера #срочно». Понимает: сегодня, завтра, послезавтра,
 * «через 3 дня», «через неделю», «в среду», «15 ноября», время «в 19:00», «в 7 вечера», теги через #.
 * Найденные слова из названия убираются. Если от названия ничего бы не осталось, текст не трогаем
 */
export function parseSmart(text: string, ctx: DateCtx): Smart {
  const raw = text.trim()
  const lower = raw.toLowerCase()
  const cuts: Cut[] = []
  const now = today(ctx)

  const tags: string[] = []
  for (const m of lower.matchAll(new RegExp(`${L}#([\\p{L}\\p{N}_-]+)`, 'gu'))) {
    tags.push(raw.slice(m.index! + 1, m.index! + m[0].length))
    cuts.push({ from: m.index!, to: m.index! + m[0].length })
  }

  let day: DayKey | null = null
  const take = (re: RegExp, pick: (m: RegExpExecArray) => DayKey | null): boolean => {
    const m = re.exec(lower)
    if (!m) return false
    const d = pick(m)
    if (d === null) return false
    day = d
    cuts.push({ from: m.index, to: m.index + m[0].length })
    return true
  }

  take(new RegExp(`${L}послезавтра${R}`, 'u'), () => addDays(now, 2)) ||
    take(new RegExp(`${L}завтра${R}`, 'u'), () => addDays(now, 1)) ||
    take(new RegExp(`${L}сегодня${R}`, 'u'), () => now) ||
    take(new RegExp(`${L}через\\s+(?:(\\d{1,3})\\s+)?(день|дня|дней|неделю|недели|недель)${R}`, 'u'), (m) => {
      const n = m[1] ? Number(m[1]) : 1
      return addDays(now, /^нед/.test(m[2]) ? n * 7 : n)
    }) ||
    take(new RegExp(`${L}(?:в|во|на)\\s+(${Object.keys(WEEKDAYS).join('|')})${R}`, 'u'), (m) => {
      const diff = (WEEKDAYS[m[1]] - dayOfWeek(now) + 7) % 7
      return addDays(now, diff === 0 ? 7 : diff)
    }) ||
    take(new RegExp(`${L}(\\d{1,2})\\s+(${MONTHS.join('|')})(?:\\s+(\\d{4}))?${R}`, 'u'), (m) => {
      const d = Number(m[1])
      const mo = MONTHS.indexOf(m[2]) + 1
      const thisYear = Number(now.slice(0, 4))
      if (m[3]) return validDay(Number(m[3]), mo, d) ? `${m[3]}-${pad(mo)}-${pad(d)}` : null
      for (const y of [thisYear, thisYear + 1]) {
        if (!validDay(y, mo, d)) continue
        const key = `${y}-${pad(mo)}-${pad(d)}`
        if (key >= now) return key
      }
      return null
    })

  let time: string | null = null
  const takeTime = (re: RegExp, pick: (m: RegExpExecArray) => string | null): boolean => {
    const m = re.exec(lower)
    if (!m) return false
    const t = pick(m)
    if (t === null) return false
    time = t
    cuts.push({ from: m.index, to: m.index + m[0].length })
    return true
  }

  takeTime(new RegExp(`${L}(?:в|к)\\s+(\\d{1,2}):(\\d{2})${R}`, 'u'), (m) => {
    const h = Number(m[1])
    const min = Number(m[2])
    return h <= 23 && min <= 59 ? `${pad(h)}:${m[2]}` : null
  }) ||
    takeTime(new RegExp(`${L}(?:в|к)\\s+(\\d{1,2})\\s*(утра|вечера|дня|ночи)${R}`, 'u'), (m) => {
      const h = hourWithPart(Number(m[1]), m[2])
      return h === null ? null : `${pad(h)}:00`
    }) ||
    takeTime(new RegExp(`${L}(?:в|к)\\s+(\\d{1,2})\\s*(?:часов|часа|час|ч)${R}`, 'u'), (m) => (Number(m[1]) <= 23 ? `${pad(Number(m[1]))}:00` : null))

  // Время без дня: сегодня, если оно ещё не прошло, иначе завтра
  if (time !== null && day === null) {
    const hhmm: string = time
    day = localToMs(now, hhmm, ctx.tz) > ctx.now ? now : addDays(now, 1)
  }

  // Убираем найденное из названия, начиная с конца, чтобы смещения не сбились
  let title = raw
  for (const c of [...cuts].sort((a, b) => b.from - a.from)) title = title.slice(0, c.from) + ' ' + title.slice(c.to)
  title = title.replace(/\s{2,}/g, ' ').trim()
  if (title === '') title = raw.replace(/\s{2,}/g, ' ')

  return { title, day, time, tags }
}
