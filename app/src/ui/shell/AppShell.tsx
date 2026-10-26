import type { ReactNode } from 'react'
import type { DateCtx, DayKey } from '../../domain/dates'
import { today } from '../../domain/dates'
import type { Priority, Project, ProjectGroup } from '../../domain/types'
import { viewTitle, type View } from '../view'
import { ChevronLeft } from '../icons'
import { Rail, type RailItem } from '../Rail'
import { TabBar, tabOf, type Tab } from '../TabBar'
import { Drawer } from '../Drawer'
import { CalendarHeader } from '../Calendar'
import type { CalView } from '../../domain/calendar'
import { DeskCalHeader } from '../CalendarDesktop'
import { UndoIcon } from '../icons'
import { StorageService, STORAGE_KEYS } from '../../platform/storage'
import type { MenuListId } from '../../platform/theme'
import { AddBar } from '../AddBar'
import { EmptyPane } from '../EmptyPane'

const railOf = (v: View): RailItem =>
  v.type === 'calendar' ? 'calendar' :
  v.type === 'matrix' ? 'matrix' :
  v.type === 'habits' ? 'habits' :
  v.type === 'pomo' ? 'pomo' :
  v.type === 'countdown' ? 'countdown' :
  v.type === 'search' ? 'search' :
  v.type === 'assistant' ? 'assistant' :
  'tasks'

export interface AppShellProps {
  children: ReactNode
  wide: boolean
  effectiveView: View
  lastTasksView: View
  user: { email: string | null }
  ctx: DateCtx
  // Navigation
  drawer: boolean
  setDrawer: (open: boolean) => void
  sideHidden: boolean
  setSideHidden: (hidden: boolean) => void
  showSide: boolean
  boardLayout: boolean
  tasksSection: boolean
  onSelectView: (v: View) => void
  onSelectTab: (tab: Tab) => void
  onOpenSettings: () => void
  // Lists & Projects for Drawer
  sortedProjects: Project[]
  groups: ProjectGroup[]
  counts: Record<string, number>
  objectsCount: number
  tags: Array<{ tag: string; count: number }>
  waiting: { total: number; stuck: number }
  trashCount: number
  menuLists: MenuListId[]
  onCreateProject: (name: string) => void
  onCreateGroup: (name: string) => void
  onRenameGroup: (id: string, name: string) => void
  onDeleteGroup: (id: string) => void
  onToggleGroup: (id: string, collapsed: boolean) => void
  onMoveToGroup: (projectId: string, groupId: string | null) => void
  // Calendar header
  cal: { view: CalView; anchor: DayKey }
  calView: CalView
  calDone: boolean
  calSideOpen: boolean
  setCal: (updater: (prev: { view: CalView; anchor: DayKey }) => { view: CalView; anchor: DayKey }) => void
  setCalDone: (done: boolean) => void
  setCalSideOpen: (open: boolean) => void
  onShiftCal: (dir: 1 | -1) => void
  onTodayCal: () => void
  // Actions
  hasListMenu: boolean
  onOpenListMenu: () => void
  currentProject: Project | null
  smartBoardMode: 'list' | 'board'
  onToggleBoardMode: () => void
  onOpenQuickAdd: () => void
  onOpenCountdownAdd: () => void
  moreOpen: boolean
  // Undo
  undo: { key: number; run: () => void } | null
  setUndo: (u: { key: number; run: () => void } | null) => void
  hasPane?: boolean
  onAddFromBar?: (text: string, priority?: Priority) => void
  canAddHere?: boolean
  addBarTarget?: string
}

export function AppShell(props: AppShellProps) {
  const {
    children,
    wide,
    effectiveView,
    lastTasksView,
    user,
    ctx,
    drawer,
    setDrawer,
    sideHidden,
    setSideHidden,
    showSide,
    boardLayout,
    tasksSection,
    onSelectView,
    onSelectTab,
    onOpenSettings,
    sortedProjects,
    groups,
    counts,
    objectsCount,
    tags,
    waiting,
    trashCount,
    menuLists,
    onCreateProject,
    onCreateGroup,
    onRenameGroup,
    onDeleteGroup,
    onToggleGroup,
    onMoveToGroup,
    cal,
    calView,
    calDone,
    calSideOpen,
    setCal,
    setCalDone,
    setCalSideOpen,
    onShiftCal,
    onTodayCal,
    hasListMenu,
    onOpenListMenu,
    currentProject,
    smartBoardMode,
    onToggleBoardMode,
    onOpenQuickAdd,
    onOpenCountdownAdd,
    moreOpen,
    undo,
    setUndo,
    hasPane,
    onAddFromBar,
    canAddHere,
    addBarTarget,
  } = props

  return (
    <div
      className={[
        'app',
        wide ? 'wide' : '',
        showSide ? 'side' : '',
        boardLayout ? 'board' : '',
        hasPane ? 'has-pane' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* 1. Desktop Rail */}
      {wide && (
        <Rail
          active={railOf(effectiveView)}
          letter={(user.email ?? 'A').slice(0, 1).toUpperCase()}
          onSelect={(item) => {
            if (item === 'search') onSelectView({ type: 'search' })
            else if (item === 'assistant') onSelectView({ type: 'assistant' })
            else if (item === 'tasks') onSelectView(lastTasksView)
            else onSelectView({ type: item })
          }}
          onSettings={() => (wide ? onOpenSettings() : (setDrawer(false), onSelectView({ type: 'settings' })))}
        />
      )}

      {/* 2. Header */}
      {effectiveView.type === 'calendar' && wide ? (
        <DeskCalHeader
          view={calView}
          anchor={cal.anchor}
          ctx={ctx}
          showDone={calDone}
          sideOpen={calSideOpen}
          onToggleSide={() => {
            const next = !calSideOpen
            setCalSideOpen(next)
            StorageService.setBool(STORAGE_KEYS.CAL_SIDE_OPEN, next)
          }}
          onShift={onShiftCal}
          onToday={onTodayCal}
          onView={(v) => setCal((c) => ({ ...c, view: v }))}
          onAdd={onOpenQuickAdd}
          onToggleDone={() => {
            const next = !calDone
            setCalDone(next)
            StorageService.setBool(STORAGE_KEYS.CAL_SHOW_DONE, next)
          }}
        />
      ) : effectiveView.type === 'calendar' ? (
        <CalendarHeader
          view={calView}
          anchor={cal.anchor}
          ctx={ctx}
          showDone={calDone}
          onMenu={() => setDrawer(true)}
          onShift={onShiftCal}
          onToday={onTodayCal}
          onView={(v) => setCal((c) => ({ ...c, view: v }))}
          onToggleDone={() => {
            const next = !calDone
            setCalDone(next)
            StorageService.setBool(STORAGE_KEYS.CAL_SHOW_DONE, next)
          }}
        />
      ) : effectiveView.type === 'habits' || (!wide && (effectiveView.type === 'settings' || effectiveView.type === 'pomo')) ? null : (
        <header className={tabOf(effectiveView) === 'tasks' ? 'centered' : undefined}>
          {tasksSection && (
            <button
              className="round side-toggle"
              onClick={() => setSideHidden(!sideHidden)}
              aria-label={sideHidden ? 'Показать меню' : 'Скрыть меню'}
              title={sideHidden ? 'Показать меню' : 'Скрыть меню'}
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 5h10M3 10h7M3 15h10" />
                <path d={sideHidden ? 'M14.5 7.5L17 10l-2.5 2.5' : 'M17 7.5L14.5 10l2.5 2.5'} />
              </svg>
            </button>
          )}

          {!wide &&
          ((tabOf(effectiveView) !== 'tasks' && effectiveView.type !== 'matrix') ||
            effectiveView.type === 'trash' ||
            (effectiveView.type === 'smart' && (effectiveView.id === 'done' || effectiveView.id === 'wontdo'))) ? (
            <button
              className="round menu"
              onClick={() => onSelectView(tabOf(effectiveView) === 'tasks' ? { type: 'smart', id: 'today' } : lastTasksView)}
              aria-label="Назад"
            >
              <ChevronLeft size={24} />
            </button>
          ) : (
            tabOf(effectiveView) === 'tasks' && (
              <button className="round menu" onClick={() => setDrawer(true)} aria-label="Списки">
                <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4 6.5h16M4 12h16M4 17.5h16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
            )
          )}

          <h1 style={!wide && effectiveView.type === 'matrix' ? { paddingLeft: 6 } : undefined}>{viewTitle(effectiveView, sortedProjects)}</h1>

          {wide && hasListMenu && (
            <button className="round sort" onClick={onOpenListMenu} aria-label="Сортировка" title="Сортировка">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M7 3.5v13M7 3.5L4 6.5M13 16.5v-13M13 16.5l3-3" />
              </svg>
            </button>
          )}

          {!wide && ((effectiveView.type === 'smart' && (effectiveView.id === 'today' || effectiveView.id === 'week')) || currentProject) && (
            <button
              className="round"
              onClick={onToggleBoardMode}
              aria-label={
                (effectiveView.type === 'smart' ? smartBoardMode === 'board' : currentProject?.viewMode === 'kanban')
                  ? 'Вид: список'
                  : 'Вид: канбан'
              }
              title={
                (effectiveView.type === 'smart' ? smartBoardMode === 'board' : currentProject?.viewMode === 'kanban')
                  ? 'Список'
                  : 'Канбан'
              }
            >
              {(effectiveView.type === 'smart' ? smartBoardMode === 'board' : currentProject?.viewMode === 'kanban') ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="8" y1="6" x2="21" y2="6" />
                  <line x1="8" y1="12" x2="21" y2="12" />
                  <line x1="8" y1="18" x2="21" y2="18" />
                  <line x1="3" y1="6" x2="3.01" y2="6" />
                  <line x1="3" y1="12" x2="3.01" y2="12" />
                  <line x1="3" y1="18" x2="3.01" y2="18" />
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="7" height="18" rx="2" />
                  <rect x="14" y="3" width="7" height="18" rx="2" />
                </svg>
              )}
            </button>
          )}

          {!wide && hasListMenu && (
            <button className="round" onClick={onOpenListMenu} aria-label="Меню списка">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="5" cy="12" r="2" />
                <circle cx="12" cy="12" r="2" />
                <circle cx="19" cy="12" r="2" />
              </svg>
            </button>
          )}
        </header>
      )}

      {canAddHere && onAddFromBar && (
        <AddBar target={addBarTarget ?? 'Входящие'} ctx={ctx} onAdd={onAddFromBar} />
      )}

      {wide && tasksSection && !boardLayout && !hasPane && <EmptyPane />}

      {/* 3. Main Viewport Content */}
      <main className="main">{children}</main>

      {/* 4. Floating Action Buttons (FAB) */}
      {effectiveView.type === 'calendar' && (
        <button className="primary fab" onClick={onOpenQuickAdd} aria-label="Добавить">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      )}

      {effectiveView.type === 'countdown' && (
        <button className="primary fab" onClick={onOpenCountdownAdd} aria-label="Добавить событие">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      )}

      {(effectiveView.type === 'smart' || effectiveView.type === 'project' || effectiveView.type === 'tag') && (
        <button className="primary fab" onClick={onOpenQuickAdd} aria-label="Добавить задачу">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>
      )}

      {/* 5. Mobile TabBar */}
      <TabBar active={tabOf(effectiveView)} dayOfMonth={Number(today(ctx).slice(8))} moreOpen={moreOpen} onSelect={onSelectTab} />

      {/* 6. Navigation Drawer */}
      {(!wide || showSide) && (
        <Drawer
          docked={wide}
          dayOfMonth={Number(today(ctx).slice(8))}
          open={drawer}
          smartIds={menuLists}
          view={effectiveView}
          projects={sortedProjects}
          groups={groups}
          email={user.email}
          counts={counts}
          objectsCount={objectsCount}
          tags={tags}
          waiting={waiting}
          trashCount={trashCount}
          onCreateProject={onCreateProject}
          onCreateGroup={onCreateGroup}
          onRenameGroup={onRenameGroup}
          onDeleteGroup={onDeleteGroup}
          onToggleGroup={onToggleGroup}
          onMoveToGroup={onMoveToGroup}
          onSettings={() => (wide ? onOpenSettings() : onSelectView({ type: 'settings' }))}
          onSelect={onSelectView}
          onClose={() => setDrawer(false)}
        />
      )}

      {/* 7. Undo Floating Button */}
      {undo && (
        <button key={undo.key} className="undo" aria-label="Отменить" onClick={() => (undo.run(), setUndo(null))}>
          <UndoIcon size={24} />
        </button>
      )}
    </div>
  )
}
