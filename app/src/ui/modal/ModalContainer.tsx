import { useEffect, useState, type ReactNode } from 'react'
import type { DateCtx } from '../../domain/dates'
import { dateValueOf } from '../../domain/datevalue'
import { datePatchOf } from '../../domain/datevalue'
import { orderBetween } from '../../domain/order'
import type { Project, ProjectGroup, Task } from '../../domain/types'
import type { FilesRepo } from '../../data/files'
import type { TaskFile } from '../../domain/files'
import { openFile, prepareUpload } from '../../platform/files'
import type { ProjectsRepo } from '../../data/projects'
import type { TasksRepo } from '../../data/tasks'
import type { MenuListId, TaskViewMode } from '../../platform/theme'
import { setMenuLists } from '../../platform/theme'
import type { User } from '../../platform/auth'
import { signOut } from '../../platform/auth'
import { DatePicker } from '../DatePicker'
import { HistorySheet } from '../HistorySheet'
import { MoreSheet } from '../MoreSheet'
import { PopMenu } from '../PopMenu'
import { ProjectSheet } from '../ProjectSheet'
import { SettingsDesktop } from '../SettingsDesktop'
import { SortGroupSheet } from '../SortGroupSheet'
import { TaskMenu } from '../TaskMenu'
import { TaskQuickAdd, type QuickTask } from '../TaskQuickAdd'
import { TaskSheet } from '../TaskSheet'
import { useExit } from '../useExit'
import type { View } from '../view'
import { useModalStack } from './useModalStack'
import { shareText } from '../../platform/share'
import { describeDateValue } from '../../domain/datevalue'
import { plainText } from '../../domain/extras'
import type { GroupMode } from '../../domain/groups'
import type { SortMode, SortOrder } from '../../domain/sort'
import { StorageService, STORAGE_KEYS } from '../../platform/storage'

export interface ModalContainerProps {
  tasks: Task[] | null
  projects: Project[]
  groups: ProjectGroup[]
  tags: Array<{ tag: string; count: number }>
  ctx: DateCtx
  user: User
  wide: boolean
  taskMode: TaskViewMode
  tasksRepo: TasksRepo
  projectsRepo: ProjectsRepo
  filesRepo: FilesRepo
  groupMode: GroupMode
  sortMode: SortMode
  sortOrder: SortOrder
  setGroupMode: (m: GroupMode) => void
  setSortMode: (m: SortMode) => void
  setSortOrder: (o: SortOrder) => void
  onToggle: (t: Task) => void
  onSkip: (t: Task) => void
  onDuplicate: (t: Task) => void
  onDuplicateProject: (p: Project) => void
  onDeleteProject: (id: string) => void
  importBundle: (bundle: any) => Promise<any>
  menuLists: MenuListId[]
  setMenuListsState: (ids: MenuListId[]) => void
  setTaskModeState: (mode: TaskViewMode) => void
  onViewChange: (v: View) => void
  trashCount?: number
}

export function ModalContainer(props: ModalContainerProps): ReactNode {
  const {
    tasks,
    projects,
    groups,
    tags,
    ctx,
    user,
    wide,
    taskMode,
    tasksRepo,
    projectsRepo,
    filesRepo,
    groupMode,
    sortMode,
    sortOrder,
    setGroupMode,
    setSortMode,
    setSortOrder,
    onToggle,
    onSkip,
    onDuplicate,
    onDuplicateProject,
    onDeleteProject,
    importBundle,
    menuLists,
    setMenuListsState,
    setTaskModeState,
    onViewChange,
    trashCount = 0,
  } = props

  const { stack, closeModal, openModal } = useModalStack()

  const [files, setFiles] = useState<TaskFile[]>([])
  const [fileStatus, setFileStatus] = useState<string | null>(null)

  function share(t: Task) {
    const when = describeDateValue(dateValueOf(t, ctx), ctx)
    const text = [t.title, when, t.address, plainText(t.content).trim()].filter(Boolean).join('\n')
    void shareText(t.title, text).catch(() => undefined)
  }

  // Находим активные модалки каждого типа в стеке
  const openedModal = stack.find((m) => m.spec.type === 'task-detail')
  const dateModal = stack.find((m) => m.spec.type === 'date-picker')
  const quickModal = stack.find((m) => m.spec.type === 'quick-add')
  const menuModal = stack.find((m) => m.spec.type === 'task-menu')
  const historyModal = stack.find((m) => m.spec.type === 'history')
  const projectModal = stack.find((m) => m.spec.type === 'project-sheet')
  const sortGroupModal = stack.find((m) => m.spec.type === 'sort-group')
  const moreModal = stack.find((m) => m.spec.type === 'more-sheet')
  const settingsModal = stack.find((m) => m.spec.type === 'settings')
  const listMenuModal = stack.find((m) => m.spec.type === 'list-menu')
  const confirmModal = stack.find((m) => m.spec.type === 'confirm')

  const openedSpec = openedModal?.spec.type === 'task-detail' ? openedModal.spec : null
  const dateSpec = dateModal?.spec.type === 'date-picker' ? dateModal.spec : null
  const historySpec = historyModal?.spec.type === 'history' ? historyModal.spec : null
  const projectSpec = projectModal?.spec.type === 'project-sheet' ? projectModal.spec : null
  const quickSpec = quickModal?.spec.type === 'quick-add' ? quickModal.spec : null
  const menuSpec = menuModal?.spec.type === 'task-menu' ? menuModal.spec : null
  const confirmSpec = confirmModal?.spec.type === 'confirm' ? confirmModal.spec : null

  // Резолв сущностей
  const openedTask = openedSpec ? (tasks ?? []).find((t) => t.id === openedSpec.taskId) ?? null : null
  const dateTask = dateSpec ? (tasks ?? []).find((t) => t.id === dateSpec.taskId) ?? null : null
  const historyTask = historySpec ? (tasks ?? []).find((t) => t.id === historySpec.taskId) ?? null : null
  const projectObj = projectSpec ? projects.find((p) => p.id === projectSpec.projectId) ?? null : null

  // Exit animations
  const exOpened = useExit(openedTask)
  const exDate = useExit(dateTask)
  const exQuick = useExit(quickSpec)
  const exMenu = useExit(menuSpec)
  const exHistory = useExit(historyTask)
  const exProject = useExit(projectObj)
  const exMore = useExit(Boolean(moreModal))
  const exSettings = useExit(Boolean(settingsModal))

  const ox = exOpened.value
  const dx = exDate.value
  const mx = exMenu.value && exMenu.value.type === 'task-menu' ? exMenu.value.task : null
  const hx = exHistory.value
  const pj = exProject.value
  const qx = exQuick.value && exQuick.value.type === 'quick-add' ? exQuick.value : null

  useEffect(() => {
    if (!ox) {
      setFiles([])
      return
    }
    return filesRepo.subscribe(ox.id, setFiles)
  }, [ox?.id, filesRepo])

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

  return (
    <>
      {/* 1. Quick Add Sheet */}
      {qx && (
        <TaskQuickAdd
          leaving={exQuick.leaving}
          ctx={ctx}
          projects={projects}
          defaultProjectId={qx.defaultProjectId ?? (projects[0]?.id ?? 'inbox')}
          defaultDay={qx.defaultDay ?? null}
          defaultTime={qx.defaultTime ?? null}
          allTags={tags.map((t) => t.tag)}
          onSubmit={async (q: QuickTask) => {
            const columnId = qx.columnId ?? null
            const last = (tasks ?? []).reduce((m, t) => Math.max(m, t.sortOrder), 0)
            const patch = datePatchOf(q.date, ctx)
            await tasksRepo.create({
              projectId: q.projectId,
              title: q.title,
              tags: q.tags,
              priority: q.priority,
              content: q.content,
              columnId,
              sortOrder: orderBetween(last || null, null),
              ...patch.fields,
              reminders: Object.fromEntries(patch.reminders.map((trigger, i) => [`r${i + 1}`, { trigger }])),
            })
            closeModal(quickModal?.id)
          }}
          onClose={() => closeModal(quickModal?.id)}
        />
      )}

      {/* 2. Sort & Group Sheet */}
      {sortGroupModal && (
        <SortGroupSheet
          open={Boolean(sortGroupModal)}
          groupMode={groupMode}
          sortMode={sortMode}
          sortOrder={sortOrder}
          onChangeGroup={(m) => {
            setGroupMode(m)
            StorageService.set(STORAGE_KEYS.GROUP_MODE, m)
            closeModal(sortGroupModal.id)
          }}
          onChangeSort={(m) => {
            setSortMode(m)
            StorageService.set(STORAGE_KEYS.SORT_MODE, m)
            closeModal(sortGroupModal.id)
          }}
          onChangeOrder={(o) => {
            setSortOrder(o)
            StorageService.set(STORAGE_KEYS.SORT_ORDER, o)
            closeModal(sortGroupModal.id)
          }}
          onClose={() => closeModal(sortGroupModal.id)}
        />
      )}

      {/* 3. More Sheet (Mobile TabBar "+ More") */}
      {exMore.value && (
        <MoreSheet
          leaving={exMore.leaving}
          trashCount={trashCount}
          onOpenDone={() => {
            onViewChange({ type: 'smart', id: 'done' })
            closeModal(moreModal?.id)
          }}
          onOpenTrash={() => {
            onViewChange({ type: 'trash' })
            closeModal(moreModal?.id)
          }}
          onOpenAssistant={() => {
            onViewChange({ type: 'assistant' })
            closeModal(moreModal?.id)
          }}
          onOpenSearch={() => {
            onViewChange({ type: 'search' })
            closeModal(moreModal?.id)
          }}
          onOpenMatrix={() => {
            onViewChange({ type: 'matrix' })
            closeModal(moreModal?.id)
          }}
          onOpenPomo={() => {
            onViewChange({ type: 'pomo' })
            closeModal(moreModal?.id)
          }}
          onOpenCountdown={() => {
            onViewChange({ type: 'countdown' })
            closeModal(moreModal?.id)
          }}
          onOpenSettings={() => {
            onViewChange({ type: 'settings' })
            closeModal(moreModal?.id)
          }}
          onClose={() => closeModal(moreModal?.id)}
        />
      )}

      {/* 4. Task Detail Sheet / Dialog */}
      {ox && (
        <TaskSheet
          leaving={exOpened.leaving}
          task={ox}
          mode={wide ? 'dialog' : taskMode}
          projects={projects}
          ctx={ctx}
          onToggle={() => onToggle(ox)}
          onPin={() => void tasksRepo.update(ox.id, { pinnedAt: ox.pinnedAt === null ? Date.now() : null })}
          onShare={() => share(ox)}
          onSkip={() => {
            onSkip(ox)
            closeModal(openedModal?.id)
          }}
          onHistory={() => openModal({ type: 'history', taskId: ox.id })}
          onDuplicate={() => void onDuplicate(ox)}
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
            closeModal(openedModal?.id)
          }}
          onClose={() => closeModal(openedModal?.id)}
        />
      )}

      {/* 5. List Pop Menu */}
      {listMenuModal && listMenuModal.spec.type === 'list-menu' && (
        <PopMenu label={listMenuModal.spec.label ?? 'Меню списка'} items={listMenuModal.spec.items} onClose={() => closeModal(listMenuModal.id)} />
      )}

      {/* 6. Task Context Menu */}
      {mx && (
        <TaskMenu
          leaving={exMenu.leaving}
          task={mx}
          ctx={ctx}
          onPin={() => void tasksRepo.update(mx.id, { pinnedAt: mx.pinnedAt === null ? Date.now() : null })}
          onShare={() => share(mx)}
          onSkip={() => {
            onSkip(mx)
            closeModal(menuModal?.id)
          }}
          onRemove={() => {
            void tasksRepo.softDelete(mx.id)
            closeModal(menuModal?.id)
          }}
          onDate={() => {
            closeModal(menuModal?.id)
            openModal({ type: 'date-picker', taskId: mx.id })
          }}
          projects={projects}
          onPriority={(priority) => void tasksRepo.update(mx.id, { priority })}
          onMove={(projectId) => void tasksRepo.update(mx.id, { projectId, columnId: null })}
          onDuplicate={() => {
            void onDuplicate(mx)
            closeModal(menuModal?.id)
          }}
          onOpen={(focus) => {
            closeModal(menuModal?.id)
            openModal({ type: 'task-detail', taskId: mx.id, focus })
          }}
          onClose={() => closeModal(menuModal?.id)}
        />
      )}

      {/* 7. Date Picker Sheet */}
      {dx && (
        <DatePicker
          leaving={exDate.leaving}
          ctx={ctx}
          value={dateValueOf(dx, ctx)}
          onApply={(v) => {
            const p = datePatchOf(v, ctx)
            void tasksRepo.update(dx.id, p.fields)
            void tasksRepo.setReminders(dx.id, p.reminders)
            closeModal(dateModal?.id)
          }}
          onClose={() => closeModal(dateModal?.id)}
        />
      )}

      {/* 8. History Sheet */}
      {hx && (
        <HistorySheet
          leaving={exHistory.leaving}
          key={`history-${hx.id}`}
          task={hx}
          projects={projects}
          ctx={ctx}
          subscribe={(cb) => tasksRepo.subscribeHistory(hx.id, cb, (e) => console.error(e))}
          onRollback={(patch) => {
            void tasksRepo.update(hx.id, patch as never)
            closeModal(historyModal?.id)
          }}
          onClose={() => closeModal(historyModal?.id)}
        />
      )}

      {/* 9. Project Settings Sheet */}
      {pj && (
        <ProjectSheet
          leaving={exProject.leaving}
          key={pj.id}
          project={pj}
          groups={groups}
          taskCount={(tasks ?? []).filter((t) => t.projectId === pj.id).length}
          onChange={(patch) => void projectsRepo.update(pj.id, patch)}
          onSiteField={(field, value) => void projectsRepo.setSiteField(pj.id, field, value)}
          onDelete={() => onDeleteProject(pj.id)}
          onDuplicate={() => void onDuplicateProject(pj)}
          onClose={() => closeModal(projectModal?.id)}
        />
      )}

      {/* 10. Desktop Settings Dialog */}
      {wide && exSettings.value && (
        <SettingsDesktop
          leaving={exSettings.leaving}
          menuLists={menuLists}
          onMenuLists={(ids) => {
            setMenuListsState(ids)
            setMenuLists(ids)
          }}
          onImport={importBundle}
          email={user.email}
          onTaskMode={setTaskModeState}
          onSignOut={() => void signOut()}
          onClose={() => closeModal(settingsModal?.id)}
        />
      )}

      {/* 11. Confirmation Dialog */}
      {confirmSpec && (
        <div className="m-confirm-overlay" onClick={() => closeModal(confirmModal?.id)}>
          <div className="m-confirm-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="m-confirm-title">{confirmSpec.title}</div>
            <div className="m-confirm-desc">{confirmSpec.desc}</div>
            <div className="m-confirm-actions">
              <button
                type="button"
                className="m-confirm-cancel"
                onClick={() => {
                  confirmSpec.onCancel?.()
                  closeModal(confirmModal?.id)
                }}
              >
                {confirmSpec.cancelText ?? 'Отмена'}
              </button>
              <button
                type="button"
                className="m-confirm-ok"
                onClick={() => {
                  confirmSpec.onConfirm()
                  closeModal(confirmModal?.id)
                }}
              >
                {confirmSpec.confirmText ?? 'Подтвердить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
