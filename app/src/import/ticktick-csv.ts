import { INBOX_ID } from '../domain/types'
import type { ChecklistItem } from '../domain/types'
import type { ImportBundle } from './bundle'
import {
  convertTask,
  importedColumnId,
  importedGroupId,
  importedId,
  type ImportedColumn,
  type ImportedGroup,
  type ImportedProject,
  type ImportedTask,
  type RawTask,
} from './ticktick'

/**
 * Разбор стандартного CSV-файла резервной копии из официального TickTick
 * (Настройки -> Резервное копирование -> Создать резервную копию .csv).
 * Поддерживает многострочные поля в кавычках, папки, списки, колонки канбана,
 * открытые и выполненные задачи, заметки, чек-листы и подзадачи (parentId).
 */

export function parseCsvRows(text: string): string[][] {
  const clean = text.replace(/^\uFEFF/, '')
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i]
    if (inQuotes) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += ch
      }
    } else {
      if (ch === '"') {
        inQuotes = true
      } else if (ch === ',') {
        row.push(field)
        field = ''
      } else if (ch === '\r') {
        if (clean[i + 1] === '\n') i++
        row.push(field)
        rows.push(row)
        row = []
        field = ''
      } else if (ch === '\n') {
        row.push(field)
        rows.push(row)
        row = []
        field = ''
      } else {
        field += ch
      }
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

function slugId(text: string): string {
  let h = 2166136261
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(36)
}

/**
 * В CSV-выгрузке TickTick пункты чек-листа хранятся внутри поля Content строками вида:
 * "[ ] Купить молоко" или "[x] Позвонить" (либо "▪ ...").
 */
function extractChecklistFromContent(content: string): { restContent: string; items: Record<string, ChecklistItem> } {
  const lines = content.split(/\r?\n/)
  const items: Record<string, ChecklistItem> = {}
  const kept: string[] = []
  let idx = 0

  for (const line of lines) {
    const m = /^\s*\[([ xX✓vV])\]\s*(.+)$/.exec(line)
    if (m) {
      const done = m[1].trim() !== ''
      const title = m[2].trim()
      items[`item_${idx + 1}`] = {
        title,
        done,
        sortOrder: idx,
      }
      idx++
    } else {
      kept.push(line)
    }
  }

  return {
    restContent: kept.join('\n').trim(),
    items,
  }
}

export function isTickTickCsv(text: string): boolean {
  const head = text.slice(0, 2000)
  return (
    head.includes('"Folder Name"') ||
    head.includes('"List Name"') ||
    (head.includes('List Name') && head.includes('Title') && head.includes('Status'))
  )
}

export function parseTickTickCsv(text: string): ImportBundle {
  const allRows = parseCsvRows(text)

  // Ищем строку заголовков таблицы (пропуская служебную шапку Date / Version / Status)
  let headerIdx = -1
  for (let i = 0; i < Math.min(allRows.length, 25); i++) {
    const r = allRows[i].map((c) => c.trim().toLowerCase())
    if (r.includes('title') && (r.includes('list name') || r.includes('status'))) {
      headerIdx = i
      break
    }
  }
  if (headerIdx === -1) {
    throw new Error('В CSV-файле не найдена таблица задач TickTick (колонки List Name, Title, Status)')
  }

  const headers = allRows[headerIdx].map((h) => h.trim().toLowerCase())
  const colIdx = (name: string) => headers.indexOf(name.toLowerCase())

  const idxFolder = colIdx('folder name')
  const idxList = colIdx('list name')
  const idxTitle = colIdx('title')
  const idxKind = colIdx('kind')
  const idxTags = colIdx('tags')
  const idxContent = colIdx('content')
  const idxIsChecklist = colIdx('is check list')
  const idxStart = colIdx('start date')
  const idxDue = colIdx('due date')
  const idxReminder = colIdx('reminder')
  const idxRepeat = colIdx('repeat')
  const idxPriority = colIdx('priority')
  const idxStatus = colIdx('status')
  const idxCompleted = colIdx('completed time')
  const idxOrder = colIdx('order')
  const idxTz = colIdx('timezone')
  const idxAllDay = colIdx('is all day')
  const idxFloating = colIdx('is floating')
  const idxColumn = colIdx('column name')
  const idxColOrder = colIdx('column order')
  const idxViewMode = colIdx('view mode')
  const idxTaskId = colIdx('taskid')
  const idxParentId = colIdx('parentid')

  const groupsMap = new Map<string, ImportedGroup>()
  const projectsMap = new Map<string, ImportedProject>()
  const rawProjIds = new Set<string>()
  const columnsMap = new Map<string, ImportedColumn>()
  const rawColIds = new Set<string>()
  const tasks: ImportedTask[] = []

  const getCell = (row: string[], i: number): string => (i >= 0 && i < row.length ? row[i].trim() : '')

  for (let rIdx = headerIdx + 1; rIdx < allRows.length; rIdx++) {
    const row = allRows[rIdx]
    if (!row || row.every((c) => !c.trim())) continue

    const title = getCell(row, idxTitle)
    const contentRaw = getCell(row, idxContent)
    if (!title && !contentRaw) continue

    const folderName = getCell(row, idxFolder)
    const listName = getCell(row, idxList)
    const viewModeRaw = getCell(row, idxViewMode).toLowerCase()
    const colName = getCell(row, idxColumn)
    const colOrder = Number(getCell(row, idxColOrder) || 0)

    let rawGroupId: string | null = null
    if (folderName) {
      rawGroupId = `csv-g-${slugId(folderName)}`
      const gId = importedGroupId(rawGroupId)
      if (!groupsMap.has(gId)) {
        groupsMap.set(gId, {
          id: gId,
          name: folderName,
          sortOrder: groupsMap.size,
          collapsed: false,
        })
      }
    }

    const isInbox = !listName || /^(inbox|входящие)$/i.test(listName)
    const rawProjectId = isInbox ? INBOX_ID : `csv-p-${slugId(listName)}`
    rawProjIds.add(rawProjectId)
    if (!isInbox) {
      const pId = importedId(rawProjectId)
      if (!projectsMap.has(pId)) {
        projectsMap.set(pId, {
          id: pId,
          name: listName,
          color: null,
          groupId: rawGroupId ? importedGroupId(rawGroupId) : null,
          sortOrder: projectsMap.size,
          viewMode: viewModeRaw === 'kanban' ? 'kanban' : 'list',
          kind: 'task',
          isInbox: false,
          closed: false,
          site: null,
        })
      }
    }

    let rawColId: string | null = null
    if (colName && !/^(ungrouped|несгруппированн)/i.test(colName)) {
      rawColId = `csv-c-${slugId(`${rawProjectId}:${colName}`)}`
      rawColIds.add(rawColId)
      const cId = importedColumnId(rawColId)
      if (!columnsMap.has(cId)) {
        columnsMap.set(cId, {
          id: cId,
          projectId: isInbox ? INBOX_ID : importedId(rawProjectId),
          name: colName,
          sortOrder: Number.isNaN(colOrder) ? columnsMap.size : colOrder,
        })
      }
    }

    const rawTaskId = getCell(row, idxTaskId) || `csv-t-${rIdx}-${slugId(title + contentRaw)}`
    const rawParentId = getCell(row, idxParentId) || null
    const kindCell = getCell(row, idxKind).toUpperCase()
    const isCheckCell = /^(y|yes|true|1)$/i.test(getCell(row, idxIsChecklist))
    const isAllDay = /^(y|yes|true|1)$/i.test(getCell(row, idxAllDay))
    const isFloating = /^(y|yes|true|1)$/i.test(getCell(row, idxFloating))

    const tagsStr = getCell(row, idxTags)
    const tags = tagsStr
      ? tagsStr
          .split(/[,;]/)
          .map((t) => t.trim().replace(/^#/, ''))
          .filter(Boolean)
      : []

    const reminderStr = getCell(row, idxReminder)
    const reminders = reminderStr
      ? reminderStr
          .split(/[,;]/)
          .map((t) => t.trim())
          .filter(Boolean)
          .map((trigger, i) => ({ id: `r${i + 1}`, trigger }))
      : []

    const rawTask: RawTask = {
      id: rawTaskId,
      projectId: rawProjectId,
      parentId: rawParentId,
      columnId: rawColId,
      title: title || (contentRaw.split('\n')[0]?.slice(0, 80) ?? 'Без названия'),
      content: contentRaw,
      kind: isCheckCell || kindCell === 'CHECKLIST' ? 'CHECKLIST' : kindCell === 'NOTE' ? 'NOTE' : 'TEXT',
      priority: Number(getCell(row, idxPriority) || 0),
      status: Number(getCell(row, idxStatus) || 0),
      deleted: 0,
      isAllDay,
      isFloating,
      timeZone: getCell(row, idxTz) || null,
      startDate: getCell(row, idxStart) || null,
      dueDate: getCell(row, idxDue) || null,
      completedTime: getCell(row, idxCompleted) || null,
      repeatFlag: getCell(row, idxRepeat) || null,
      reminders,
      tags,
      sortOrder: Number(getCell(row, idxOrder) || rIdx),
    }

    const converted = convertTask(rawTask, rawProjIds, rawColIds).value
    if (converted) {
      if (isCheckCell || kindCell === 'CHECKLIST' || /^\s*\[([ xX✓vV])\]/m.test(contentRaw)) {
        const { restContent, items } = extractChecklistFromContent(contentRaw)
        if (Object.keys(items).length > 0) {
          converted.items = items
          converted.content = restContent
          converted.kind = 'checklist'
        }
      }
      tasks.push(converted)
    }
  }

  return {
    version: 1,
    groups: [...groupsMap.values()],
    columns: [...columnsMap.values()],
    projects: [...projectsMap.values()],
    tasks,
    habits: [],
    checkins: [],
    files: [],
  }
}

