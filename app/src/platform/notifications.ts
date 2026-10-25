import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { stableId, type PlannedNotification } from '../domain/reminders'

/**
 * Уведомления на Android. Каждое устройство само ставит их себе по своей локальной копии задач
 * и пересчитывает при любом изменении, поэтому они приходят и без сети.
 * Звук канала после создания изменить нельзя, поэтому при смене звука меняем и идентификатор канала
 */

const CHANNEL = 'reminders-v1'
const ACTION_TYPE = 'task'
const SMALL_ICON = 'ic_stat_task'
const SNOOZE_MINUTES = 10

export interface NotificationHandlers {
  onOpen: (taskId: string) => void
  onDone: (taskId: string) => void
}

export const notificationsSupported = () => Capacitor.isNativePlatform()

async function ensureChannel(): Promise<void> {
  await LocalNotifications.createChannel({
    id: CHANNEL,
    name: 'Напоминания',
    description: 'Напоминания о задачах',
    importance: 4,
    visibility: 1,
    sound: 'soft.wav',
    vibration: true,
  })
}

/** Разрешение на уведомления. На Android 13 и выше система спрашивает человека один раз */
export async function ensurePermission(): Promise<boolean> {
  const current = await LocalNotifications.checkPermissions()
  if (current.display === 'granted') return true
  if (current.display === 'denied') return false
  const asked = await LocalNotifications.requestPermissions()
  return asked.display === 'granted'
}

/** Подписка на нажатия: по самому уведомлению и по кнопкам «Выполнено» и «Отсрочка» */
export async function setupNotifications(handlers: NotificationHandlers): Promise<() => void> {
  if (!notificationsSupported()) return () => {}
  await ensureChannel()
  await LocalNotifications.registerActionTypes({
    types: [
      {
        id: ACTION_TYPE,
        actions: [
          { id: 'done', title: 'Выполнено' },
          { id: 'snooze', title: 'Отсрочка' },
        ],
      },
    ],
  })
  const handle = await LocalNotifications.addListener('localNotificationActionPerformed', async (event) => {
    const taskId = event.notification.extra?.taskId as string | undefined
    if (!taskId) return
    if (event.actionId === 'done') {
      handlers.onDone(taskId)
    } else if (event.actionId === 'snooze') {
      await LocalNotifications.schedule({
        notifications: [
          {
            id: stableId(`${taskId}:snooze`),
            title: event.notification.title ?? '',
            body: event.notification.body ?? '',
            channelId: CHANNEL,
            smallIcon: SMALL_ICON,
            actionTypeId: ACTION_TYPE,
            extra: { taskId, snooze: true },
            schedule: { at: new Date(Date.now() + SNOOZE_MINUTES * 60_000), allowWhileIdle: true },
          },
        ],
      })
    } else {
      handlers.onOpen(taskId)
    }
  })
  return () => void handle.remove()
}

let lastSignature = ''

/**
 * Заменяет расписание. Если оно не изменилось, ничего не трогает: пересчёт идёт при каждом
 * обновлении списка задач, а система не любит лишних перезаписей
 */
export async function syncSchedule(plan: PlannedNotification[]): Promise<void> {
  if (!notificationsSupported()) return
  const signature = plan.map((p) => `${p.id}@${p.at}:${p.title}:${p.body}`).join('|')
  if (signature === lastSignature) return

  if (plan.length > 0 && !(await ensurePermission())) return

  const pending = await LocalNotifications.getPending()
  // Отсрочки живут отдельно от расписания, их не отменяем
  const ours = pending.notifications.filter((n) => !(n.extra as { snooze?: boolean } | undefined)?.snooze)
  if (ours.length) await LocalNotifications.cancel({ notifications: ours.map((n) => ({ id: n.id })) })

  if (plan.length) {
    await LocalNotifications.schedule({
      notifications: plan.map((p) => ({
        id: p.id,
        title: p.title,
        body: p.body,
        channelId: CHANNEL,
            smallIcon: SMALL_ICON,
        actionTypeId: ACTION_TYPE,
        extra: { taskId: p.taskId },
        schedule: { at: new Date(p.at), allowWhileIdle: true },
      })),
    })
  }
  lastSignature = signature
}

/** Пробное уведомление через 8 секунд, чтобы проверить звук, разрешения и экономию батареи */
export async function sendTestNotification(): Promise<string> {
  if (!notificationsSupported()) return 'Уведомления работают в приложении на телефоне'
  if (!(await ensurePermission())) return 'Уведомления запрещены. Включите их в настройках телефона для этого приложения'
  await ensureChannel()
  const exact = await LocalNotifications.checkExactNotificationSetting().catch(() => ({ exact_alarm: 'granted' as const }))
  await LocalNotifications.schedule({
    notifications: [
      {
        id: stableId('test'),
        title: 'Проверка уведомлений',
        body: 'Если вы это видите и слышите звук, напоминания работают',
        channelId: CHANNEL,
            smallIcon: SMALL_ICON,
        schedule: { at: new Date(Date.now() + 8000), allowWhileIdle: true },
      },
    ],
  })
  return exact.exact_alarm === 'granted'
    ? 'Уведомление придёт через 8 секунд. Если не пришло, откройте настройки телефона, приложения, это приложение, батарея и разрешите работу без ограничений'
    : 'Уведомление придёт через 8 секунд, но точные будильники выключены. Включите их в настройках телефона для этого приложения'
}
