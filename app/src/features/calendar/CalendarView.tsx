import type { CalView } from '../../domain/calendar'
import type { DateCtx, DayKey } from '../../domain/dates'
import type { Habit, HabitCheckin, Project, Task } from '../../domain/types'
import type { QuickAddRequest } from '../../ui/Calendar'
import { Calendar } from '../../ui/Calendar'
import { CalendarDesktop } from '../../ui/CalendarDesktop'
import type { RowActions } from '../../ui/TaskList'

export interface CalendarViewProps {
  wide: boolean
  tasks: Task[]
  habits?: Habit[]
  checkins?: HabitCheckin[]
  projects?: Project[]
  ctx: DateCtx
  view: CalView
  anchor: DayKey
  showDone: boolean
  sideOpen?: boolean
  colors?: Record<string, string>
  onAnchor: (day: DayKey) => void
  onView: (v: CalView) => void
  onSlot: (req: QuickAddRequest) => void
  onMove?: (taskId: string, day: DayKey, minutes: number) => void
  onMoveDay?: (taskId: string, day: DayKey) => void
  actions: RowActions
}

/** Адаптивный календарь: переключается между десктопным и мобильным видом */
export function CalendarView(props: CalendarViewProps) {
  if (props.wide) {
    return (
      <CalendarDesktop
        tasks={props.tasks}
        habits={props.habits}
        checkins={props.checkins}
        projects={props.projects}
        ctx={props.ctx}
        view={props.view}
        anchor={props.anchor}
        showDone={props.showDone}
        sideOpen={props.sideOpen}
        colors={props.colors ?? {}}
        onAnchor={props.onAnchor}
        onView={props.onView}
        onSlot={props.onSlot}
        onMove={props.onMove}
        onMoveDay={props.onMoveDay ?? (() => {})}
        actions={props.actions}
      />
    )
  }

  return (
    <Calendar
      tasks={props.tasks}
      habits={props.habits}
      ctx={props.ctx}
      view={props.view}
      anchor={props.anchor}
      showDone={props.showDone}
      colors={props.colors}
      onAnchor={props.onAnchor}
      onView={props.onView}
      onSlot={props.onSlot}
      onMove={props.onMove}
      actions={props.actions}
    />
  )
}

