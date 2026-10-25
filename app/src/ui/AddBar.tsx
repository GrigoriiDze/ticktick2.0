import { useState, type FormEvent } from 'react'

interface Props {
  /** Название списка, в который попадёт задача */
  target: string
  onAdd: (text: string) => void
}

/** Строка добавления над списком на большом экране: печатаешь, Enter, задача в списке. Дату можно написать словами */
export function AddBar({ target, onAdd }: Props) {
  const [text, setText] = useState('')
  function submit(e: FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    onAdd(text)
    setText('')
  }
  return (
    <form className="addbar" onSubmit={submit}>
      <span className="addbar-plus" aria-hidden="true">
        +
      </span>
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Добавить задачу в «${target}»`} aria-label="Новая задача" enterKeyHint="done" />
    </form>
  )
}
