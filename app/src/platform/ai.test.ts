import { describe, expect, it } from 'vitest'
import { aiReady, askAssistant, DEFAULT_AI, describeStatus } from './ai'

const settings = { ...DEFAULT_AI, key: ' sk-test ', model: 'openai/gpt-4o-mini', consent: true }
const reply = (body: unknown, status = 200) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch

describe('запрос к помощнику', () => {
  it('отправляет модель, сообщения и ключ, возвращает текст ответа', async () => {
    let seen: { url: string; init: RequestInit } | null = null
    const f = (async (url: string, init: RequestInit) => {
      seen = { url, init }
      return new Response(JSON.stringify({ choices: [{ message: { content: '  Сначала звонок.  ' } }] }), { status: 200 })
    }) as unknown as typeof fetch
    const text = await askAssistant({ ...settings, baseUrl: 'https://example.test/api/v1/' }, [{ role: 'user', content: 'что главное?' }], f)
    expect(text).toBe('Сначала звонок.')
    expect(seen!.url).toBe('https://example.test/api/v1/chat/completions')
    const body = JSON.parse(String(seen!.init.body))
    expect(body.model).toBe('openai/gpt-4o-mini')
    expect(body.messages).toEqual([{ role: 'user', content: 'что главное?' }])
    expect(body.max_tokens).toBeLessThanOrEqual(600)
    expect((seen!.init.headers as Record<string, string>).Authorization).toBe('Bearer sk-test')
  })

  it('коды сервиса и обрыв связи превращаются в понятные слова', async () => {
    await expect(askAssistant(settings, [], reply({}, 401))).rejects.toThrow('Ключ не подошёл')
    await expect(askAssistant(settings, [], reply({}, 402))).rejects.toThrow('закончились деньги')
    await expect(askAssistant(settings, [], reply({}, 429))).rejects.toThrow('подождите')
    await expect(askAssistant(settings, [], (async () => { throw new TypeError('fetch failed') }) as unknown as typeof fetch)).rejects.toThrow('Нет связи')
    await expect(askAssistant(settings, [], reply({ choices: [] }))).rejects.toThrow('пустой ответ')
    expect(describeStatus(503)).toContain('не отвечает')
  })

  it('без ключа или без согласия помощник не включается', () => {
    expect(aiReady(null)).toBe(false)
    expect(aiReady({ ...DEFAULT_AI, key: 'k' })).toBe(false)
    expect(aiReady({ ...DEFAULT_AI, consent: true })).toBe(false)
    expect(aiReady({ ...DEFAULT_AI, key: 'k', consent: true })).toBe(true)
  })
})
