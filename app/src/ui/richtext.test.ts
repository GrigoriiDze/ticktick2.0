// @vitest-environment happy-dom
import { readFileSync, existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Highlight from '@tiptap/extension-highlight'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { plainText } from '../domain/extras'
import { markdownExtension } from './markdown'

function make(md: string): Editor {
  return new Editor({
    extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3] }, link: { openOnClick: false } }), Highlight, TaskList, TaskItem.configure({ nested: true }), markdownExtension()],
    content: md,
    contentType: 'markdown',
  })
}

const roundtrip = (md: string) => make(md).getMarkdown()
/** Только буквы и цифры: разметка и знаки препинания при сравнении не важны, важно, чтобы ни одно слово не потерялось */
const letters = (s: string) => s.replace(/[^\p{L}\p{N}]+/gu, '')
const words = (s: string) => s.replace(/[\*_~`]/g, '').replace(/\s+/g, ' ').trim()

describe('описание задачи: markdown туда и обратно', () => {
  it('обычный текст с переносами строк не теряет ни слова', () => {
    const md = 'Первая строка\nвторая строка\n\nтретья после пустой'
    expect(words(roundtrip(md))).toBe(words(md))
    expect(roundtrip(md)).toContain('Первая строка')
  })

  it('чек-лист, маркированный и нумерованный списки', () => {
    expect(roundtrip('- [ ] замер\n- [x] смета')).toBe('- [ ] замер\n- [x] смета')
    expect(roundtrip('- один\n- два')).toBe('- один\n- два')
    expect(roundtrip('1. раз\n2. два')).toBe('1. раз\n2. два')
  })

  it('заголовок, жирный, курсив, ссылка', () => {
    expect(roundtrip('## Заголовок')).toBe('## Заголовок')
    expect(roundtrip('**жирный** и *курсив*')).toBe('**жирный** и *курсив*')
    expect(roundtrip('[сайт](https://example.com)')).toBe('[сайт](https://example.com)')
  })

  it('спецсимволы в тексте не накапливаются при повторных сохранениях', () => {
    const once = roundtrip('Позвонить +7 910 123-45-67, сайт https://example.com/x?a=1&b=2, 2*3 и a<b')
    expect(roundtrip(once)).toBe(once)
    expect(roundtrip(roundtrip(once))).toBe(once)
    // редактор показывает исходные символы, а не их кодировку
    const shown = make(once).getText()
    expect(shown).toContain('a=1&b=2')
    expect(shown).toContain('2*3')
    expect(shown).toContain('a<b')
  })

  it('пустое описание остаётся пустым', () => {
    expect(roundtrip('')).toBe('')
  })

  // Настоящие описания из TickTick лежат вне репозитория: путь передаётся переменной CONTENT_SAMPLES (JSON-массив строк)
  const file = process.env.CONTENT_SAMPLES ?? ''
  it.skipIf(!file || !existsSync(file))('все настоящие описания из TickTick сохраняют слова после туда-обратно', () => {
    const samples = JSON.parse(readFileSync(file, 'utf8')) as string[]
    const bad: string[] = []
    for (const s of samples) {
      const back = roundtrip(s)
      if (letters(plainText(back)) !== letters(s)) bad.push(`${JSON.stringify(s).slice(0, 120)} -> ${JSON.stringify(back).slice(0, 120)}`)
    }
    expect(bad).toEqual([])
  })
})
