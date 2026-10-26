import type { ReactNode } from 'react'
import type { DateCtx, DayKey } from '../../domain/dates'
import { today } from '../../domain/dates'
import { orderBetween } from '../../domain/order'
import type { BoardColumn, Countdown, Habit, HabitCheckin, Project, ProjectGroup, SiteStage, Task } from '../../domain/types'
import type { Quadrant } from '../../domain/matrix'
import type { CalView } from '../../domain/calendar'
import type { QuickAddRequest } from '../Calendar'
import { CalendarView } from '../../features/calendar/CalendarView'
import { KanbanView } from '../../features/kanban/KanbanView'
import { Countdowns } from '../Countdowns'
import type { ProjectInfo } from '../Desk'
import { DeskBoard } from '../Desk'
import { Habits } from '../Habits'
import { Matrix } from '../Matrix'
import { ObjectsBoard } from '../ObjectsBoard'
import { Pomo } from '../Pomo'
import { SearchScreen } from '../SearchScreen'
import { Settings } from '../Settings'
import type { RowActions } from '../TaskList'
import { Empty, TaskList } from '../TaskList'
import { Trash } from '../Trash'
import { Assistant } from '../Assistant'
import type { View } from '../view'
import { boardByDay, boardByProject } from '../../domain/deskboard'
import { nextColumnOrder } from '../../domain/kanban'
import type { ColumnsRepo } from '../../data/columns'
import type { CountdownsRepo } from '../../data/countdowns'
import type { CheckinsRepo, HabitsRepo } from '../../data/habits'
import type { ProjectGroupsRepo } from '../../data/projectGroups'
import type { ProjectsRepo } from '../../data/projects'
import type { TasksRepo } from '../../data/tasks'
import type { SettingsRepo } from '../../data/settings'
import type { AiSettings } from '../../domain/assistant'
import type { MenuListId, TaskViewMode } from '../../platform/theme'
import { setMenuLists } from '../../platform/theme'
import type { User } from '../../platform/auth'
import { signOut } from '../../platform/auth'

export interface AppRouterProps {
  effectiveView: View
  wide: boolean
  ctx: DateCtx
  tasks: Task[] | null
  sorted: Task[]
  listGroups: any
  empty: boolean
  projects: Project[] | null
  sortedProjects: Project[]
  groups: ProjectGroup[] | null
  columns: BoardColumn[] | null
  colors?: Record<string, string>
  columnsRepo: ColumnsRepo
  tasksRepo: TasksRepo
  projectsRepo: ProjectsRepo
  groupsRepo: ProjectGroupsRepo
  checkins: HabitCheckin[] | null
  checkinsRepo: CheckinsRepo
  habits: Habit[] | null
  habitsRepo: HabitsRepo
  countdowns: Countdown[] | null
  countdownsRepo: CountdownsRepo
  smartBoardMode: 'list' | 'board'
  currentProject: Project | null
  rowActions: RowActions
  projectInfo: ProjectInfo
  cal: { view: CalView; anchor: DayKey }
  calView: CalView
  calDone: boolean
  calSideOpen: boolean
  onAnchorChange: (day: DayKey) => void
  onCalViewChange: (view: CalView) => void
  onSlotRequest: (req: QuickAddRequest) => void
  onMoveEvent: (taskId: string, day: DayKey, minutes: number) => void
  onMoveToDay: (taskId: string, day: DayKey) => void
  onAddTask: (projectId?: string, columnId?: string | null, day?: DayKey | null) => void
  onPostponeOverdue: (overdueTasks: Task[]) => void
  onMoveCard: (taskId: string, columnId: string | null, index: number) => void
  onDeleteColumn: (id: string) => void
  onAddQuadrantTask: (title: string, quadrant: Quadrant) => void
  onMoveQuadrant: (taskId: string, quadrant: Quadrant) => void
  onViewChange: (view: View) => void
  user: User
  importBundle: (bundle: any) => Promise<any>
  menuLists: MenuListId[]
  setMenuListsState: (ids: MenuListId[]) => void
  setTaskModeState: (mode: TaskViewMode) => void
  lastTasksView: View
  deskBoard: boolean
  deleted: Task[] | null
  aiSettings: AiSettings
  settingsRepo: SettingsRepo
  cdEditing: 'new' | string | null
  setCdEditing: (id: 'new' | string | null) => void
}

export function AppRouter(props: AppRouterProps): ReactNode {
  const {
    effectiveView,
    wide,
    ctx,
    tasks,
    sorted,
    listGroups,
    empty,
    sortedProjects,
    columns,
    colors,
    columnsRepo,
    tasksRepo,
    projectsRepo,
    checkins,
    checkinsRepo,
    habits,
    habitsRepo,
    countdowns,
    countdownsRepo,
    smartBoardMode,
    currentProject,
    rowActions,
    projectInfo,
    cal,
    calView,
    calDone,
    calSideOpen,
    onAnchorChange,
    onCalViewChange,
    onSlotRequest,
    onMoveEvent,
    onMoveToDay,
    onAddTask,
    onPostponeOverdue,
    onMoveCard,
    onDeleteColumn,
    onAddQuadrantTask,
    onMoveQuadrant,
    onViewChange,
    user,
    importBundle,
    menuLists,
    setMenuListsState,
    setTaskModeState,
    lastTasksView,
    deskBoard,
    deleted,
    aiSettings,
    settingsRepo,
    cdEditing,
    setCdEditing,
  } = props

  // 1. Поиск
  if (effectiveView.type === 'search') {
    return (
      <SearchScreen
        tasks={tasks ?? []}
        projects={sortedProjects}
        projectInfo={projectInfo}
        ctx={ctx}
        actions={rowActions}
        onOpenProject={(id) => onViewChange({ type: 'project', id })}
        onOpenTag={(tag) => onViewChange({ type: 'tag', id: tag })}
      />
    )
  }

  // 2. Ассистент
  if (effectiveView.type === 'assistant') {
    return (
      <Assistant
        tasks={tasks ?? []}
        projects={sortedProjects}
        ctx={ctx}
        settings={aiSettings}
        onSettings={(patch) => void settingsRepo.setAi(patch)}
      />
    )
  }

  // 3. Таймер Помодоро
  if (effectiveView.type === 'pomo') {
    return <Pomo tasks={tasks ?? []} actions={rowActions} />
  }

  // 4. Дни обратного отсчета
  if (effectiveView.type === 'countdown') {
    return (
      <Countdowns
        list={countdowns ?? []}
        today={today(ctx)}
        editing={cdEditing}
        onEdit={setCdEditing}
        onCreate={(name, date) => void countdownsRepo.create({ name, date })}
        onUpdate={(id, patch) => void countdownsRepo.update(id, patch)}
        onDelete={(id) => void countdownsRepo.softDelete(id)}
      />
    )
  }

  // 5. Матрица Эйзенхауэра
  if (effectiveView.type === 'matrix') {
    return (
      <Matrix
        tasks={tasks ?? []}
        ctx={ctx}
        onToggle={rowActions.toggle}
        onOpen={rowActions.open}
        onAdd={onAddQuadrantTask}
        onMoveQuadrant={onMoveQuadrant}
      />
    )
  }

  // 6. Привычки
  if (effectiveView.type === 'habits') {
    return (
      <Habits
        habits={habits ?? []}
        checkins={checkins ?? []}
        ctx={ctx}
        wide={wide}
        onCreate={(name, patch) => {
          const last = (habits ?? []).reduce((m, h) => Math.max(m, h.sortOrder), 0)
          const color = patch?.color || ['#7BC4FA', '#A0EFED', '#F18BEC', '#FF8585', '#6E81ED', '#F5C26B', '#8EDB8E', '#B79BFF'][(habits ?? []).length % 8]
          void habitsRepo.create({
            name,
            startDay: today(ctx),
            color,
            repeat: patch?.repeat ?? null,
            reminders: patch?.reminders ?? [],
            sortOrder: orderBetween(last || null, null),
          })
        }}
        onUpdate={(id, patch) => void habitsRepo.update(id, patch)}
        onArchive={(id, archived) => void habitsRepo.archive(id, archived)}
        onDelete={(id) => void habitsRepo.softDelete(id)}
        onSet={(habitId, day, status, note) => void (status ? checkinsRepo.set(habitId, day, status, note) : checkinsRepo.clear(habitId, day))}
      />
    )
  }

  // 7. Календарь
  if (effectiveView.type === 'calendar') {
    return (
      <CalendarView
        wide={wide}
        tasks={tasks ?? []}
        habits={habits ?? []}
        checkins={checkins ?? []}
        projects={sortedProjects}
        ctx={ctx}
        view={calView}
        anchor={cal.anchor}
        showDone={calDone}
        sideOpen={calSideOpen}
        colors={colors ?? {}}
        onAnchor={onAnchorChange}
        onView={onCalViewChange}
        onSlot={onSlotRequest}
        onMove={onMoveEvent}
        onMoveDay={onMoveToDay}
        actions={rowActions}
      />
    )
  }

  // 8. Настройки (мобильные)
  if (effectiveView.type === 'settings' && !wide) {
    return (
      <Settings
        menuLists={menuLists}
        onMenuLists={(ids) => (setMenuListsState(ids), setMenuLists(ids))}
        onImport={importBundle}
        email={user.email}
        onTaskMode={setTaskModeState}
        onSignOut={() => void signOut()}
        onClose={() => onViewChange(lastTasksView)}
      />
    )
  }

  // 9. Корзина
  if (effectiveView.type === 'trash') {
    return (
      <Trash
        tasks={deleted ?? []}
        now={ctx.now}
        onRestore={(id) => void tasksRepo.restore(id)}
        onPurge={(id) => void tasksRepo.purge(id)}
        onEmpty={() => void tasksRepo.purgeMany((deleted ?? []).map((t) => t.id))}
      />
    )
  }

  // 10. Объекты
  if (effectiveView.type === 'objects') {
    return (
      <ObjectsBoard
        projects={sortedProjects}
        tasks={tasks ?? []}
        ctx={ctx}
        onOpen={(id) => onViewChange({ type: 'project', id })}
        onMove={(id, stage: SiteStage) => void projectsRepo.setSiteField(id, 'stage', stage)}
      />
    )
  }

  // 11. Канбан-доска (мобильная: умные списки «Сегодня» или «Следующие 7 дней»)
  if (!wide && effectiveView.type === 'smart' && (effectiveView.id === 'today' || effectiveView.id === 'week') && smartBoardMode === 'board') {
    return (
      <KanbanView
        wide={false}
        mode="smart"
        smartId={effectiveView.id}
        tasks={sorted}
        projects={sortedProjects}
        columns={columns ?? []}
        ctx={ctx}
        actions={rowActions}
        onAddTask={onAddTask}
        onPostponeOverdue={onPostponeOverdue}
      />
    )
  }

  // 12. Десктопная доска умного списка
  if (deskBoard && tasks !== null) {
    return (
      <DeskBoard
        columns={effectiveView.type === 'smart' && effectiveView.id === 'week' ? boardByDay(sorted, ctx) : boardByProject(sorted, sortedProjects, ctx)}
        ctx={ctx}
        projects={projectInfo}
        showProject={true}
        onToggle={rowActions.toggle}
        onOpen={rowActions.open}
        onAdd={(projId, day) => onAddTask(projId ?? undefined, null, day)}
      />
    )
  }

  // 13. Канбан-доска проекта (адаптивная: десктопная или мобильная)
  if (effectiveView.type === 'project' && currentProject?.viewMode === 'kanban') {
    return (
      <KanbanView
        wide={wide}
        mode="project"
        projectId={currentProject.id}
        tasks={tasks ?? []}
        projects={sortedProjects}
        columns={columns ?? []}
        ctx={ctx}
        actions={rowActions}
        onAddColumn={(name) =>
          void columnsRepo.create({
            projectId: currentProject.id,
            name,
            sortOrder: nextColumnOrder((columns ?? []).filter((c) => c.projectId === currentProject.id)),
          })
        }
        onRenameColumn={(id, name) => void columnsRepo.update(id, { name })}
        onDeleteColumn={onDeleteColumn}
        onMoveCard={onMoveCard}
        onAddTask={(_projId, colId) => onAddTask(undefined, colId, null)}
      />
    )
  }

  // 15. Пустой список
  if (empty) {
    return <Empty title="Нет задач" hint="Добавьте первую кнопкой «+»" />
  }

  // 16. Обычный список задач (TaskList)
  return (
    <TaskList
      tasks={sorted}
      groups={listGroups}
      projects={wide && effectiveView.type !== 'project' ? projectInfo : undefined}
      ctx={ctx}
      listKey={effectiveView.type + (effectiveView.type === 'project' || effectiveView.type === 'smart' || effectiveView.type === 'tag' ? ':' + effectiveView.id : '')}
      actions={rowActions}
    />
  )
}
