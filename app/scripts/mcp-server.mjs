#!/usr/bin/env node
/**
 * MCP-сервер (Model Context Protocol) для TickTick 2.0.
 * Позволяет подключать Claude Desktop, Gemini CLI, Antigravity, Cursor и ChatGPT/OpenAI Agents
 * напрямую к базе задач, списков и привычек пользователя в Firebase Firestore.
 *
 * Авторизация (передается через переменные окружения в конфиге MCP):
 *   Вариант 1 (вход по Google или почте):
 *     TICKTICK_REFRESH_TOKEN="<refresh_token из настроек приложения>"
 *   Вариант 2 (вход по почте и паролю):
 *     TICKTICK_EMAIL="user@example.com"
 *     TICKTICK_PASSWORD="secret"
 */

import { randomBytes } from 'node:crypto'
import * as readline from 'node:readline'

const FIREBASE_API_KEY = process.env.TICKTICK_API_KEY || 'AIzaSyA_TbrL3kAd292kSiqe3vBXZX6ALMlEaZY'
const FIREBASE_PROJECT_ID = process.env.TICKTICK_PROJECT_ID || 'ticktick-47613'
const FIRESTORE_BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents`

// Кэш авторизации (idToken живёт 1 час, обновляется автоматически)
let authState = {
  uid: process.env.TICKTICK_UID || '',
  idToken: '',
  refreshToken: process.env.TICKTICK_REFRESH_TOKEN || '',
  expiresAt: 0,
}

function generateId(len = 20) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const bytes = randomBytes(len)
  let out = ''
  for (let i = 0; i < len; i++) out += chars[bytes[i] % chars.length]
  return out
}

function todayStr(tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC') {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]))
  return `${map.year}-${map.month}-${map.day}`
}

/**
 * Получает актуальный idToken и uid пользователя через Firebase Auth REST API.
 */
async function ensureAuth() {
  const now = Date.now()
  if (authState.idToken && authState.uid && now < authState.expiresAt - 60_000) {
    return { uid: authState.uid, idToken: authState.idToken }
  }

  // 1. Если есть refreshToken — обмениваем его на свежий idToken
  if (authState.refreshToken) {
    const res = await fetch(`https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: authState.refreshToken,
      }),
    })
    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Ошибка обновления токена Firebase (${res.status}): ${errText}`)
    }
    const data = await res.json()
    authState.idToken = data.id_token
    authState.refreshToken = data.refresh_token || authState.refreshToken
    authState.uid = data.user_id || authState.uid
    authState.expiresAt = now + Number(data.expires_in || 3600) * 1000
    return { uid: authState.uid, idToken: authState.idToken }
  }

  // 2. Иначе входим по TICKTICK_EMAIL и TICKTICK_PASSWORD
  const email = process.env.TICKTICK_EMAIL
  const password = process.env.TICKTICK_PASSWORD
  if (!email || !password) {
    throw new Error(
      'Не заданы данные для входа. Укажите TICKTICK_REFRESH_TOKEN (можно скопировать в Настройках -> Функции ИИ в приложении) либо TICKTICK_EMAIL и TICKTICK_PASSWORD в переменных окружения MCP-сервера.',
    )
  }

  const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: email.trim(), password, returnSecureToken: true }),
  })
  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Ошибка входа в Firebase по почте/паролю (${res.status}): ${errText}`)
  }
  const data = await res.json()
  authState.idToken = data.idToken
  authState.refreshToken = data.refreshToken
  authState.uid = data.localId
  authState.expiresAt = now + Number(data.expiresIn || 3600) * 1000
  return { uid: authState.uid, idToken: authState.idToken }
}

/**
 * Конвертация между JS-значениями и форматом Firestore REST API Value.
 */
export function toFirestoreValue(val) {
  if (val === null || val === undefined) return { nullValue: null }
  if (val instanceof Date) return { timestampValue: val.toISOString() }
  if (typeof val === 'boolean') return { booleanValue: val }
  if (typeof val === 'number') {
    return Number.isInteger(val) ? { integerValue: String(val) } : { doubleValue: val }
  }
  if (typeof val === 'string') return { stringValue: val }
  if (Array.isArray(val)) {
    return { arrayValue: { values: val.map((v) => toFirestoreValue(v)) } }
  }
  if (typeof val === 'object') {
    const fields = {}
    for (const [k, v] of Object.entries(val)) {
      if (v !== undefined) fields[k] = toFirestoreValue(v)
    }
    return { mapValue: { fields } }
  }
  return { stringValue: String(val) }
}

export function fromFirestoreValue(v) {
  if (!v || typeof v !== 'object') return null
  if ('nullValue' in v) return null
  if ('booleanValue' in v) return Boolean(v.booleanValue)
  if ('integerValue' in v) return Number(v.integerValue)
  if ('doubleValue' in v) return Number(v.doubleValue)
  if ('stringValue' in v) return String(v.stringValue)
  if ('timestampValue' in v) return v.timestampValue
  if ('arrayValue' in v) {
    return (v.arrayValue?.values || []).map((item) => fromFirestoreValue(item))
  }
  if ('mapValue' in v) {
    const out = {}
    const fields = v.mapValue?.fields || {}
    for (const [k, fv] of Object.entries(fields)) {
      out[k] = fromFirestoreValue(fv)
    }
    return out
  }
  return null
}

export function fromFirestoreDoc(doc) {
  const id = doc.name ? doc.name.split('/').pop() : ''
  const out = { id }
  for (const [k, fv] of Object.entries(doc.fields || {})) {
    out[k] = fromFirestoreValue(fv)
  }
  return out
}

async function listCollection(colName) {
  const { uid, idToken } = await ensureAuth()
  const docs = []
  let pageToken = ''
  do {
    const url = new URL(`${FIRESTORE_BASE}/users/${uid}/${colName}`)
    url.searchParams.set('pageSize', '300')
    if (pageToken) url.searchParams.set('pageToken', pageToken)
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${idToken}` },
    })
    if (!res.ok) {
      const txt = await res.text()
      throw new Error(`Ошибка чтения коллекции ${colName} (${res.status}): ${txt}`)
    }
    const data = await res.json()
    for (const d of data.documents || []) {
      docs.push(fromFirestoreDoc(d))
    }
    pageToken = data.nextPageToken || ''
  } while (pageToken)
  return docs
}

async function setDocument(colName, docId, fieldsObj, maskFields = null) {
  const { uid, idToken } = await ensureAuth()
  const url = new URL(`${FIRESTORE_BASE}/users/${uid}/${colName}/${encodeURIComponent(docId)}`)
  if (Array.isArray(maskFields) && maskFields.length > 0) {
    for (const f of maskFields) url.searchParams.append('updateMask.fieldPaths', f)
  }
  const fields = {}
  for (const [k, v] of Object.entries(fieldsObj)) {
    if (v !== undefined) fields[k] = toFirestoreValue(v)
  }
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Ошибка записи ${colName}/${docId} (${res.status}): ${txt}`)
  }
  return fromFirestoreDoc(await res.json())
}

function normalizeDueInput(dueInput, isAllDayInput) {
  if (dueInput === undefined) return { due: undefined, isAllDay: isAllDayInput }
  if (dueInput === null || dueInput === '') return { due: null, isAllDay: false }
  if (typeof dueInput === 'number') return { due: dueInput, isAllDay: Boolean(isAllDayInput) }
  const str = String(dueInput).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) {
    return { due: str, isAllDay: isAllDayInput ?? true }
  }
  const parsed = Date.parse(str)
  if (!Number.isNaN(parsed)) {
    return { due: parsed, isAllDay: Boolean(isAllDayInput) }
  }
  throw new Error(`Неверный формат даты due: "${dueInput}". Используйте "YYYY-MM-DD" или ISO "YYYY-MM-DDTHH:mm:ss"`)
}

function dueToDayString(due) {
  if (due === null || due === undefined) return null
  if (typeof due === 'string' && /^\d{4}-\d{2}-\d{2}/.test(due)) return due.slice(0, 10)
  if (typeof due === 'number') {
    const d = new Date(due)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }
  return null
}

function formatTaskSummary(t, projectsMap) {
  const projName = projectsMap.get(t.projectId) || (t.projectId === 'inbox' ? 'Входящие' : t.projectId)
  const prioMap = { 0: 'нет', 1: 'низкий (!)', 3: 'средний (!!)', 5: 'высокий (!!!)' }
  const dueStr =
    t.due === null || t.due === undefined
      ? 'без срока'
      : typeof t.due === 'string'
        ? t.due
        : new Date(t.due).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })
  const items = Object.values(t.items || {})
  const checklistInfo = items.length ? ` | Чек-лист: ${items.filter((i) => i.done).length}/${items.length}` : ''
  const tagsInfo = Array.isArray(t.tags) && t.tags.length ? ` | Теги: #${t.tags.join(' #')}` : ''
  return `[${t.status === 'done' ? 'x' : ' '}] ${t.title} (id: ${t.id} | список: ${projName} | срок: ${dueStr} | приоритет: ${prioMap[t.priority] || 'нет'}${tagsInfo}${checklistInfo})`
}

/**
 * Описание инструментов MCP
 */
export const TOOLS = [
  {
    name: 'get_agenda',
    description:
      'Возвращает сводку пользователя на сегодня: просроченные задачи, задачи на сегодня, планы на ближайшие 7 дней и активные привычки со статусом отметки за сегодня.',
    inputSchema: {
      type: 'object',
      properties: {
        day: {
          type: 'string',
          description: 'Дата в формате YYYY-MM-DD (по умолчанию сегодняшняя дата)',
        },
      },
    },
  },
  {
    name: 'list_tasks',
    description:
      'Список и фильтрация задач в TickTick 2.0 (по статусу, проекту/списку, приоритету, тегу, тексту или дате).',
    inputSchema: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          enum: ['open', 'done', 'wontdo', 'all'],
          description: 'Статус задач (по умолчанию open)',
        },
        projectId: {
          type: 'string',
          description: 'ID списка/проекта (например "inbox") или точное имя списка',
        },
        priority: {
          type: 'number',
          enum: [0, 1, 3, 5],
          description: 'Приоритет: 0 - нет, 1 - низкий, 3 - средний, 5 - высокий',
        },
        tag: {
          type: 'string',
          description: 'Фильтр по тегу (без символа #)',
        },
        search: {
          type: 'string',
          description: 'Поиск по подстроке в названии или описании задачи',
        },
        limit: {
          type: 'number',
          description: 'Максимальное число задач в ответе (по умолчанию 50)',
        },
      },
    },
  },
  {
    name: 'create_task',
    description:
      'Создает новую задачу в TickTick 2.0. Изменения мгновенно синхронизируются на телефон, ПК и веб.',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Название задачи (обязательно)',
        },
        content: {
          type: 'string',
          description: 'Описание / заметка к задаче (поддерживает Markdown)',
        },
        projectId: {
          type: 'string',
          description: 'ID или название списка (по умолчанию "inbox" — Входящие)',
        },
        due: {
          type: 'string',
          description: 'Срок задачи: "YYYY-MM-DD" (на весь день) или ISO "YYYY-MM-DDTHH:mm:ss" (со временем)',
        },
        priority: {
          type: 'number',
          enum: [0, 1, 3, 5],
          description: 'Приоритет: 0 (нет), 1 (низкий), 3 (средний), 5 (высокий)',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Массив тегов задачи',
        },
        checklist: {
          type: 'array',
          items: { type: 'string' },
          description: 'Список пунктов чек-листа внутри задачи (опционально)',
        },
      },
      required: ['title'],
    },
  },
  {
    name: 'update_task',
    description: 'Обновляет поля существующей задачи (название, описание, срок, приоритет, список, теги).',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'ID задачи',
        },
        title: { type: 'string', description: 'Новое название задачи' },
        content: { type: 'string', description: 'Новое описание задачи' },
        projectId: { type: 'string', description: 'Новый ID или название списка' },
        due: {
          type: ['string', 'null'],
          description: 'Новый срок ("YYYY-MM-DD", ISO "YYYY-MM-DDTHH:mm:ss" или null чтобы убрать срок)',
        },
        priority: {
          type: 'number',
          enum: [0, 1, 3, 5],
          description: 'Приоритет: 0, 1, 3 или 5',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Новый массив тегов',
        },
      },
      required: ['id'],
    },
  },
  {
    name: 'complete_task',
    description: 'Отмечает задачу выполненной (или возвращает в открытые при done=false).',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID задачи' },
        done: { type: 'boolean', description: 'true — выполнена (по умолчанию), false — вернуть в работу' },
      },
      required: ['id'],
    },
  },
  {
    name: 'delete_task',
    description: 'Отправляет задачу в Корзину (мягкое удаление).',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'ID задачи' },
      },
      required: ['id'],
    },
  },
  {
    name: 'list_projects',
    description: 'Возвращает все списки задач (проекты) пользователя и количество открытых задач в каждом.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'create_project',
    description: 'Создает новый список задач (проект).',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Название списка' },
        color: { type: 'string', description: 'HEX-цвет списка, например "#4772fa"' },
        viewMode: { type: 'string', enum: ['list', 'kanban', 'timeline'], description: 'Режим отображения (по умолчанию list)' },
      },
      required: ['name'],
    },
  },
  {
    name: 'list_habits',
    description: 'Возвращает список активных привычек и статус их выполнения за указанный день.',
    inputSchema: {
      type: 'object',
      properties: {
        day: { type: 'string', description: 'Дата в формате YYYY-MM-DD (по умолчанию сегодня)' },
      },
    },
  },
  {
    name: 'checkin_habit',
    description: 'Отмечает выполнение привычки за день (done / failed).',
    inputSchema: {
      type: 'object',
      properties: {
        habitId: { type: 'string', description: 'ID привычки' },
        day: { type: 'string', description: 'День в формате YYYY-MM-DD (по умолчанию сегодня)' },
        status: { type: 'string', enum: ['done', 'failed'], description: 'Статус (по умолчанию done)' },
        note: { type: 'string', description: 'Заметка к отметке привычки (опционально)' },
      },
      required: ['habitId'],
    },
  },
]

async function resolveProjectId(inputProject, projectsList) {
  if (!inputProject || inputProject === 'inbox' || inputProject.toLowerCase() === 'входящие') return 'inbox'
  const byId = projectsList.find((p) => p.id === inputProject)
  if (byId) return byId.id
  const lower = inputProject.trim().toLowerCase()
  const byName = projectsList.find((p) => (p.name || '').trim().toLowerCase() === lower)
  if (byName) return byName.id
  return inputProject
}

export async function executeTool(name, args = {}) {
  switch (name) {
    case 'get_agenda': {
      const day = args.day || todayStr()
      const [allTasks, allProjects, allHabits, allCheckins] = await Promise.all([
        listCollection('tasks'),
        listCollection('projects'),
        listCollection('habits'),
        listCollection('habitCheckins'),
      ])
      const projectsMap = new Map(allProjects.filter((p) => !p.deletedAt).map((p) => [p.id, p.name]))
      const openTasks = allTasks.filter((t) => !t.deletedAt && t.parentId === null && t.status === 'open')

      const overdue = []
      const todayList = []
      const next7Days = []

      const baseDate = new Date(`${day}T00:00:00`)
      const plus7 = new Date(baseDate.getTime() + 7 * 86_400_000)
      const plus7Str = `${plus7.getFullYear()}-${String(plus7.getMonth() + 1).padStart(2, '0')}-${String(plus7.getDate()).padStart(2, '0')}`

      for (const t of openTasks) {
        const dStr = dueToDayString(t.due)
        if (!dStr) continue
        if (dStr < day) overdue.push(t)
        else if (dStr === day) todayList.push(t)
        else if (dStr <= plus7Str) next7Days.push(t)
      }

      const sortByPrio = (a, b) => (b.priority || 0) - (a.priority || 0)
      overdue.sort(sortByPrio)
      todayList.sort(sortByPrio)

      const activeHabits = allHabits.filter((h) => !h.deletedAt && !h.archivedAt)
      const checkinMap = new Map(
        allCheckins.filter((c) => c.day === day).map((c) => [c.habitId, c.status]),
      )

      const lines = [
        `=== Сводка TickTick 2.0 на ${day} ===`,
        '',
        `Просроченные (${overdue.length}):`,
        ...(overdue.length ? overdue.map((t) => '  ' + formatTaskSummary(t, projectsMap)) : ['  Нет просроченных задач']),
        '',
        `На сегодня (${todayList.length}):`,
        ...(todayList.length ? todayList.map((t) => '  ' + formatTaskSummary(t, projectsMap)) : ['  На сегодня задач со сроком нет']),
        '',
        `Ближайшие 7 дней (${next7Days.length}):`,
        ...(next7Days.length ? next7Days.map((t) => '  ' + formatTaskSummary(t, projectsMap)) : ['  Нет задач на ближайшую неделю']),
        '',
        `Привычки на ${day} (${activeHabits.length}):`,
        ...(activeHabits.length
          ? activeHabits.map((h) => `  [${checkinMap.get(h.id) === 'done' ? 'x' : ' '}] ${h.name} (id: ${h.id})`)
          : ['  Нет активных привычек']),
      ]
      return lines.join('\n')
    }

    case 'list_tasks': {
      const [allTasks, allProjects] = await Promise.all([listCollection('tasks'), listCollection('projects')])
      const projects = allProjects.filter((p) => !p.deletedAt)
      const projectsMap = new Map(projects.map((p) => [p.id, p.name]))
      const statusFilter = args.status || 'open'
      const targetProjectId = args.projectId ? await resolveProjectId(args.projectId, projects) : null
      const searchLower = args.search ? String(args.search).trim().toLowerCase() : ''

      let list = allTasks.filter((t) => !t.deletedAt && t.parentId === null)
      if (statusFilter !== 'all') list = list.filter((t) => t.status === statusFilter)
      if (targetProjectId) list = list.filter((t) => t.projectId === targetProjectId)
      if (typeof args.priority === 'number') list = list.filter((t) => (t.priority || 0) === args.priority)
      if (args.tag) list = list.filter((t) => Array.isArray(t.tags) && t.tags.includes(args.tag))
      if (searchLower) {
        list = list.filter(
          (t) =>
            (t.title || '').toLowerCase().includes(searchLower) ||
            (t.content || '').toLowerCase().includes(searchLower),
        )
      }

      list.sort((a, b) => (b.priority || 0) - (a.priority || 0))
      const limit = Math.max(1, Math.min(200, Number(args.limit || 50)))
      const sliced = list.slice(0, limit)
      if (!sliced.length) return 'Задачи по заданным фильтрам не найдены.'
      return [
        `Найдено задач: ${list.length} (показано ${sliced.length}):`,
        ...sliced.map((t) => formatTaskSummary(t, projectsMap)),
      ].join('\n')
    }

    case 'create_task': {
      const title = String(args.title || '').trim()
      if (!title) throw new Error('Поле title обязательно')
      const allProjects = (await listCollection('projects')).filter((p) => !p.deletedAt)
      const projectId = await resolveProjectId(args.projectId, allProjects)
      const { due, isAllDay } = normalizeDueInput(args.due, args.isAllDay)

      const items = {}
      const checklistArr = Array.isArray(args.checklist) ? args.checklist : []
      checklistArr.forEach((itemTitle, idx) => {
        const cleanTitle = String(itemTitle || '').trim()
        if (cleanTitle) {
          items[`i${idx + 1}_${generateId(6)}`] = {
            title: cleanTitle,
            done: false,
            sortOrder: idx,
          }
        }
      })

      const id = generateId(20)
      const nowDate = new Date()
      const docData = {
        projectId,
        parentId: null,
        columnId: null,
        sortOrder: 0,
        title,
        content: String(args.content || ''),
        kind: Object.keys(items).length > 0 ? 'checklist' : 'text',
        items,
        priority: [0, 1, 3, 5].includes(Number(args.priority)) ? Number(args.priority) : 0,
        status: 'open',
        completedAt: null,
        start: null,
        due: due ?? null,
        isAllDay: Boolean(isAllDay),
        timeZone: null,
        repeat: null,
        repeatFrom: 'due',
        exDates: [],
        reminders: {},
        tags: Array.isArray(args.tags) ? args.tags.map(String) : [],
        pinnedAt: null,
        waiting: null,
        address: null,
        sourceId: null,
        createdAt: nowDate,
        updatedAt: nowDate,
        deletedAt: null,
      }

      await setDocument('tasks', id, docData)
      return `Задача создана: "${title}" (id: ${id}, список: ${projectId}, срок: ${due ?? 'без срока'})`
    }

    case 'update_task': {
      const id = String(args.id || '').trim()
      if (!id) throw new Error('Поле id обязательно')
      const patch = { updatedAt: new Date() }
      const mask = ['updatedAt']

      if (args.title !== undefined) {
        patch.title = String(args.title).trim()
        mask.push('title')
      }
      if (args.content !== undefined) {
        patch.content = String(args.content)
        mask.push('content')
      }
      if (args.projectId !== undefined) {
        const allProjects = (await listCollection('projects')).filter((p) => !p.deletedAt)
        patch.projectId = await resolveProjectId(args.projectId, allProjects)
        mask.push('projectId')
      }
      if (args.due !== undefined) {
        const { due, isAllDay } = normalizeDueInput(args.due, args.isAllDay)
        patch.due = due
        patch.isAllDay = isAllDay
        mask.push('due', 'isAllDay')
      }
      if (args.priority !== undefined) {
        patch.priority = [0, 1, 3, 5].includes(Number(args.priority)) ? Number(args.priority) : 0
        mask.push('priority')
      }
      if (args.tags !== undefined && Array.isArray(args.tags)) {
        patch.tags = args.tags.map(String)
        mask.push('tags')
      }

      const updated = await setDocument('tasks', id, patch, mask)
      return `Задача ${id} обновлена: "${updated.title || id}"`
    }

    case 'complete_task': {
      const id = String(args.id || '').trim()
      if (!id) throw new Error('Поле id обязательно')
      const done = args.done !== false
      const patch = {
        status: done ? 'done' : 'open',
        completedAt: done ? Date.now() : null,
        updatedAt: new Date(),
      }
      await setDocument('tasks', id, patch, ['status', 'completedAt', 'updatedAt'])
      return `Задача ${id} отмечена как ${done ? 'выполненная' : 'открытая'}.`
    }

    case 'delete_task': {
      const id = String(args.id || '').trim()
      if (!id) throw new Error('Поле id обязательно')
      const now = new Date()
      await setDocument('tasks', id, { deletedAt: now, updatedAt: now }, ['deletedAt', 'updatedAt'])
      return `Задача ${id} перемещена в Корзину.`
    }

    case 'list_projects': {
      const [allProjects, allTasks] = await Promise.all([listCollection('projects'), listCollection('tasks')])
      const openTasks = allTasks.filter((t) => !t.deletedAt && t.parentId === null && t.status === 'open')
      const counts = new Map()
      for (const t of openTasks) {
        counts.set(t.projectId, (counts.get(t.projectId) || 0) + 1)
      }
      const projects = allProjects.filter((p) => !p.deletedAt && !p.closed)
      const lines = [
        `Списки задач (${projects.length}):`,
        `- Входящие (id: inbox | открытых задач: ${counts.get('inbox') || 0})`,
        ...projects
          .filter((p) => p.id !== 'inbox')
          .map((p) => `- ${p.name} (id: ${p.id} | режим: ${p.viewMode || 'list'} | открытых задач: ${counts.get(p.id) || 0})`),
      ]
      return lines.join('\n')
    }

    case 'create_project': {
      const nameStr = String(args.name || '').trim()
      if (!nameStr) throw new Error('Поле name обязательно')
      const id = generateId(20)
      const now = new Date()
      await setDocument('projects', id, {
        name: nameStr,
        color: args.color || '#4772fa',
        groupId: null,
        sortOrder: 0,
        viewMode: ['list', 'kanban', 'timeline'].includes(args.viewMode) ? args.viewMode : 'list',
        kind: 'task',
        isInbox: false,
        closed: false,
        site: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      })
      return `Создан список "${nameStr}" (id: ${id}).`
    }

    case 'list_habits': {
      const day = args.day || todayStr()
      const [allHabits, allCheckins] = await Promise.all([
        listCollection('habits'),
        listCollection('habitCheckins'),
      ])
      const active = allHabits.filter((h) => !h.deletedAt && !h.archivedAt)
      const checkinMap = new Map(allCheckins.filter((c) => c.day === day).map((c) => [c.habitId, c]))
      if (!active.length) return 'Активных привычек нет.'
      return [
        `Активные привычки на ${day} (${active.length}):`,
        ...active.map((h) => {
          const c = checkinMap.get(h.id)
          const st = c ? (c.status === 'done' ? 'выполнена' : 'пропущена') : 'не отмечена'
          return `- ${h.name} (id: ${h.id} | статус: ${st}${c?.note ? ` | заметка: ${c.note}` : ''})`
        }),
      ].join('\n')
    }

    case 'checkin_habit': {
      const habitId = String(args.habitId || '').trim()
      if (!habitId) throw new Error('Поле habitId обязательно')
      const day = args.day || todayStr()
      const status = args.status === 'failed' ? 'failed' : 'done'
      const docId = `${habitId}~${day}`
      const now = new Date()
      const fields = {
        habitId,
        day,
        status,
        updatedAt: now,
        createdAt: now,
      }
      const mask = ['habitId', 'day', 'status', 'updatedAt', 'createdAt']
      if (args.note !== undefined) {
        fields.note = args.note ? String(args.note) : null
        mask.push('note')
      }
      await setDocument('habitCheckins', docId, fields, mask)
      return `Привычка ${habitId} за ${day} отмечена как "${status}".`
    }

    default:
      throw new Error(`Неизвестный инструмент: ${name}`)
  }
}

/**
 * Обработка одного JSON-RPC 2.0 сообщения MCP
 */
export async function handleRpcMessage(msg) {
  if (!msg || typeof msg !== 'object') return null
  const { id, method, params } = msg

  // Уведомления без id не требуют ответа
  if (id === undefined || id === null) {
    return null
  }

  try {
    if (method === 'initialize') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: params?.protocolVersion || '2024-11-05',
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: 'ticktick2-mcp',
            version: '2.0.0',
          },
        },
      }
    }

    if (method === 'ping') {
      return { jsonrpc: '2.0', id, result: {} }
    }

    if (method === 'tools/list') {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          tools: TOOLS,
        },
      }
    }

    if (method === 'tools/call') {
      const toolName = params?.name
      const toolArgs = params?.arguments || {}
      try {
        const text = await executeTool(toolName, toolArgs)
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text }],
            isError: false,
          },
        }
      } catch (toolErr) {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: `Ошибка: ${(toolErr && toolErr.message) || String(toolErr)}` }],
            isError: true,
          },
        }
      }
    }

    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32601,
        message: `Method not found: ${method}`,
      },
    }
  } catch (err) {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: (err && err.message) || 'Internal error',
      },
    }
  }
}

/**
 * Запуск stdio-сервера при прямом вызове скрипта
 */
const isMain = process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))
if (isMain || process.argv[1]?.endsWith('mcp-server.mjs')) {
  const rl = readline.createInterface({
    input: process.stdin,
    terminal: false,
  })

  rl.on('line', async (line) => {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('Content-Length:')) return
    try {
      const msg = JSON.parse(trimmed)
      const response = await handleRpcMessage(msg)
      if (response) {
        process.stdout.write(JSON.stringify(response) + '\n')
      }
    } catch (e) {
      process.stderr.write(`MCP parse error: ${e.message}\n`)
    }
  })
}

