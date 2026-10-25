import { describe, expect, it } from 'vitest'
import { needsRenumber, orderBetween, renumber } from './order'

describe('orderBetween', () => {
  it('пустой список', () => {
    expect(orderBetween(null, null)).toBe(1024)
  })
  it('в начало и в конец', () => {
    expect(orderBetween(null, 1024)).toBe(0)
    expect(orderBetween(1024, null)).toBe(2048)
  })
  it('между соседями', () => {
    expect(orderBetween(1024, 2048)).toBe(1536)
  })
  it('много вставок подряд в одно место остаются по порядку', () => {
    let lo = 1024
    const hi = 2048
    for (let i = 0; i < 40; i++) {
      const next = orderBetween(lo, hi)
      expect(next).toBeGreaterThan(lo)
      expect(next).toBeLessThan(hi)
      lo = next
    }
  })
})

describe('needsRenumber', () => {
  it('замечает, что числа сошлись', () => {
    expect(needsRenumber(1, 1 + Number.EPSILON)).toBe(true)
    expect(needsRenumber(1024, 2048)).toBe(false)
  })
})

describe('renumber', () => {
  it('раздаёт ровные числа с сохранением порядка', () => {
    const out = renumber([{ sortOrder: 5 }, { sortOrder: 5.0001 }, { sortOrder: 7 }])
    expect(out.map((o) => o.sortOrder)).toEqual([1024, 2048, 3072])
  })
})
