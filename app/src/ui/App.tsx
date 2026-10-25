import { useEffect, useMemo, useRef, useState } from 'react'
import {
  signOut,
  watchUser,
  type User,
} from '../platform/auth'
import { SignIn, Splash } from './SignIn'
import { CAL_VIEWS, DESKTOP_VIEWS, shiftAnchor, type CalView } from '../domain/calendar'
import { parseSmart } from '../domain/smartdate'
import { addDays, localToMs, matchesSmartList, SMART_LISTS, timeOf, today, type DayKey } from '../domain/dates'
import { hasTag, isExpired, normalizeTag, plainText, tagCounts } from '../domain/extras'
import { AT_TIME, datePatchOf, dateValueOf, describeDateValue, EMPTY_DATE } from '../domain/datevalue'
import { GROUP_MODES, groupByMode, groupDone, groupTasks, type GroupMode } from '../domain/groups'
import { compareWaiting, isWaiting, waitingCount } from '../domain/waiting'
import { orderBetween } from '../domain/order'
import { nextOccurrence } from '../domain/repeat'
import { isSite } from '../domain/sites'
import { type Project, type SiteStage, type Task } from '../domain/types'
import { Calendar, CalendarHeader, type QuickAddRequest } from './Calendar'
import { CalendarDesktop, DeskCalHeader } from './CalendarDesktop'
import { AddBar } from './AddBar'
import { DeskBoard, type ProjectInfo } from './Desk'
import { boardByDay, boardByProject, sectionsByDay } from '../domain/deskboard'
import { EmptyPane } from './EmptyPane'
import { Rail, type RailItem } from './Rail'
import { useWide } from './useWide'
import { Drawer } from './Drawer'
import { checkForUpdate, type UpdateInfo } from '../platform/updates'
import { Kanban } from './Kanban'
import { useExit } from './useExit'
import { Matrix } from './Matrix'
import { Countdowns } from './Countdowns'
import { buildBoard, DEFAULT_COLUMNS, nextColumnOrder, orderAt } from '../domain/kanban'
import { Habits } from './Habits'
import { MoreSheet } from './MoreSheet'
import { HistorySheet } from './HistorySheet'
import { ReminderPopups } from './ReminderPopups'
import { notificationsSupported } from '../platform/notifications'
import { copyOfProject, copyOfTask } from '../domain/duplicate'
import { listAsHtml, listAsText } from '../domain/print'
import type { TaskFile } from '../domain/files'
import { openFile, prepareUpload } from '../platform/files'
import { Settings } from './Settings'
import { SettingsDesktop } from './SettingsDesktop'
import { nextSortOrder } from '../domain/sidebar'
import { TabBar, tabOf, type Tab } from './TabBar'
import { TaskQuickAdd, type QuickTask } from './TaskQuickAdd'
import { ObjectsBoard } from './ObjectsBoard'
import { ProjectSheet } from './ProjectSheet'
import { TaskList, Empty, type RowActions } from './TaskList'
import { TaskMenu } from './TaskMenu'
import { DatePicker } from './DatePicker'
import { PopMenu, type PopItem } from './PopMenu'
import { compareFor, SORT_MODES, type SortMode } from '../domain/sort'
import { SearchScreen } from './SearchScreen'
import { Assistant } from './Assistant'
import { PrintIcon, SearchIcon, UndoIcon } from './icons'
import { canShare, shareText } from '../platform/share'
import { getMenuLists, getTaskMode, setMenuLists, type MenuListId, type TaskViewMode } from '../platform/theme'
import { TaskSheet } from './TaskSheet'
import { Trash } from './Trash'
import { useDateCtx } from './useNow'
import { useReminders } from './useReminders'
import { useWorkspace } from './useWorkspace'
import { DEFAULT_VIEW, loadView, projectForNew, saveView, viewKey, viewTitle, type View } from './view'

const GROUP_KEY = 'group-mode'

function loadGroup(): GroupMode {
  try {
    const v = localStorage.getItem(GROUP_KEY)
    if (GROUP_MODES.some((m) => m.id === v)) return v as GroupMode
  } catch {
    // хранилище недоступно
  }
  return 'none'
}

const SORT_KEY = 'sort-mode'

function loadSort(): SortMode {
  try {
    const v = localStorage.getItem(SORT_KEY)
    if (SORT_MODES.some((m) => m.id === v)) return v as SortMode
  } catch {
    // хранилище недоступно
  }
  return 'date'
}

const CAL_KEY = 'calendar-view'

function loadCalendar(day: DayKey): { view: CalView; anchor: DayKey } {
  try {
    const v = localStorage.getItem(CAL_KEY)
    if ([...CAL_VIEWS, ...DESKTOP_VIEWS].some((x) => x.id === v)) return { view: v as CalView, anchor: day }
  } catch {
    // хранилище недоступно
  }
  return { view: 'list', anchor: day }
}

const CAL_DONE_KEY = 'calendar-show-done'

function loadCalDone(): boolean {
  try {
    return localStorage.getItem(CAL_DONE_KEY) !== '0'
  } catch {
    return true
  }
}

function saveCalendar(v: CalView): void {
  try {
    localStorage.setItem(CAL_KEY, v)
  } catch {
    // не страшно
  }
}

export function App() {
  const [user, setUser] = useState<User | null | undefined>(undefined)
  useEffect(() => watchUser(setUser), [])

  if (user === undefined) return <Splash />
  if (user === null) return <SignIn />
  return <Workspace user={user} />
}

function Workspace({ user }: { user: User }) {
  const { importBundle, projects, groups, columns, columnsRepo, countdowns, countdownsRepo, tasks, deleted, habits, checkins, error, tasksRepo, filesRepo, aiSettings, settingsRepo, projectsRepo, groupsRepo, habitsRepo, checkinsRepo } = useWorkspace(user.uid)
  const ctx = useDateCtx()
  const [view, setView] = useState<View>(loadView)
  const [drawer, setDrawer] = useState(false)
  const [sideHidden, setSideHidden] = useState(false)
  const [openId, setOpenId] = useState<string | null>(null)
  const [projectSheet, setProjectSheet] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [quickTask, setQuickTask] = useState<{ day: DayKey | null; time: string | null; columnId?: string | null } | null>(null)
  /** Список, в который пойдёт задача из «+» колонки доски «Сегодня» */
  const [quickProject, setQuickProject] = useState<string | null>(null)
  const [calDone, setCalDone] = useState(loadCalDone)
  const [sortMode, setSortMode] = useState<SortMode>(loadSort)
  const [groupMode, setGroupMode] = useState<GroupMode>(loadGroup)
  const [listMenu, setListMenu] = useState(false)
  const [taskMode, setTaskModeState] = useState<TaskViewMode>(getTaskMode)
  const [menuLists, setMenuListsState] = useState<MenuListId[]>(getMenuLists)
  const [sheetFocus, setSheetFocus] = useState<'item' | 'tag' | null>(null)
  const [menuId, setMenuId] = useState<string | null>(null)
  const [historyId, setHistoryId] = useState<string | null>(null)
  const [files, setFiles] = useState<TaskFile[]>([])
  const [fileStatus, setFileStatus] = useState<string | null>(null)
  const [dateId, setDateId] = useState<string | null>(null)
  const [update, setUpdate] = useState<UpdateInfo | null>(null)
  const [cdEditing, setCdEditing] = useState<'new' | string | null>(null)
  const [undo, setUndo] = useState<{ key: number; run: () => void } | null>(null)
  const lastTasksView = useRef<View>(view.type === 'matrix' || view.type === 'countdown' || view.type === 'search' || view.type === 'assistant' ? DEFAULT_VIEW : view)
  const [cal, setCal] = useState<{ view: CalView; anchor: DayKey }>(() => loadCalendar(today({ now: Date.now(), tz: Intl.DateTimeFormat().resolvedOptions().timeZone })))

  // Раз за запуск тихо смотрим, нет ли новой версии. Нет связи или это браузер: молчим
  useEffect(() => {
    void checkForUpdate()
      .then((r) => setUpdate(r.update))
      .catch(() => undefined)
  }, [])

  useEffect(() => saveView(view), [view])
  // N ставит курсор в строку «Добавить задачу», Esc закрывает историю, потом карточку задачи
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement | null)?.closest('input, textarea, select, [contenteditable="true"]')
      // Пока открыто меню или окно поверх карточки, Esc закрывает только его
      const overlay = document.querySelector('.pop, .dialog, .datepicker, .quick-task, .more-sheet, .task-menu, .ds')
      if (e.key === 'Escape' && !typing && !overlay) {
        if (historyId) setHistoryId(null)
        else if (openId) setOpenId(null)
      } else if ((e.key === 'n' || e.key === 'N' || e.key === 'т' || e.key === 'Т') && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const bar = document.querySelector<HTMLInputElement>('.addbar input')
        if (bar) {
          e.preventDefault()
          bar.focus()
        }
      }
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  }, [historyId, openId])
  // Ctrl+K или Ctrl+F открывают поиск, как в привычных программах
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
  useEffect(() => {
    // Матрица и обратный отсчёт сидят во вкладке задач на телефоне, но списком задач не считаются: иначе «Задачи» возвращали бы в них же
    if (tabOf(view) === 'tasks' && view.type !== 'matrix' && view.type !== 'countdown' && view.type !== 'search' && view.type !== 'assistant') lastTasksView.current = view
  }, [view])
  useEffect(() => saveCalendar(cal.view), [cal.view])
  const wide = useWide()
  // На большом экране нет «Списка» (он для телефона), а на телефоне нет видов, придуманных для большого
  const calView: CalView = wide ? (cal.view === 'list' ? 'month' : cal.view) : cal.view === 'agenda' || cal.view === 'weeks2' ? 'list' : cal.view
  // Кнопка «Отменить» живёт несколько секунд после выполнения, удаления и «не буду делать»
  useEffect(() => {
    if (!undo) return
    const id = window.setTimeout(() => setUndo(null), 6000)
    return () => window.clearTimeout(id)
  }, [undo])

  const sortedProjects = useMemo(
    () => [...(projects ?? [])].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)),
    [projects],
  )

  // Если выбранный проект удалили или он ещё не загрузился, показываем список по умолчанию
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
    if (effectiveView.type === 'objects' || effectiveView.type === 'trash' || effectiveView.type === 'calendar' || effectiveView.type === 'habits' || effectiveView.type === 'matrix' || effectiveView.type === 'countdown' || effectiveView.type === 'search' || effectiveView.type === 'assistant') return []
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
          : [...inView].sort(compareFor(sortMode, ctx)),
    [inView, effectiveView, ctx, sortMode],
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
    ...SORT_MODES.map((m) => ({
      key: m.id,
      title: m.title,
      checked: sortMode === m.id,
      onPick: () => {
        setSortMode(m.id)
        try {
          localStorage.setItem(SORT_KEY, m.id)
        } catch {
          // не страшно
        }
      },
    })),
    ...GROUP_MODES.map((m) => ({
      key: `group-${m.id}`,
      title: m.id === 'none' ? m.title : `Группировать ${m.title.toLowerCase()}`,
      checked: m.id !== 'none' && groupMode === m.id,
      onPick: () => {
        setGroupMode(m.id)
        try {
          localStorage.setItem(GROUP_KEY, m.id)
        } catch {
          // не страшно
        }
      },
    })),
    ...(currentProject
      ? [
          { key: 'view-list', title: 'Вид: список', checked: currentProject.viewMode !== 'kanban', onPick: () => setViewMode('list') },
          { key: 'view-kanban', title: 'Вид: канбан', checked: currentProject.viewMode === 'kanban', onPick: () => setViewMode('kanban') },
        ]
      : []),
    { key: 'print', title: 'Печать', icon: <PrintIcon size={20} />, onPick: () => printList(viewTitle(effectiveView, sortedProjects), sorted) },
    ...(currentProject ? [{ key: 'settings', title: 'Настройки списка', onPick: () => setProjectSheet(true) }] : []),
  ]


  /** Первый раз канбан открывается с тремя колонками, чтобы доска не была пустой */
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
    // Задачи удалённой колонки остаются в списке, просто выходят из неё
    for (const t of tasks ?? []) if (t.columnId === id) void tasksRepo.update(t.id, { columnId: null })
    void columnsRepo.softDelete(id)
  }

  async function createProject(name: string) {
    const id = await projectsRepo.create({ name, sortOrder: nextSortOrder(projects ?? [], groups ?? []) })
    setView({ type: 'project', id })
  }

  function deleteProject(id: string) {
    // Задачи удалённого списка уходят вместе с ним, иначе они остались бы без списка
    for (const t of tasks ?? []) if (t.projectId === id) void tasksRepo.softDelete(t.id)
    void projectsRepo.softDelete(id)
    setProjectSheet(false)
    setView(DEFAULT_VIEW)
  }

  useReminders(tasks, {
    onOpen: (id) => setOpenId(id),
    onDone: (t) => toggle(t),
  })

  // Задачи, пролежавшие в корзине дольше 30 дней, удаляем окончательно. Один раз за запуск
  const purged = useRef(false)
  useEffect(() => {
    if (deleted === null || purged.current) return
    purged.current = true
    const old = deleted.filter((t) => t.deletedAt && isExpired(t.deletedAt.toMillis(), Date.now())).map((t) => t.id)
    if (old.length) void tasksRepo.purgeMany(old)
  }, [deleted, tasksRepo])

  const opened = openId ? (tasks ?? []).find((t) => t.id === openId) ?? null : null
  const menuTask = menuId ? (tasks ?? []).find((t) => t.id === menuId) ?? null : null
  const historyTask = historyId ? (tasks ?? []).find((t) => t.id === historyId) ?? null : null
  const dateTask = dateId ? (tasks ?? []).find((t) => t.id === dateId) ?? null : null

  // Файлы открытой задачи подгружаются, пока открыта её карточка
  const openedId = opened?.id ?? null
  useEffect(() => {
    setFiles([])
    setFileStatus(null)
    if (!openedId) return
    return filesRepo.subscribe(openedId, setFiles, (e) => setFileStatus(e.message))
  }, [openedId, filesRepo])

  async function addFiles(taskId: string, picked: File[]) {
    for (const f of picked) {
      setFileStatus(`Загружаю «${f.name}»`)
      try {
        const up = await prepareUpload(f)
        await filesRepo.add(taskId, up.name, up.type, up.bytes)
        setFileStatus(null)
      } catch (e) {
        setFileStatus((e as Error).message || 'Не удалось сохранить файл')
        return
      }
    }
  }

  async function showFile(f: TaskFile) {
    setFileStatus(`Открываю «${f.name}»`)
    try {
      await openFile(await filesRepo.read(f), f.name)
      setFileStatus(null)
    } catch (e) {
      setFileStatus((e as Error).message || 'Не удалось открыть файл')
    }
  }

  const exQuick = useExit(quickTask)
  const exMore = useExit(moreOpen)
  const exSettings = useExit(settingsOpen)
  const exProject = useExit(projectSheet && currentProject ? currentProject : null)
  const exOpened = useExit(opened)
  const exMenu = useExit(menuTask)
  const exDate = useExit(dateTask)
  const exHistory = useExit(historyTask)
  const ox = exOpened.value
  const pj = exProject.value
  const mx = exMenu.value
  const dx = exDate.value
  const hx = exHistory.value

  async function addQuick(q: QuickTask) {
    const columnId = quickTask?.columnId ?? null
    setQuickTask(null)
    setQuickProject(null)
    const last = (tasks ?? []).reduce((m, t) => Math.max(m, t.sortOrder), 0)
    const patch = datePatchOf(q.date, ctx)
    await tasksRepo.create({
      projectId: q.projectId,
      title: q.title,
      tags: [...new Set([...(effectiveView.type === 'tag' ? [effectiveView.id] : []), ...q.tags])],
      priority: q.priority,
      content: q.content,
      columnId,
      sortOrder: orderBetween(last || null, null),
      ...patch.fields,
      reminders: Object.fromEntries(patch.reminders.map((trigger, i) => [`r${i + 1}`, { trigger }])),
    })
  }

  function selectTab(tab: Tab) {
    if (tab === 'more') setMoreOpen(true)
    else if (tab === 'tasks') setView(lastTasksView.current)
    else setView({ type: tab })
  }

  const offerUndo = (run: () => void) => setUndo({ key: Date.now(), run })

  /** Повторяющаяся задача при выполнении получает следующий срок, обычная просто закрывается */
  function toggle(t: Task) {
    if (t.status === 'open' && t.repeat && t.due !== null) {
      const now = Date.now()
      const next = nextOccurrence(t, { now, tz: ctx.tz }, now)
      if (next) {
        void tasksRepo.completeRepeating(t, next, now)
        return
      }
    }
    const closing = t.status === 'open'
    void tasksRepo.complete(t.id, closing)
    if (closing) offerUndo(() => void tasksRepo.complete(t.id, false))
  }

  function skip(t: Task) {
    const closing = t.status === 'open'
    void tasksRepo.setSkipped(t.id, closing)
    if (closing) offerUndo(() => void tasksRepo.setSkipped(t.id, false))
  }

  function remove(t: Task) {
    void tasksRepo.softDelete(t.id)
    offerUndo(() => void tasksRepo.restore(t.id))
  }

  /** Копия задачи рядом с оригиналом. Кнопка «Отменить» убирает копию */
  async function duplicate(t: Task) {
    const last = (tasks ?? []).reduce((m, x) => Math.max(m, x.sortOrder), 0)
    const id = await tasksRepo.create({ ...copyOfTask(t, { keepDate: true }), sortOrder: orderBetween(last || null, null) })
    offerUndo(() => void tasksRepo.softDelete(id))
  }

  /** Копия списка как шаблон: те же открытые задачи без дат и отметок, объект с пустой карточкой */
  async function duplicateProject(p: Project) {
    const id = await projectsRepo.create({ ...copyOfProject(p), sortOrder: nextSortOrder(projects ?? [], groups ?? []) })
    const own = (tasks ?? []).filter((t) => t.projectId === p.id && t.status === 'open' && t.parentId === null).sort((a, b) => a.sortOrder - b.sortOrder)
    let order: number | null = null
    for (const t of own) {
      order = orderBetween(order, null)
      await tasksRepo.create({ ...copyOfTask(t, { keepDate: false, projectId: id, columnId: null }), sortOrder: order })
    }
    setProjectSheet(false)
    setView({ type: 'project', id })
  }

  /** Лист для бригады: на телефоне отправляется текстом, на компьютере открывается страница для печати */
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

  function share(t: Task) {
    const when = describeDateValue(dateValueOf(t, ctx), ctx)
    const text = [t.title, when, t.address, plainText(t.content).trim()].filter(Boolean).join('\n')
    void shareText(t.title, text).catch(() => undefined)
  }

  const rowActions: RowActions = {
    toggle,
    open: (id) => {
      setSheetFocus(null)
      setOpenId(id)
    },
    skip,
    remove,
    reschedule: (t) => setDateId(t.id),
    menu: (t) => setMenuId(t.id),
  }

  const defaultQuickDay = (): DayKey | null =>
    effectiveView.type === 'smart' && effectiveView.id === 'today' ? today(ctx) : effectiveView.type === 'smart' && effectiveView.id === 'tomorrow' ? addDays(today(ctx), 1) : null

  /** Нажатие на пустое место в календаре: быстрое добавление на этот день и время */
  const slotRequest = (req: QuickAddRequest) =>
    setQuickTask({
      day: req.day,
      time: req.minutes === null ? null : `${String(Math.floor(req.minutes / 60)).padStart(2, '0')}:${String(req.minutes % 60).padStart(2, '0')}`,
    })

  /** Событие перетащили в сетке календаря: сдвигаем срок (и начало, если оно есть) на разницу во времени */
  function moveEvent(taskId: string, day: DayKey, minutes: number) {
    const t = (tasks ?? []).find((x) => x.id === taskId)
    if (!t || typeof t.due !== 'number') return
    const startMs = typeof t.start === 'number' && t.start < t.due ? t.start : t.due
    const time = `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
    const delta = localToMs(day, time, ctx.tz) - startMs
    if (delta === 0) return
    void tasksRepo.update(taskId, { due: t.due + delta, ...(typeof t.start === 'number' ? { start: t.start + delta } : {}) })
  }

  const isDoneList = effectiveView.type === 'smart' && (effectiveView.id === 'done' || effectiveView.id === 'wontdo')
  /** Секции списка: «Выполнено» по дням закрытия, при выбранной группировке по ней, иначе обычные секции умных списков */
  const listGroups = isDoneList
    ? groupDone(sorted, ctx)
    : groupMode !== 'none'
      ? groupByMode(groupMode, sorted, ctx)
      : wide && effectiveView.type === 'smart' && effectiveView.id === 'all'
        ? sectionsByDay(sorted, ctx)
        : effectiveView.type === 'smart'
          ? groupTasks(effectiveView.id, sorted, ctx)
          : null

  const empty = tasks !== null && sorted.length === 0

  /** Боковое меню висит на экране только в разделе задач на большом экране, его можно свернуть кнопкой у заголовка */
  const tasksSection = wide && ['smart', 'project', 'tag', 'objects', 'waiting', 'trash'].includes(effectiveView.type)
  const showSide = tasksSection && !sideHidden
  /** На большом экране «Сегодня» и «7 дней» показываются доской, списки в виде канбана тоже. Справа тогда нет колонки карточки */
  const deskBoard = wide && effectiveView.type === 'smart' && (effectiveView.id === 'today' || effectiveView.id === 'week')
  const kanbanHere = effectiveView.type === 'project' && currentProject?.viewMode === 'kanban'
  const boardLayout = deskBoard || kanbanHere
  const projectInfo = useMemo<ProjectInfo>(() => Object.fromEntries(sortedProjects.map((p) => [p.id, { name: p.name, color: p.color && /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : null }])), [sortedProjects])
  const railOf = (v: View): RailItem => (v.type === 'calendar' ? 'calendar' : v.type === 'matrix' ? 'matrix' : v.type === 'habits' ? 'habits' : v.type === 'countdown' ? 'countdown' : v.type === 'search' ? 'search' : v.type === 'assistant' ? 'assistant' : 'tasks')
  const canAddHere = tasksSection && !boardLayout && (effectiveView.type === 'project' || effectiveView.type === 'tag' || (effectiveView.type === 'smart' && effectiveView.id !== 'done' && effectiveView.id !== 'wontdo'))

  /** Цвет события в календаре: цвет списка, а у списков без цвета свой из набора, чтобы соседние не сливались */
  const colors = useMemo(() => {
    const palette = ['#4772FA', '#E5484D', '#2FAA6B', '#F5A623', '#8A63E6', '#2BB0B0', '#D6559D']
    const out: Record<string, string> = {}
    sortedProjects.forEach((p, i) => {
      out[p.id] = p.color && /^#[0-9a-f]{6}$/i.test(p.color) ? p.color : palette[i % palette.length]
    })
    return out
  }, [sortedProjects])

  /** Задачу перетащили на другой день в календаре: время остаётся прежним */
  function moveToDay(taskId: string, day: DayKey) {
    const t = (tasks ?? []).find((x) => x.id === taskId)
    if (!t || t.due === null) return
    if (typeof t.due === 'string') {
      if (t.due !== day && (t.start === null || typeof t.start === 'number')) void tasksRepo.update(taskId, { due: day })
      return
    }
    const delta = localToMs(day, timeOf(t.due, ctx.tz), ctx.tz) - t.due
    if (delta === 0) return
    void tasksRepo.update(taskId, { due: t.due + delta, ...(typeof t.start === 'number' ? { start: t.start + delta } : {}) })
  }

  /** Задача из строки над списком: название, дата словами, метки */
  function addFromBar(text: string) {
    const s = parseSmart(text, ctx)
    const day = s.day ?? defaultQuickDay()
    const date = day ? { ...EMPTY_DATE, day, time: s.day ? s.time : null, reminders: s.day && s.time ? [AT_TIME] : [] } : EMPTY_DATE
    void addQuick({ title: s.title.trim() || text.trim(), date, priority: 0, projectId: projectForNew(effectiveView), tags: s.tags.map(normalizeTag).filter(Boolean), content: '' })
  }

  return (
    <div className={['app', wide ? 'wide' : '', showSide ? 'side' : '', boardLayout ? 'board' : '', wide && ((tasksSection && !boardLayout) || ox) ? 'has-pane' : ''].filter(Boolean).join(' ')}>
      {wide && (
        <Rail
          active={railOf(effectiveView)}
          letter={(user.email ?? 'A').slice(0, 1).toUpperCase()}
          onSelect={(item) => {
            if (item === 'search') setView({ type: 'search' })
            else if (item === 'assistant') setView({ type: 'assistant' })
            else if (item === 'tasks') setView(lastTasksView.current)
            else setView({ type: item })
          }}
          onSettings={() => setSettingsOpen(true)}
        />
      )}
      {effectiveView.type === 'calendar' && wide ? (
        <DeskCalHeader
          view={calView}
          anchor={cal.anchor}
          ctx={ctx}
          showDone={calDone}
          onShift={(dir) => setCal({ ...cal, anchor: shiftAnchor(calView, cal.anchor, dir) })}
          onToday={() => setCal({ ...cal, anchor: today(ctx) })}
          onView={(v) => setCal({ ...cal, view: v })}
          onAdd={() => setQuickTask({ day: cal.anchor, time: null })}
          onToggleDone={() => {
            const next = !calDone
            setCalDone(next)
            try {
              localStorage.setItem(CAL_DONE_KEY, next ? '1' : '0')
            } catch {
              // не страшно
            }
          }}
        />
      ) : effectiveView.type === 'calendar' ? (
        <CalendarHeader
          view={calView}
          anchor={cal.anchor}
          ctx={ctx}
          showDone={calDone}
          onShift={(dir) => setCal({ ...cal, anchor: shiftAnchor(calView, cal.anchor, dir) })}
          onToday={() => setCal({ ...cal, anchor: today(ctx) })}
          onView={(v) => setCal({ ...cal, view: v })}
          onToggleDone={() => {
            const next = !calDone
            setCalDone(next)
            try {
              localStorage.setItem(CAL_DONE_KEY, next ? '1' : '0')
            } catch {
              // не страшно
            }
          }}
        />
      ) : effectiveView.type === 'habits' && wide ? null : (
        <header className={tabOf(effectiveView) === 'tasks' ? 'centered' : undefined}>
          {tasksSection && (
            <button className="round side-toggle" onClick={() => setSideHidden(!sideHidden)} aria-label={sideHidden ? 'Показать меню' : 'Скрыть меню'} title={sideHidden ? 'Показать меню' : 'Скрыть меню'}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 5h10M3 10h7M3 15h10" />
                <path d={sideHidden ? 'M14.5 7.5L17 10l-2.5 2.5' : 'M17 7.5L14.5 10l2.5 2.5'} />
              </svg>
            </button>
          )}
          {tabOf(effectiveView) === 'tasks' && (
            <button className="round menu" onClick={() => setDrawer(true)} aria-label="Списки">
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          )}
          <h1>{viewTitle(effectiveView, sortedProjects)}</h1>
          {wide && hasListMenu && (
            <button className="round sort" onClick={() => setListMenu(true)} aria-label="Сортировка" title="Сортировка">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M7 3.5v13M7 3.5L4 6.5M13 16.5v-13M13 16.5l3-3" />
              </svg>
            </button>
          )}
          {hasListMenu ? (
            <button className="round more" onClick={() => setListMenu(true)} aria-label="Меню списка">
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="5.5" cy="12" r="1.8" fill="currentColor" />
                <circle cx="12" cy="12" r="1.8" fill="currentColor" />
                <circle cx="18.5" cy="12" r="1.8" fill="currentColor" />
              </svg>
            </button>
          ) : (
            tabOf(effectiveView) === 'tasks' && <span className="round-spacer" />
          )}
        </header>
      )}

      {error && <p className="error">{error}</p>}

      {canAddHere && <AddBar target={effectiveView.type === 'project' ? (currentProject?.name ?? 'Список') : effectiveView.type === 'tag' ? `#${effectiveView.id}` : 'Входящие'} onAdd={addFromBar} />}

      {wide && tasksSection && !boardLayout && !ox && <EmptyPane />}

      {update && (
        <button className="update-banner" onClick={() => window.open(update.apk, '_system')}>
          Вышла версия {update.versionName}. Обновить
        </button>
      )}

      <main key={viewKey(effectiveView)}>
        {effectiveView.type === 'assistant' ? (
          <Assistant tasks={tasks ?? []} projects={sortedProjects} ctx={ctx} settings={aiSettings} onSettings={(patch) => void settingsRepo.setAi(patch)} />
        ) : effectiveView.type === 'search' ? (
          <SearchScreen
            tasks={tasks ?? []}
            projects={sortedProjects}
            projectInfo={projectInfo}
            ctx={ctx}
            actions={rowActions}
            onOpenProject={(id) => setView({ type: 'project', id })}
            onOpenTag={(tag) => setView({ type: 'tag', id: tag })}
          />
        ) : effectiveView.type === 'countdown' ? (
          <Countdowns
            list={countdowns ?? []}
            today={today(ctx)}
            editing={cdEditing}
            onEdit={setCdEditing}
            onCreate={(name, date) => void countdownsRepo.create({ name, date })}
            onUpdate={(id, patch) => void countdownsRepo.update(id, patch)}
            onDelete={(id) => void countdownsRepo.softDelete(id)}
          />
        ) : effectiveView.type === 'matrix' ? (
          <Matrix tasks={tasks ?? []} ctx={ctx} onToggle={toggle} onOpen={rowActions.open} />
        ) : effectiveView.type === 'habits' ? (
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
            onSet={(habitId, day, status) => void (status ? checkinsRepo.set(habitId, day, status) : checkinsRepo.clear(habitId, day))}
          />
        ) : effectiveView.type === 'calendar' && wide ? (
          <CalendarDesktop
            tasks={tasks ?? []}
            ctx={ctx}
            view={calView}
            anchor={cal.anchor}
            showDone={calDone}
            colors={colors}
            onAnchor={(day) => setCal((c) => ({ ...c, anchor: day }))}
            onView={(v) => setCal((c) => ({ ...c, view: v }))}
            onSlot={slotRequest}
            onMove={moveEvent}
            onMoveDay={moveToDay}
            actions={rowActions}
          />
        ) : effectiveView.type === 'calendar' ? (
          <Calendar
            tasks={tasks ?? []}
            ctx={ctx}
            view={calView}
            anchor={cal.anchor}
            showDone={calDone}
            onAnchor={(day) => setCal((c) => ({ ...c, anchor: day }))}
            onView={(v) => setCal((c) => ({ ...c, view: v }))}
            onSlot={slotRequest}
            onMove={moveEvent}
            actions={rowActions}
          />
        ) : effectiveView.type === 'trash' ? (
          <Trash
            tasks={deleted ?? []}
            now={ctx.now}
            onRestore={(id) => void tasksRepo.restore(id)}
            onPurge={(id) => void tasksRepo.purge(id)}
            onEmpty={() => void tasksRepo.purgeMany((deleted ?? []).map((t) => t.id))}
          />
        ) : effectiveView.type === 'objects' ? (
          <ObjectsBoard
            projects={sortedProjects}
            tasks={tasks ?? []}
            ctx={ctx}
            onOpen={(id) => setView({ type: 'project', id })}
            onMove={(id, stage: SiteStage) => void projectsRepo.setSiteField(id, 'stage', stage)}
          />
        ) : deskBoard && tasks !== null ? (
          <DeskBoard
            columns={effectiveView.type === 'smart' && effectiveView.id === 'week' ? boardByDay(sorted, ctx) : boardByProject(sorted, sortedProjects, ctx)}
            ctx={ctx}
            projects={projectInfo}
            showProject={true}
            onToggle={toggle}
            onOpen={rowActions.open}
            onAdd={(projectId, day) => {
              setQuickProject(projectId)
              setQuickTask({ day, time: null })
            }}
          />
        ) : effectiveView.type === 'project' && currentProject?.viewMode === 'kanban' ? (
          <Kanban
            wide={wide}
            projectId={currentProject.id}
            tasks={tasks ?? []}
            columns={columns ?? []}
            ctx={ctx}
            onToggle={toggle}
            onOpen={rowActions.open}
            onAddTask={(columnId) => setQuickTask({ day: null, time: null, columnId })}
            onMove={moveCard}
            onAddColumn={(name) => void columnsRepo.create({ projectId: currentProject.id, name, sortOrder: nextColumnOrder((columns ?? []).filter((c) => c.projectId === currentProject.id)) })}
            onRenameColumn={(id, name) => void columnsRepo.update(id, { name })}
            onDeleteColumn={deleteColumn}
          />
        ) : tasks === null ? (
          <p className="muted">Загрузка</p>
        ) : empty ? (
          <Empty title="Нет задач" hint="Добавьте первую кнопкой «+»" />
        ) : (
          <TaskList
            tasks={sorted}
            groups={listGroups}
            projects={wide && effectiveView.type !== 'project' ? projectInfo : undefined}
            ctx={ctx}
            listKey={viewKey(effectiveView)}
            actions={rowActions}
          />
        )}
      </main>

      {effectiveView.type === 'calendar' && (
        <button className="primary fab" onClick={() => setQuickTask({ day: cal.anchor, time: null })} aria-label="Добавить">
          +
        </button>
      )}

      {effectiveView.type === 'countdown' && (
        <button className="primary fab" onClick={() => setCdEditing('new')} aria-label="Добавить событие">
          +
        </button>
      )}

      {(effectiveView.type === 'smart' || effectiveView.type === 'project' || effectiveView.type === 'tag') && (
        <button className="primary fab" onClick={() => setQuickTask({ day: defaultQuickDay(), time: null })} aria-label="Добавить задачу">
          +
        </button>
      )}

      <TabBar active={tabOf(effectiveView)} dayOfMonth={Number(today(ctx).slice(8))} moreOpen={moreOpen} onSelect={selectTab} />

      {(!wide || showSide) && (
      <Drawer
        docked={wide}
        dayOfMonth={Number(today(ctx).slice(8))}
        open={drawer}
        smartIds={menuLists}
        view={effectiveView}
        projects={sortedProjects}
        groups={groups ?? []}
        email={user.email}
        counts={counts}
        objectsCount={objectsCount}
        tags={tags}
        waiting={waiting}
        trashCount={deleted?.length ?? 0}
        onCreateProject={(name) => void createProject(name)}
        onCreateGroup={(name) => void groupsRepo.create({ name, sortOrder: nextSortOrder(projects ?? [], groups ?? []) })}
        onRenameGroup={(id, name) => void groupsRepo.update(id, { name })}
        onDeleteGroup={(id) => {
          // Списки из удалённой папки остаются, просто выходят из неё
          for (const p of projects ?? []) if (p.groupId === id) void projectsRepo.update(p.id, { groupId: null })
          void groupsRepo.softDelete(id)
        }}
        onToggleGroup={(id, collapsed) => void groupsRepo.update(id, { collapsed })}
        onSettings={() => setSettingsOpen(true)}
        onSelect={setView}
        onClose={() => setDrawer(false)}
      />
      )}

      {exQuick.value && (
        <TaskQuickAdd
          leaving={exQuick.leaving}
          ctx={ctx}
          projects={sortedProjects}
          allTags={tags.map((t) => t.tag)}
          defaultProjectId={quickProject ?? projectForNew(effectiveView)}
          defaultDay={exQuick.value.day}
          defaultTime={exQuick.value.time}
          onSubmit={(q) => void addQuick(q)}
          onClose={() => (setQuickTask(null), setQuickProject(null))}
        />
      )}

      {exMore.value && (
        <MoreSheet
          leaving={exMore.leaving}
          trashCount={deleted?.length ?? 0}
          onOpenDone={() => {
            setView({ type: 'smart', id: 'done' })
            setMoreOpen(false)
          }}
          onOpenTrash={() => {
            setView({ type: 'trash' })
            setMoreOpen(false)
          }}
          onOpenAssistant={() => {
            setView({ type: 'assistant' })
            setMoreOpen(false)
          }}
          onOpenSearch={() => {
            setView({ type: 'search' })
            setMoreOpen(false)
          }}
          onOpenMatrix={() => {
            setView({ type: 'matrix' })
            setMoreOpen(false)
          }}
          onOpenCountdown={() => {
            setView({ type: 'countdown' })
            setMoreOpen(false)
          }}
          onOpenSettings={() => {
            setSettingsOpen(true)
            setMoreOpen(false)
          }}
          onClose={() => setMoreOpen(false)}
        />
      )}

      {pj && (
        <ProjectSheet
          leaving={exProject.leaving}
          key={pj.id}
          project={pj}
          groups={groups ?? []}
          taskCount={(tasks ?? []).filter((t) => t.projectId === pj.id).length}
          onChange={(patch) => void projectsRepo.update(pj.id, patch)}
          onSiteField={(field, value) => void projectsRepo.setSiteField(pj.id, field, value)}
          onDelete={() => deleteProject(pj.id)}
          onDuplicate={() => void duplicateProject(pj)}
          onClose={() => setProjectSheet(false)}
        />
      )}

      {ox && (
        <TaskSheet
          leaving={exOpened.leaving}
          key={ox.id}
          task={ox}
          focus={sheetFocus}
          docked={wide}
          mode={wide ? 'dialog' : taskMode}
          projects={sortedProjects}
          ctx={ctx}
          onToggle={() => toggle(ox)}
          onPin={() => void tasksRepo.update(ox.id, { pinnedAt: ox.pinnedAt === null ? Date.now() : null })}
          onShare={() => share(ox)}
          onSkip={() => {
            skip(ox)
            setOpenId(null)
          }}
          onHistory={() => setHistoryId(ox.id)}
          onDuplicate={() => void duplicate(ox)}
          files={files}
          fileStatus={fileStatus}
          onAddFiles={(picked) => void addFiles(ox.id, picked)}
          onOpenFile={(f) => void showFile(f)}
          onRemoveFile={(f) => window.confirm(`Удалить файл «${f.name}»?`) && void filesRepo.remove(f)}
          onChange={(patch) => tasksRepo.update(ox.id, patch)}
          allTags={tags.map((t) => t.tag)}
          onItem={(itemId, item) => {
            if (item === null && itemId) void tasksRepo.removeItem(ox.id, itemId)
            else if (item) void tasksRepo.setItem(ox.id, itemId ?? tasksRepo.newId(), item)
          }}
          onTag={(tag, add) => void (add ? tasksRepo.addTag(ox.id, tag) : tasksRepo.removeTag(ox.id, tag))}
          onReminders={(triggers) => void tasksRepo.setReminders(ox.id, triggers)}
          onDelete={() => {
            void tasksRepo.softDelete(ox.id)
            setOpenId(null)
          }}
          onClose={() => setOpenId(null)}
        />
      )}

      {listMenu && <PopMenu label="Меню списка" items={listMenuItems} onClose={() => setListMenu(false)} />}

      {mx && (
        <TaskMenu
          leaving={exMenu.leaving}
          task={mx}
          ctx={ctx}
          onPin={() => void tasksRepo.update(mx.id, { pinnedAt: mx.pinnedAt === null ? Date.now() : null })}
          onShare={() => share(mx)}
          onSkip={() => skip(mx)}
          onRemove={() => remove(mx)}
          onDate={() => setDateId(mx.id)}
          projects={sortedProjects}
          onPriority={(priority) => void tasksRepo.update(mx.id, { priority })}
          onMove={(projectId) => void tasksRepo.update(mx.id, { projectId, columnId: null })}
          onDuplicate={() => void duplicate(mx)}
          onOpen={(focus) => {
            setSheetFocus(focus)
            setOpenId(mx.id)
          }}
          onClose={() => setMenuId(null)}
        />
      )}

      {hx && (
        <HistorySheet
          leaving={exHistory.leaving}
          key={`history-${hx.id}`}
          task={hx}
          ctx={ctx}
          projects={sortedProjects}
          subscribe={(cb) => tasksRepo.subscribeHistory(hx.id, cb, (e) => console.error(e))}
          onRollback={(patch) => void tasksRepo.update(hx.id, patch as never)}
          onClose={() => setHistoryId(null)}
        />
      )}

      {dx && (
        <DatePicker
          leaving={exDate.leaving}
          ctx={ctx}
          value={dateValueOf(dx, ctx)}
          onApply={(v) => {
            const p = datePatchOf(v, ctx)
            void tasksRepo.update(dx.id, p.fields)
            void tasksRepo.setReminders(dx.id, p.reminders)
          }}
          onClose={() => setDateId(null)}
        />
      )}

      {exSettings.value && wide && <SettingsDesktop leaving={exSettings.leaving} menuLists={menuLists} onMenuLists={(ids) => (setMenuListsState(ids), setMenuLists(ids))} onImport={importBundle} email={user.email} onTaskMode={setTaskModeState} onSignOut={() => void signOut()} onClose={() => setSettingsOpen(false)} />}

      {exSettings.value && !wide && <Settings leaving={exSettings.leaving} menuLists={menuLists} onMenuLists={(ids) => (setMenuListsState(ids), setMenuLists(ids))} onImport={importBundle} email={user.email} onTaskMode={setTaskModeState} onSignOut={() => void signOut()} onClose={() => setSettingsOpen(false)} />}

      {!notificationsSupported() && <ReminderPopups tasks={tasks} onOpen={(id) => setOpenId(id)} onDone={toggle} />}

      {undo && (
        <button key={undo.key} className="undo" aria-label="Отменить" onClick={() => (undo.run(), setUndo(null))}>
          <UndoIcon size={24} />
        </button>
      )}
    </div>
  )
}
