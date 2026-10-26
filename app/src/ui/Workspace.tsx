import { useEffect, useMemo, useRef, useState } from 'react'
import { useModalStack } from './modal/useModalStack'
import { ModalContainer } from './modal/ModalContainer'
import { AppShell } from './shell/AppShell'
import { AppRouter } from './router/AppRouter'
import { useTaskActions } from './tasks/useTaskActions'
import { StorageService, STORAGE_KEYS } from '../platform/storage'
import type { User } from '../platform/auth'
import { CAL_VIEWS, DESKTOP_VIEWS, shiftAnchor, type CalView } from '../domain/calendar'
import { addDays, localToMs, matchesSmartList, SMART_LISTS, timeOf, today, type DayKey } from '../domain/dates'
import { hasTag, isExpired, tagCounts } from '../domain/extras'
import { GROUP_MODES, groupByMode, groupDone, groupTasks, type GroupMode } from '../domain/groups'
import { compareWaiting, isWaiting, waitingCount } from '../domain/waiting'
import { orderBetween } from '../domain/order'
import { isSite } from '../domain/sites'
import type { Quadrant } from '../domain/matrix'
import { INBOX_ID, type Project, type Task } from '../domain/types'
import type { QuickAddRequest } from './Calendar'
import type { ProjectInfo } from './Desk'
import { sectionsByDay } from '../domain/deskboard'
import { useWide } from './useWide'
import { checkForUpdate } from '../platform/updates'
import { DEFAULT_COLUMNS, buildBoard, orderAt } from '../domain/kanban'
import { ReminderPopups } from './ReminderPopups'
import { copyOfProject, copyOfTask } from '../domain/duplicate'
import { listAsHtml, listAsText } from '../domain/print'
import { nextSortOrder } from '../domain/sidebar'
import { tabOf, type Tab } from './TabBar'
import type { PopItem } from './PopMenu'
import { compareFor, SORT_MODES, type SortMode, type SortOrder } from '../domain/sort'
import { FilterIcon, PrintIcon, SearchIcon } from './icons'
import { canShare, shareText } from '../platform/share'
import { getMenuLists, getTaskMode, type MenuListId, type TaskViewMode } from '../platform/theme'
import { useDateCtx } from './useNow'
import { useReminders } from './useReminders'
import { useWorkspace } from './useWorkspace'
import { DEFAULT_VIEW, loadView, saveView, viewTitle, type View } from './view'
import { DEFAULT_AI } from '../domain/assistant'

function loadGroup(): GroupMode {
  const v = StorageService.get<string>(STORAGE_KEYS.GROUP_MODE, 'none')
  return GROUP_MODES.some((m) => m.id === v) ? (v as GroupMode) : 'none'
}

function loadSort(): SortMode {
  const v = StorageService.get<string>(STORAGE_KEYS.SORT_MODE, 'date')
  return SORT_MODES.some((m) => m.id === v) ? (v as SortMode) : 'date'
}

function loadSortOrder(): SortOrder {
  const v = StorageService.get<string>(STORAGE_KEYS.SORT_ORDER, 'asc')
  return v === 'desc' ? 'desc' : 'asc'
}

function loadCalendar(day: DayKey): { view: CalView; anchor: DayKey } {
  const v = StorageService.get<string>(STORAGE_KEYS.CAL_VIEW, 'month')
  if ([...CAL_VIEWS, ...DESKTOP_VIEWS].some((x) => x.id === v)) {
    return { view: v as CalView, anchor: day }
  }
  return { view: 'month', anchor: day }
}

export function Workspace({ user }: { user: User }) {
  const {
    importBundle,
    projects,
    groups,
    columns,
    columnsRepo,
    countdowns,
    countdownsRepo,
    tasks,
    deleted,
    habits,
    checkins,
    tasksRepo,
    filesRepo,
    aiSettings,
    settingsRepo,
    projectsRepo,
    groupsRepo,
    habitsRepo,
    checkinsRepo,
  } = useWorkspace(user.uid)

  const ctx = useDateCtx()
  const wide = useWide()
  const { openModal, isModalOpen } = useModalStack()

  const [view, setView] = useState<View>(loadView)
  const [drawer, setDrawer] = useState(false)
  const [sideHidden, setSideHidden] = useState(false)

  const [smartBoardMode, setSmartBoardMode] = useState<'list' | 'board'>(() =>
    StorageService.get<'list' | 'board'>(STORAGE_KEYS.SMART_BOARD_MODE, 'list'),
  )
  const [calDone, setCalDone] = useState(() => StorageService.getBool(STORAGE_KEYS.CAL_SHOW_DONE, true))
  const [calSideOpen, setCalSideOpen] = useState(() => StorageService.getBool(STORAGE_KEYS.CAL_SIDE_OPEN, true))
  const [sortMode, setSortMode] = useState<SortMode>(loadSort)
  const [sortOrder, setSortOrder] = useState<SortOrder>(loadSortOrder)
  const [groupMode, setGroupMode] = useState<GroupMode>(loadGroup)
  const [taskMode, setTaskModeState] = useState<TaskViewMode>(getTaskMode)
  const [menuLists, setMenuListsState] = useState<MenuListId[]>(getMenuLists)
  const [cdEditing, setCdEditing] = useState<'new' | string | null>(null)
  const [undo, setUndo] = useState<{ key: number; run: () => void } | null>(null)
  const lastTasksView = useRef<View>(tabOf(view) === 'tasks' ? view : DEFAULT_VIEW)
  const [cal, setCal] = useState<{ view: CalView; anchor: DayKey }>(() =>
    loadCalendar(today({ now: Date.now(), tz: Intl.DateTimeFormat().resolvedOptions().timeZone })),
  )

  useEffect(() => {
    void checkForUpdate().catch(() => undefined)
  }, [])

  useEffect(() => saveView(view), [view])
  useEffect(() => StorageService.set(STORAGE_KEYS.CAL_VIEW, cal.view), [cal.view])

  useEffect(() => {
    if (tabOf(view) === 'tasks' && view.type !== 'matrix' && view.type !== 'countdown' && view.type !== 'search' && view.type !== 'assistant' && view.type !== 'pomo') {
      lastTasksView.current = view
    }
  }, [view])

  // Ctrl+K / Ctrl+F для быстрого поиска
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K' || e.key === 'f' || e.key === 'F')) {
        e.preventDefault()
        setView({ type: 'search' })
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [])

  // Свайп от левого края для открытия Drawer на мобильном
  useEffect(() => {
    if (wide || drawer) return
    let startX = 0
    let startY = 0
    let tracking = false

    const onTouchStart = (e: TouchEvent) => {
      const t = e.touches[0]
      if (!t) return
      if (t.clientX <= 32) {
        startX = t.clientX
        startY = t.clientY
        tracking = true
      }
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!tracking) return
      const t = e.touches[0]
      if (!t) return
      const dx = t.clientX - startX
      const dy = t.clientY - startY
      if (dx > 45 && Math.abs(dy) < 35) {
        tracking = false
        setDrawer(true)
      } else if (Math.abs(dy) > 35) {
        tracking = false
      }
    }

    const onTouchEnd = () => {
      tracking = false
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: true })
    window.addEventListener('touchend', onTouchEnd)
    window.addEventListener('touchcancel', onTouchEnd)
    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [wide, drawer])

  // Кнопка «Отменить» живёт 6 секунд
  useEffect(() => {
    if (!undo) return
    const id = window.setTimeout(() => setUndo(null), 6000)
    return () => window.clearTimeout(id)
  }, [undo])

  const offerUndo = (run: () => void) => setUndo({ key: Date.now(), run })

  // Действия над задачами через изолированный кастомный хук
  const { toggle, skip, duplicate, moveEvent, rowActions } = useTaskActions({
    tasksRepo,
    tasks,
    ctx,
    offerUndo,
    onOpenTask: (id) => openModal({ type: 'task-detail', taskId: id }),
    onOpenMenu: (t) => openModal({ type: 'task-menu', task: t }),
    onReschedule: (t) => openModal({ type: 'date-picker', taskId: t.id }),
  })

  useReminders(tasks, {
    onOpen: (id) => openModal({ type: 'task-detail', taskId: id }),
    onDone: (t) => toggle(t),
  })

  // Очистка старых задач из корзины (>30 дней)
  const purged = useRef(false)
  useEffect(() => {
    if (deleted === null || purged.current) return
    purged.current = true
    const old = deleted.filter((t) => t.deletedAt && isExpired(t.deletedAt.toMillis(), Date.now())).map((t) => t.id)
    if (old.length) void tasksRepo.purgeMany(old)
  }, [deleted, tasksRepo])

  const calView: CalView = wide
    ? (cal.view === 'list' ? 'month' : cal.view)
    : cal.view === 'agenda' || cal.view === 'weeks2' ? 'list' : cal.view

  const sortedProjects = useMemo(
    () => [...(projects ?? [])].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [projects],
  )

  const objectsCount = (projects ?? []).filter((p) => isSite(p) && !p.closed).length
  const tags = useMemo(() => tagCounts(tasks ?? []), [tasks])
  const waiting = useMemo(() => waitingCount(tasks ?? [], ctx), [tasks, ctx])

  const effectiveView: View =
    (view.type === 'project' && projects !== null && !projects.some((p) => p.id === view.id)) ||
    (view.type === 'objects' && projects !== null && objectsCount === 0) ||
    (view.type === 'waiting' && tasks !== null && waiting.total === 0) ||
    (view.type === 'tag' && tasks !== null && !tags.some((t) => t.tag.toLowerCase() === view.id.toLowerCase()))
      ? DEFAULT_VIEW
      : view

  const inView = useMemo(() => {
    const all = tasks ?? []
    if (effectiveView.type === 'objects' || effectiveView.type === 'trash' || effectiveView.type === 'calendar' || effectiveView.type === 'habits' || effectiveView.type === 'matrix' || effectiveView.type === 'countdown' || effectiveView.type === 'search' || effectiveView.type === 'assistant' || effectiveView.type === 'pomo' || effectiveView.type === 'settings') return []
    if (effectiveView.type === 'waiting') return all.filter(isWaiting)
    if (effectiveView.type === 'tag') return all.filter((t) => t.status === 'open' && hasTag(t.tags, effectiveView.id))
    return effectiveView.type === 'smart'
      ? all.filter((t) => matchesSmartList(effectiveView.id, t, ctx))
      : all.filter((t) => t.projectId === effectiveView.id && t.status === 'open')
  }, [tasks, effectiveView, ctx])

  const sorted = useMemo(
    () =>
      effectiveView.type === 'smart' && (effectiveView.id === 'done' || effectiveView.id === 'wontdo')
        ? [...inView].sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0))
        : effectiveView.type === 'waiting'
          ? [...inView].sort((a, b) => compareWaiting(a, b, ctx))
          : [...inView].sort(compareFor(sortMode, sortOrder, ctx)),
    [inView, effectiveView, ctx, sortMode, sortOrder],
  )

  const counts = useMemo(() => {
    const all = tasks ?? []
    const c: Record<string, number> = {}
    for (const l of SMART_LISTS) {
      if (l.id !== 'done') c[`smart:${l.id}`] = all.filter((t) => matchesSmartList(l.id, t, ctx)).length
    }
    for (const t of all) if (t.status === 'open') c[`project:${t.projectId}`] = (c[`project:${t.projectId}`] ?? 0) + 1
    return c
  }, [tasks, ctx])

  const currentProject = effectiveView.type === 'project' ? (projects ?? []).find((p) => p.id === effectiveView.id) ?? null : null
  const hasListMenu = effectiveView.type === 'smart' || effectiveView.type === 'project' || effectiveView.type === 'tag'

  const listMenuItems: PopItem[] = [
    { key: 'search', title: 'Поиск', icon: <SearchIcon size={20} />, onPick: () => setView({ type: 'search' }) },
    { key: 'sort-group', title: 'Сортировка и группировка...', icon: <FilterIcon size={20} />, onPick: () => openModal({ type: 'sort-group' }) },
    ...SORT_MODES.map((m) => ({
      key: m.id,
      title: m.title,
      checked: sortMode === m.id,
      onPick: () => {
        setSortMode(m.id)
        StorageService.set(STORAGE_KEYS.SORT_MODE, m.id)
      },
    })),
    ...GROUP_MODES.map((m) => ({
      key: `group-${m.id}`,
      title: m.id === 'none' ? m.title : `Группировать ${m.title.toLowerCase()}`,
      checked: m.id !== 'none' && groupMode === m.id,
      onPick: () => {
        setGroupMode(m.id)
        StorageService.set(STORAGE_KEYS.GROUP_MODE, m.id)
      },
    })),
    ...(effectiveView.type === 'smart' && (effectiveView.id === 'today' || effectiveView.id === 'week')
      ? [
          {
            key: 'view-list',
            title: 'Вид: список',
            checked: smartBoardMode === 'list',
            onPick: () => {
              setSmartBoardMode('list')
              StorageService.set(STORAGE_KEYS.SMART_BOARD_MODE, 'list')
            },
          },
          {
            key: 'view-board',
            title: 'Вид: доска',
            checked: smartBoardMode === 'board',
            onPick: () => {
              setSmartBoardMode('board')
              StorageService.set(STORAGE_KEYS.SMART_BOARD_MODE, 'board')
            },
          },
        ]
      : []),
    ...(currentProject
      ? [
          { key: 'view-list', title: 'Вид: список', checked: currentProject.viewMode !== 'kanban', onPick: () => setViewMode('list') },
          { key: 'view-kanban', title: 'Вид: канбан', checked: currentProject.viewMode === 'kanban', onPick: () => setViewMode('kanban') },
        ]
      : []),
    { key: 'print', title: 'Печать', icon: <PrintIcon size={20} />, onPick: () => printList(viewTitle(effectiveView, sortedProjects), sorted) },
    ...(currentProject ? [{ key: 'settings', title: 'Настройки списка', onPick: () => openModal({ type: 'project-sheet', projectId: currentProject.id }) }] : []),
  ]

  function setViewMode(mode: 'list' | 'kanban') {
    if (!currentProject) return
    void projectsRepo.update(currentProject.id, { viewMode: mode })
    if (mode === 'kanban' && !(columns ?? []).some((c) => c.projectId === currentProject.id)) {
      DEFAULT_COLUMNS.forEach((name, i) => void columnsRepo.create({ projectId: currentProject.id, name, sortOrder: (i + 1) * 1024 }))
    }
  }

  function moveCard(taskId: string, columnId: string | null, index: number) {
    if (!currentProject) return
    const board = buildBoard(currentProject.id, tasks ?? [], columns ?? [])
    const lane = columnId === null ? board.none : board.columns.find((c) => c.column.id === columnId)?.tasks ?? []
    void tasksRepo.update(taskId, { columnId, sortOrder: orderAt(lane.filter((t) => t.id !== taskId), index) })
  }

  function deleteColumn(id: string) {
    for (const t of tasks ?? []) if (t.columnId === id) void tasksRepo.update(t.id, { columnId: null })
    void columnsRepo.softDelete(id)
  }

  async function createProject(name: string) {
    const id = await projectsRepo.create({ name, sortOrder: nextSortOrder(projects ?? [], groups ?? []) })
    setView({ type: 'project', id })
  }

  function deleteProject(id: string) {
    for (const t of tasks ?? []) if (t.projectId === id) void tasksRepo.softDelete(t.id)
    void projectsRepo.softDelete(id)
    setView(DEFAULT_VIEW)
  }

  async function duplicateProject(p: Project) {
    const id = await projectsRepo.create({ ...copyOfProject(p), sortOrder: nextSortOrder(projects ?? [], groups ?? []) })
    const own = (tasks ?? []).filter((t) => t.projectId === p.id && t.status === 'open' && t.parentId === null).sort((a, b) => a.sortOrder - b.sortOrder)
    let order: number | null = null
    for (const t of own) {
      order = orderBetween(order, null)
      await tasksRepo.create({ ...copyOfTask(t, { keepDate: false, projectId: id, columnId: null }), sortOrder: order })
    }
    setView({ type: 'project', id })
  }

  function printList(title: string, list: Task[]) {
    if (canShare()) {
      void shareText(title, listAsText(title, list, ctx)).catch(() => undefined)
      return
    }
    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(listAsHtml(title, list, ctx))
    w.document.close()
    w.focus()
    w.print()
  }

  function selectTab(tab: Tab) {
    if (tab === 'tasks') {
      const target = tabOf(lastTasksView.current) === 'tasks' ? lastTasksView.current : DEFAULT_VIEW
      setView(target)
    } else {
      setView({ type: tab })
    }
  }

  const defaultQuickDay = (): DayKey | null =>
    effectiveView.type === 'smart' && effectiveView.id === 'today'
      ? today(ctx)
      : effectiveView.type === 'smart' && effectiveView.id === 'tomorrow'
        ? addDays(today(ctx), 1)
        : null

  const slotRequest = (req: QuickAddRequest) =>
    openModal({
      type: 'quick-add',
      defaultDay: req.day,
      defaultTime: req.minutes === null ? null : `${String(Math.floor(req.minutes / 60)).padStart(2, '0')}:${String(req.minutes % 60).padStart(2, '0')}`,
    })

  const addInQuadrant = (title: string, quadrant: Quadrant) => {
    const urgent = quadrant === 'q1' || quadrant === 'q3'
    const last = (tasks ?? []).reduce((m, t) => Math.max(m, t.sortOrder), 0)
    void tasksRepo.create({
      title,
      projectId: INBOX_ID,
      priority: quadrant === 'q1' || quadrant === 'q2' ? 3 : 0,
      content: '',
      sortOrder: orderBetween(last || null, null),
      isAllDay: false,
      timeZone: null,
      due: urgent ? today(ctx) : null,
      repeat: null,
      repeatFrom: 'due',
      reminders: {},
    })
  }

  const moveQuadrant = (taskId: string, target: Quadrant) => {
    const urgent = target === 'q1' || target === 'q3'
    void tasksRepo.update(taskId, {
      priority: target === 'q1' || target === 'q2' ? 3 : 0,
      due: urgent ? today(ctx) : null,
    })
  }

  const moveToDay = (taskId: string, day: DayKey) => {
    const t = (tasks ?? []).find((x) => x.id === taskId)
    if (!t) return
    const time = typeof t.due === 'number' ? timeOf(t.due, ctx.tz) : null
    const due = time ? localToMs(day, time, ctx.tz) : day
    void tasksRepo.update(taskId, { due })
  }

  const isDoneList = effectiveView.type === 'smart' && (effectiveView.id === 'done' || effectiveView.id === 'wontdo')
  const listGroups = isDoneList
    ? groupDone(sorted, ctx)
    : groupMode !== 'none'
      ? groupByMode(groupMode, sorted, ctx)
      : wide && effectiveView.type === 'smart' && effectiveView.id === 'all'
        ? sectionsByDay(sorted, ctx)
        : effectiveView.type === 'smart'
          ? groupTasks(effectiveView.id, sorted, ctx)
          : null

  const empty = sorted.length === 0
  const tasksSection = wide && ['smart', 'project', 'tag', 'objects', 'waiting', 'trash'].includes(effectiveView.type)
  const showSide = tasksSection && !sideHidden
  const deskBoard = wide && smartBoardMode === 'board' && effectiveView.type === 'smart' && (effectiveView.id === 'today' || effectiveView.id === 'week')
  const kanbanHere = effectiveView.type === 'project' && currentProject?.viewMode === 'kanban'
  const boardLayout = deskBoard || kanbanHere
  const projectInfo = useMemo<ProjectInfo>(
    () => Object.fromEntries(sortedProjects.map((p) => [p.id, { name: p.name, color: p.color && /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : null }])),
    [sortedProjects],
  )

  const colors = useMemo(() => {
    const palette = ['#4772FA', '#E5484D', '#2FAA6B', '#F5A623', '#8A63E6', '#2BB0B0', '#D6559D']
    const out: Record<string, string> = {}
    sortedProjects.forEach((p, i) => {
      out[p.id] = p.color && /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : palette[i % palette.length]
    })
    return out
  }, [sortedProjects])

  return (
    <>
      <AppShell
        wide={wide}
        effectiveView={effectiveView}
        lastTasksView={lastTasksView.current}
        user={user}
        ctx={ctx}
        drawer={drawer}
        setDrawer={setDrawer}
        sideHidden={sideHidden}
        setSideHidden={setSideHidden}
        showSide={showSide}
        boardLayout={boardLayout}
        tasksSection={tasksSection}
        onSelectView={setView}
        onSelectTab={selectTab}
        onOpenSettings={() => openModal({ type: 'settings' })}
        sortedProjects={sortedProjects}
        groups={groups ?? []}
        counts={counts}
        objectsCount={objectsCount}
        tags={tags}
        waiting={waiting}
        trashCount={deleted?.length ?? 0}
        menuLists={menuLists}
        onCreateProject={(name) => void createProject(name)}
        onCreateGroup={(name) => void groupsRepo.create({ name, sortOrder: nextSortOrder([], groups ?? []) })}
        onRenameGroup={(id, name) => void groupsRepo.update(id, { name })}
        onDeleteGroup={(id) => void groupsRepo.softDelete(id)}
        onToggleGroup={(id, collapsed) => void groupsRepo.update(id, { collapsed })}
        onMoveToGroup={(projectId, groupId) => void projectsRepo.update(projectId, { groupId })}
        cal={cal}
        calView={calView}
        calDone={calDone}
        calSideOpen={calSideOpen}
        setCal={setCal}
        setCalDone={setCalDone}
        setCalSideOpen={setCalSideOpen}
        onShiftCal={(dir) => setCal((c) => ({ ...c, anchor: shiftAnchor(calView, c.anchor, dir) }))}
        onTodayCal={() => setCal((c) => ({ ...c, anchor: today(ctx) }))}
        hasListMenu={hasListMenu}
        onOpenListMenu={() => openModal({ type: 'list-menu', items: listMenuItems, label: 'Меню списка' })}
        currentProject={currentProject}
        smartBoardMode={smartBoardMode}
        onToggleBoardMode={() => {
          if (effectiveView.type === 'smart') {
            const next = smartBoardMode === 'board' ? 'list' : 'board'
            setSmartBoardMode(next)
            StorageService.set(STORAGE_KEYS.SMART_BOARD_MODE, next)
          } else if (currentProject) {
            setViewMode(currentProject.viewMode === 'kanban' ? 'list' : 'kanban')
          }
        }}
        onOpenQuickAdd={() => openModal({ type: 'quick-add', defaultDay: defaultQuickDay() })}
        onOpenCountdownAdd={() => setCdEditing('new')}
        moreOpen={isModalOpen('more-sheet')}
        undo={undo}
        setUndo={setUndo}
      >
        <AppRouter
          effectiveView={effectiveView}
          wide={wide}
          ctx={ctx}
          tasks={tasks}
          sorted={sorted}
          listGroups={listGroups}
          empty={empty}
          projects={projects}
          sortedProjects={sortedProjects}
          groups={groups}
          columns={columns}
          colors={colors}
          columnsRepo={columnsRepo}
          tasksRepo={tasksRepo}
          projectsRepo={projectsRepo}
          groupsRepo={groupsRepo}
          checkins={checkins}
          checkinsRepo={checkinsRepo}
          habits={habits}
          habitsRepo={habitsRepo}
          countdowns={countdowns}
          countdownsRepo={countdownsRepo}
          smartBoardMode={smartBoardMode}
          currentProject={currentProject}
          rowActions={rowActions}
          projectInfo={projectInfo}
          cal={cal}
          calView={calView}
          calDone={calDone}
          calSideOpen={calSideOpen}
          onAnchorChange={(day) => setCal((c) => ({ ...c, anchor: day }))}
          onCalViewChange={(v) => setCal((c) => ({ ...c, view: v }))}
          onSlotRequest={slotRequest}
          onMoveEvent={moveEvent}
          onMoveToDay={moveToDay}
          onAddTask={(projId, colId, day) =>
            openModal({
              type: 'quick-add',
              defaultProjectId: projId,
              columnId: colId,
              defaultDay: day ?? defaultQuickDay(),
            })
          }
          onPostponeOverdue={(overdue) => void tasksRepo.batchUpdate(overdue.map((t) => t.id), { due: today(ctx) })}
          onMoveCard={moveCard}
          onDeleteColumn={deleteColumn}
          onAddQuadrantTask={addInQuadrant}
          onMoveQuadrant={moveQuadrant}
          onViewChange={setView}
          user={user}
          importBundle={importBundle}
          menuLists={menuLists}
          setMenuListsState={setMenuListsState}
          setTaskModeState={setTaskModeState}
          lastTasksView={lastTasksView.current}
          deskBoard={deskBoard}
          deleted={deleted}
          aiSettings={aiSettings ?? DEFAULT_AI}
          settingsRepo={settingsRepo}
          cdEditing={cdEditing}
          setCdEditing={setCdEditing}
        />
      </AppShell>

      <ModalContainer
        tasks={tasks}
        projects={sortedProjects}
        groups={groups ?? []}
        tags={tags}
        ctx={ctx}
        user={user}
        wide={wide}
        taskMode={taskMode}
        tasksRepo={tasksRepo}
        projectsRepo={projectsRepo}
        filesRepo={filesRepo}
        groupMode={groupMode}
        sortMode={sortMode}
        sortOrder={sortOrder}
        setGroupMode={setGroupMode}
        setSortMode={setSortMode}
        setSortOrder={setSortOrder}
        onToggle={toggle}
        onSkip={skip}
        onDuplicate={(t) => void duplicate(t)}
        onDuplicateProject={(p) => void duplicateProject(p)}
        onDeleteProject={deleteProject}
        importBundle={importBundle}
        menuLists={menuLists}
        setMenuListsState={setMenuListsState}
        setTaskModeState={setTaskModeState}
        onViewChange={setView}
        trashCount={deleted?.length ?? 0}
      />

      <ReminderPopups tasks={tasks} onOpen={(id) => openModal({ type: 'task-detail', taskId: id })} onDone={toggle} />
    </>
  )
}

