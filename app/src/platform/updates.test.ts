import { describe, expect, it } from 'vitest'
import { isNewer, parseUpdate } from './updates'

describe('обновления приложения', () => {
  it('сравнивает номер сборки, а не название', () => {
    expect(isNewer({ versionCode: 3 }, { versionCode: 2 })).toBe(true)
    expect(isNewer({ versionCode: 2 }, { versionCode: 2 })).toBe(false)
    expect(isNewer({ versionCode: 1 }, { versionCode: 2 })).toBe(false)
    expect(isNewer({ versionCode: NaN }, { versionCode: 2 })).toBe(false)
  })
  it('принимает ответ с нужными полями', () => {
    expect(parseUpdate({ versionCode: 3, versionName: '1.2', apk: 'https://x.web.app/a.apk', notes: 'Канбан' })).toEqual({ versionCode: 3, versionName: '1.2', apk: 'https://x.web.app/a.apk', notes: 'Канбан' })
    expect(parseUpdate({ versionCode: 3, apk: 'https://x.web.app/a.apk' })).toMatchObject({ versionName: '3', notes: '' })
  })
  it('мусор, чужая схема и ссылка не по https отвергаются', () => {
    expect(parseUpdate(null)).toBeNull()
    expect(parseUpdate('x')).toBeNull()
    expect(parseUpdate({ versionCode: 'abc', apk: 'https://x/a.apk' })).toBeNull()
    expect(parseUpdate({ versionCode: 3 })).toBeNull()
    expect(parseUpdate({ versionCode: 3, apk: 'http://x/a.apk' })).toBeNull()
    expect(parseUpdate({ versionCode: 3, apk: 'javascript:alert(1)' })).toBeNull()
  })
});
