import type { DayKey } from '../../domain/dates'
import type { Task } from '../../domain/types'
import type { PopItem } from '../PopMenu'

export type ModalSpec =
  | {
      type: 'task-detail'
      taskId: string
      focus?: 'item' | 'tag' | null
    }
  | {
      type: 'date-picker'
      taskId: string
    }
  | {
      type: 'quick-add'
      defaultDay?: DayKey | null
      defaultTime?: string | null
      defaultProjectId?: string | null
      columnId?: string | null
    }
  | {
      type: 'task-menu'
      task: Task
    }
  | {
      type: 'history'
      taskId: string
    }
  | {
      type: 'project-sheet'
      projectId: string
    }
  | {
      type: 'sort-group'
    }
  | {
      type: 'more-sheet'
    }
  | {
      type: 'settings'
    }
  | {
      type: 'list-menu'
      items: PopItem[]
      label?: string
    }
  | {
      type: 'confirm'
      title: string
      desc: string
      confirmText?: string
      cancelText?: string
      danger?: boolean
      onConfirm: () => void
      onCancel?: () => void
    }

export type ModalType = ModalSpec['type']

export interface ModalEntry {
  id: string
  spec: ModalSpec
}

export interface ModalContextValue {
  stack: ModalEntry[]
  topModal: ModalEntry | null
  openModal: (spec: ModalSpec) => string
  closeModal: (id?: string) => void
  closeTopModal: () => boolean
  closeAllModals: () => void
  isModalOpen: (type?: ModalType) => boolean
}

