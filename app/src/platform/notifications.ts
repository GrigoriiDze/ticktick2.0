import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { stableId, type PlannedNotification } from '../domain/reminders'
import { getNotificationSoundPref, playNotificationSound, type NotificationSoundId } from './audio'

/**
 * Уведомления на Android. Каждое устройство само ставит их себе по своей локальной копии задач
 * и пересчитывает при любом изменении, поэтому они приходят и без сети.
 * Звук канала после создания изменить нельзя, поэтому при смене звука/вибрации меняем и идентификатор канала.
 */

const ACTION_TYPE = 'task'
const SMALL_ICON = 'ic_stat_task'
const SNOOZE_MINUTES = 10
export const DAILY_SUMMARY_NOTIF_ID = 777000
export const STATUS_BAR_NOTIF_ID = 777001

export interface NotificationHandlers {
  onOpen: (taskId: string) => void
  onDone: (taskId: string) => void
}

export const notificationsSupported = () => Capacitor.isNativePlatform()

function getChannelConfig(): { id: string; sound?: string; vibration: boolean; silent: boolean } {
  const soundPref: NotificationSoundId = getNotificationSoundPref()
  let vibration = true
  try {
    vibration = localStorage.getItem('tt_vibrate_notif') !== '0'
  } catch {}
  const soundFileMap: Record<NotificationSoundId, string | undefined> = {
    ticktick_pop: 'ticktick_pop.ogg',
    dida_bells: 'dida_bells.mp3',
    jingle: 'completion_sound_jingle.aac',
    soft: 'soft.wav',
    silent: undefined,
  }
  return {
    id: `reminders-${soundPref}-${vibration ? 'v1' : 'v0'}`,
    sound: soundFileMap[soundPref],
    vibration,
    silent: soundPref === 'silent',
  }
}

let activeChannelId = ''
let lastSignature = ''

async function ensureChannel(): Promise<string> {
  const cfg = getChannelConfig()
  if (!notificationsSupported()) return cfg.id
  if (activeChannelId === cfg.id) return cfg.id
  try {
    await LocalNotifications.createChannel({
      id: cfg.id,
      name: 'Напоминания о задачах',
      description: 'Напоминания о задачах и сроках',
      importance: cfg.silent ? 3 : 5,
      visibility: 1,
      ...(cfg.sound ? { sound: cfg.sound } : {}),
      vibration: cfg.vibration,
      lights: true,
    })
    activeChannelId = cfg.id
  } catch {
    // На старых Android каналы не требуются
  }
  return cfg.id
}

/** Пересоздаёт канал уведомлений при смене рингтона или вибрации в Настройках */
export async function refreshNotificationChannel(): Promise<void> {
  activeChannelId = ''
  lastSignature = ''
  await ensureChannel()
}

/** Разрешение на уведомления. На Android 13 и выше система спрашивает человека */
export async function ensurePermission(): Promise<boolean> {
  if (!notificationsSupported()) {
    if (typeof Notification === 'undefined') return false
    if (Notification.permission === 'granted') return true
    if (Notification.permission === 'denied') return false
    try {
      return (await Notification.requestPermission()) === 'granted'
    } catch {
      return false
    }
  }
  try {
    const current = await LocalNotifications.checkPermissions()
    if (current.display === 'granted') return true
    const asked = await LocalNotifications.requestPermissions()
    return asked.display === 'granted'
  } catch {
    return false
  }
}

/** Подписка на нажатия: по самому уведомлению и по кнопкам «Выполнено» и «Отсрочка» */
export async function setupNotifications(handlers: NotificationHandlers): Promise<() => void> {
  if (!notificationsSupported()) return () => {}
  await ensureChannel()
  // Сразу запрашиваем разрешение на уведомления при запуске приложения
  await ensurePermission()

  try {
    if (localStorage.getItem('tt_daily_reminder_enabled') === '1') {
      await syncDailySummaryNotification()
    }
    if (localStorage.getItem('tt_status_bar_notif') === '1') {
      await setStatusBarQuickAddNotification(true)
    }
  } catch {}

  await LocalNotifications.registerActionTypes({
    types: [
      {
        id: ACTION_TYPE,
        actions: [
          { id: 'done', title: 'Выполнено' },
          { id: 'snooze', title: 'Отсрочка 10 мин' },
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
      const channelId = await ensureChannel()
      const cfg = getChannelConfig()
      await LocalNotifications.schedule({
        notifications: [
          {
            id: stableId(`${taskId}:snooze`),
            title: event.notification.title ?? '',
            body: event.notification.body ?? '',
            channelId,
            smallIcon: SMALL_ICON,
            actionTypeId: ACTION_TYPE,
            ...(cfg.sound ? { sound: cfg.sound } : {}),
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

/**
 * Заменяет расписание. Если оно не изменилось, ничего не трогает: пересчёт идёт при каждом
 * обновлении списка задач, а система не любит лишних перезаписей
 */
export async function syncSchedule(plan: PlannedNotification[]): Promise<void> {
  if (!notificationsSupported()) return
  const channelId = await ensureChannel()
  const cfg = getChannelConfig()
  const signature = `${channelId}|` + plan.map((p) => `${p.id}@${p.at}:${p.title}:${p.body}`).join('|')
  if (signature === lastSignature) return

  if (plan.length > 0 && !(await ensurePermission())) return

  const pending = await LocalNotifications.getPending()
  // Отсрочки, ежедневную сводку и статус-бар не отменяем
  const ours = pending.notifications.filter(
    (n) =>
      !(n.extra as { snooze?: boolean } | undefined)?.snooze &&
      n.id !== DAILY_SUMMARY_NOTIF_ID &&
      n.id !== STATUS_BAR_NOTIF_ID,
  )
  if (ours.length) await LocalNotifications.cancel({ notifications: ours.map((n) => ({ id: n.id })) })

  if (plan.length) {
    await LocalNotifications.schedule({
      notifications: plan.map((p) => ({
        id: p.id,
        title: p.title,
        body: p.body,
        channelId,
        smallIcon: SMALL_ICON,
        actionTypeId: ACTION_TYPE,
        ...(cfg.sound ? { sound: cfg.sound } : {}),
        extra: { taskId: p.taskId },
        schedule: { at: new Date(p.at), allowWhileIdle: true },
      })),
    })
  }
  lastSignature = signature
}

/** Ежедневная сводка ("Ежедневное напоминание" из Настроек -> Звуки и уведомления) */
export async function syncDailySummaryNotification(): Promise<void> {
  if (!notificationsSupported()) return
  try {
    await LocalNotifications.cancel({ notifications: [{ id: DAILY_SUMMARY_NOTIF_ID }] })
    const enabled = localStorage.getItem('tt_daily_reminder_enabled') === '1'
    if (!enabled) return
    if (!(await ensurePermission())) return
    const timeStr = localStorage.getItem('tt_daily_reminder_time') || '09:00'
    const [hh, mm] = timeStr.split(':').map((x) => Number(x) || 0)
    const channelId = await ensureChannel()
    const cfg = getChannelConfig()
    await LocalNotifications.schedule({
      notifications: [
        {
          id: DAILY_SUMMARY_NOTIF_ID,
          title: 'Ежедневная сводка TickTick',
          body: 'Проверьте план задач на сегодня',
          channelId,
          smallIcon: SMALL_ICON,
          ...(cfg.sound ? { sound: cfg.sound } : {}),
          schedule: {
            on: { hour: hh, minute: mm },
            repeats: true,
            allowWhileIdle: true,
          },
        },
      ],
    })
  } catch {}
}

/** Постоянное уведомление в шторке ("Уведомления и панель состояния") */
export async function setStatusBarQuickAddNotification(enabled: boolean): Promise<void> {
  if (!notificationsSupported()) return
  try {
    await LocalNotifications.cancel({ notifications: [{ id: STATUS_BAR_NOTIF_ID }] })
    if (!enabled) return
    if (!(await ensurePermission())) return
    const channelId = await ensureChannel()
    await LocalNotifications.schedule({
      notifications: [
        {
          id: STATUS_BAR_NOTIF_ID,
          title: 'TickTick — Быстрое добавление',
          body: 'Нажмите, чтобы открыть список задач',
          channelId,
          smallIcon: SMALL_ICON,
          ongoing: true,
          autoCancel: false,
          schedule: { at: new Date(Date.now() + 400), allowWhileIdle: true },
        },
      ],
    })
  } catch {}
}

/** Пробное уведомление через 3 секунды, чтобы проверить звук, разрешения и экономию батареи */
export async function sendTestNotification(): Promise<string> {
  playNotificationSound()
  try {
    if (localStorage.getItem('tt_vibrate_notif') !== '0' && typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate([120, 60, 120])
    }
  } catch {}

  if (!notificationsSupported()) {
    const ok = await ensurePermission()
    if (ok && typeof Notification !== 'undefined') {
      try {
        new Notification('Проверка уведомлений TickTick', {
          body: 'Звук и уведомления работают корректно!',
        })
        return 'Тестовое уведомление отправлено и звук воспроизведён!'
      } catch {}
    }
    return 'Звук воспроизведён. Системные push-уведомления работают в приложении на телефоне.'
  }

  if (!(await ensurePermission())) {
    return 'Уведомления запрещены. Включите разрешение «Уведомления» в настройках Android для приложения Задачи.'
  }
  const channelId = await ensureChannel()
  const cfg = getChannelConfig()
  const exact = await LocalNotifications.checkExactNotificationSetting().catch(() => ({ exact_alarm: 'granted' as const }))
  await LocalNotifications.schedule({
    notifications: [
      {
        id: stableId('test-' + Date.now()),
        title: 'Проверка уведомлений TickTick',
        body: 'Если вы видите этот баннер и слышите звук — напоминания работают!',
        channelId,
        smallIcon: SMALL_ICON,
        ...(cfg.sound ? { sound: cfg.sound } : {}),
        schedule: { at: new Date(Date.now() + 3000), allowWhileIdle: true },
      },
    ],
  })
  return exact.exact_alarm === 'granted'
    ? 'Тестовое уведомление придёт через 3 секунды! Если не пришло — проверьте режим «Без ограничений» в настройках батареи телефона.'
    : 'Уведомление придёт через 3 секунды, но точные будильники выключены. Включите их в настройках телефона.'
}
