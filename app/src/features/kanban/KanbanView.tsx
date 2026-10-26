import type { DateCtx, DayKey } from '../../domain/dates'
import type { BoardColumn, Project, Task } from '../../domain/types'
import { Kanban } from '../../ui/Kanban'
import { MobileBoard } from '../../ui/MobileBoard'
import type { RowActions } from '../../ui/TaskList'

export interface KanbanViewProps {
  wide: boolean
  mode: 'smart' | 'project'
  smartId?: 'today' | 'week'
  projectId?: string
  tasks: Task[]
  projects: Project[]
  columns: BoardColumn[]
  ctx: DateCtx
  actions: RowActions
  onAddColumn?: (name: string) => void
  onRenameColumn?: (id: string, name: string) => void
  onDeleteColumn?: (id: string) => void
  onMoveCard?: (taskId: string, columnId: string | null, index: number) => void
  onAddTask: (projectId?: string, columnId?: string | null, day?: DayKey | null) => void
  onPostponeOverdue?: (tasks: Task[]) => void
}

/** Адаптивная Канбан-доска: переключается между десктопным и мобильным представлением */
export function KanbanView(props: KanbanViewProps) {
  if (props.wide && props.mode === 'project' && props.projectId) {
    return (
      <Kanban
        wide={props.wide}
        projectId={props.projectId}
        tasks={props.tasks}
        columns={props.columns}
        ctx={props.ctx}
        onToggle={props.actions.toggle}
        onOpen={props.actions.open}
        onAddTask={(colId) => props.onAddTask(props.projectId, colId, null)}
        onMove={props.onMoveCard ?? (() => {})}
        onAddColumn={props.onAddColumn ?? (() => {})}
        onRenameColumn={props.onRenameColumn ?? (() => {})}
        onDeleteColumn={props.onDeleteColumn ?? (() => {})}
      />
    )
  }

  return (
    <MobileBoard
      mode={props.mode}
      smartId={props.smartId}
      projectId={props.projectId}
      tasks={props.tasks}
      projects={props.projects}
      columns={props.columns}
      ctx={props.ctx}
      actions={props.actions}
      onAddColumn={props.onAddColumn}
      onRenameColumn={props.onRenameColumn}
      onDeleteColumn={props.onDeleteColumn}
      onMoveCard={props.onMoveCard}
      onAddTask={props.onAddTask}
      onPostponeOverdue={props.onPostponeOverdue}
    />
  )
}

