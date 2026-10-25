export interface FoundPhone {
  /** Как написано в тексте */
  text: string
  /** Ссылка для звонка: tel:+79001234567 */
  href: string
}

// +7 или 8, потом 10 цифр с любыми пробелами, скобками и дефисами между ними
const RU_PHONE = /(?<![\d])(?:\+7|8|7)[\s\-().]*\d{3}[\s\-().]*\d{3}[\s\-.]*\d{2}[\s\-.]*\d{2}(?![\d])/g

/** Телефоны в тексте задачи (российский формат). Звонить можно прямо из карточки */
export function findPhones(text: string): FoundPhone[] {
  const seen = new Set<string>()
  const out: FoundPhone[] = []
  for (const m of text.matchAll(RU_PHONE)) {
    const digits = m[0].replace(/\D/g, '')
    if (digits.length !== 11) continue
    const href = `tel:+7${digits.slice(1)}`
    if (seen.has(href)) continue
    seen.add(href)
    out.push({ text: m[0].trim(), href })
  }
  return out
}
