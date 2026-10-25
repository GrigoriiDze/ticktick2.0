import { formatSize, isImage, type TaskFile } from '../domain/files'

interface Props {
  files: TaskFile[]
  /** Что сейчас происходит: «Загружаю…» или ошибка словами */
  status: string | null
  onOpen: (file: TaskFile) => void
  onRemove: (file: TaskFile) => void
}

const Clip = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 11.5l-7.6 7.6a5 5 0 0 1-7-7l8-8a3.4 3.4 0 0 1 4.8 4.8l-8 8a1.7 1.7 0 0 1-2.4-2.4l7.4-7.4" />
  </svg>
)

/** Файлы задачи: имя, размер, нажатие открывает, крестик удаляет */
export function Attachments({ files, status, onOpen, onRemove }: Props) {
  if (files.length === 0 && !status) return null
  return (
    <div className="attachments">
      {files.map((f) => (
        <div key={f.id} className="att-row">
          <button className="att-open" onClick={() => onOpen(f)} aria-label={`Открыть файл ${f.name}`}>
            <Clip />
            <span className="att-name">{f.name}</span>
            <span className="att-size">
              {isImage(f.type) ? 'фото, ' : ''}
              {formatSize(f.size)}
            </span>
          </button>
          <button className="ghost att-del" onClick={() => onRemove(f)} aria-label={`Удалить файл ${f.name}`}>
            ×
          </button>
        </div>
      ))}
      {status && <p className="muted att-status">{status}</p>}
    </div>
  )
}
