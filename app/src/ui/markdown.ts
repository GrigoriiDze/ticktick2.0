import { marked } from 'marked'
import { Markdown } from '@tiptap/markdown'

// Голый адрес в тексте не превращаем в ссылку при чтении: библиотека кладёт в подпись экранированный текст
// («&amp;» вместо «&»), и описание портилось бы после первой правки. Обычные ссылки в скобках работают
marked.use({ gfm: true, breaks: true, tokenizer: { url: () => undefined } })

/** Расширение редактора: описание хранится обычным markdown, перенос строки внутри абзаца остаётся переносом */
export const markdownExtension = () => Markdown.configure({ marked })
