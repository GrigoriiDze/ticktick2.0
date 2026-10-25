import { daysLeft } from '../domain/extras'
import { plural } from '../domain/sites'
import type { Task } from '../domain/types'

interface Props {
  tasks: Task[]
  now: number
  onRestore: (id: string) => void
  onPurge: (id: string) => void
  onEmpty: () => void
}

/** Удалённые задачи хранятся 30 дней, потом исчезают сами */
export function Trash({ tasks, now, onRestore, onPurge, onEmpty }: Props) {
  const sorted = [...tasks].sort((a, b) => (b.deletedAt?.toMillis() ?? 0) - (a.deletedAt?.toMillis() ?? 0))
  if (sorted.length === 0) return <p className="muted">Корзина пуста</p>

  return (
    <>
      <ul className="tasks">
        {sorted.map((t) => {
          const left = daysLeft(t.deletedAt?.toMillis() ?? now, now)
          return (
            <li key={t.id}>
              <span className="row-main static">
                <span className="title">{t.title}</span>
                <span className="due">
                  {left === 0 ? 'Удалится сегодня' : `Осталось ${left} ${plural(left, ['день', 'дня', 'дней'])}`}
                </span>
              </span>
              <button className="ghost" onClick={() => onRestore(t.id)}>
                Вернуть
              </button>
              <button className="ghost danger" onClick={() => onPurge(t.id)} aria-label="Удалить навсегда">
                ×
              </button>
            </li>
          )
        })}
      </ul>
      <button
        className="ghost danger empty-trash"
        onClick={() => window.confirm(`Удалить навсегда ${sorted.length} ${plural(sorted.length, ['задачу', 'задачи', 'задач'])}?`) && onEmpty()}
      >
        Очистить корзину
      </button>
    </>
  )
}
