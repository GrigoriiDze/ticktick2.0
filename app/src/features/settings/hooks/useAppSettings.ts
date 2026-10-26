import { useState } from 'react'
import { StorageService } from '../../../platform/storage'
import {
  getCompletionSoundPref,
  getNotificationSoundPref,
  setCompletionSoundPref,
  setNotificationSoundPref,
  type CompletionSoundId,
  type NotificationSoundId,
} from '../../../platform/audio'
import { getTheme } from '../../../platform/theme'

export function useAppSettings() {
  const [selectedThemeId, setSelectedThemeIdState] = useState<string>(() =>
    StorageService.get<string>('tt_theme_swatch_v3', getTheme() === 'dark' ? 'dark' : 'default'),
  )
  const setSelectedThemeId = (v: string) => {
    setSelectedThemeIdState(v)
    StorageService.set('tt_theme_swatch_v3', v)
  }

  const [appIconId, setAppIconIdState] = useState<string>(() =>
    StorageService.get<string>('tt_app_icon', 'default'),
  )
  const setAppIconId = (v: string) => {
    setAppIconIdState(v)
    StorageService.set('tt_app_icon', v)
  }

  const [fontSize, setFontSizeState] = useState<string>(() =>
    StorageService.get<string>('tt_font_size', 'normal'),
  )
  const setFontSize = (v: string) => {
    setFontSizeState(v)
    StorageService.set('tt_font_size', v)
  }

  const [showSidebarCounts, setShowSidebarCountsState] = useState<boolean>(() =>
    !StorageService.getBool('tt_hide_sidebar_counts', false),
  )
  const setShowSidebarCounts = (v: boolean) => {
    setShowSidebarCountsState(v)
    StorageService.set('tt_hide_sidebar_counts', !v ? '1' : '0')
  }

  const [hideNote, setHideNoteState] = useState<boolean>(() =>
    StorageService.getBool('tt_hide_notes', false),
  )
  const setHideNote = (v: boolean) => {
    setHideNoteState(v)
    StorageService.set('tt_hide_notes', v ? '1' : '0')
  }

  const [showListColor, setShowListColorState] = useState<boolean>(() =>
    !StorageService.getBool('tt_hide_list_color', false),
  )
  const setShowListColor = (v: boolean) => {
    setShowListColorState(v)
    StorageService.set('tt_hide_list_color', !v ? '1' : '0')
  }

  const [recDate, setRecDateState] = useState<boolean>(() =>
    StorageService.getBool('tt_smart_date_rec', true),
  )
  const setRecDate = (v: boolean) => {
    setRecDateState(v)
    StorageService.set('tt_smart_date_rec', v ? '1' : '0')
  }

  const [removeDateText, setRemoveDateTextState] = useState<boolean>(() =>
    StorageService.getBool('tt_smart_remove_text', true),
  )
  const setRemoveDateText = (v: boolean) => {
    setRemoveDateTextState(v)
    StorageService.set('tt_smart_remove_text', v ? '1' : '0')
  }

  const [recTags, setRecTagsState] = useState<boolean>(() =>
    StorageService.getBool('tt_smart_tag_rec', true),
  )
  const setRecTags = (v: boolean) => {
    setRecTagsState(v)
    StorageService.set('tt_smart_tag_rec', v ? '1' : '0')
  }

  const [removeTagText, setRemoveTagTextState] = useState<boolean>(() =>
    StorageService.getBool('tt_smart_remove_tag_text', true),
  )
  const setRemoveTagText = (v: boolean) => {
    setRemoveTagTextState(v)
    StorageService.set('tt_smart_remove_tag_text', v ? '1' : '0')
  }

  const [appLanguage, setAppLanguageState] = useState<string>(() =>
    StorageService.get<string>('tt_language', 'system'),
  )
  const setAppLanguage = (v: string) => {
    setAppLanguageState(v)
    StorageService.set('tt_language', v)
  }

  const [defaultDate, setDefaultDateState] = useState<string>(() =>
    StorageService.get<string>('tt_default_date', 'none'),
  )
  const setDefaultDate = (v: string) => {
    setDefaultDateState(v)
    StorageService.set('tt_default_date', v)
  }

  const [defaultPriority, setDefaultPriorityState] = useState<string>(() =>
    StorageService.get<string>('tt_default_priority', '0'),
  )
  const setDefaultPriority = (v: string) => {
    setDefaultPriorityState(v)
    StorageService.set('tt_default_priority', v)
  }

  const [defaultReminderNone, setDefaultReminderNoneState] = useState<boolean>(() =>
    StorageService.getBool('tt_default_reminder_none', false),
  )
  const setDefaultReminderNone = (v: boolean) => {
    setDefaultReminderNoneState(v)
    StorageService.set('tt_default_reminder_none', v ? '1' : '0')
  }

  const [defaultReminderAllDay, setDefaultReminderAllDayState] = useState<boolean>(() =>
    StorageService.getBool('tt_default_reminder_allday', false),
  )
  const setDefaultReminderAllDay = (v: boolean) => {
    setDefaultReminderAllDayState(v)
    StorageService.set('tt_default_reminder_allday', v ? '1' : '0')
  }

  const [cellularAttachments, setCellularAttachmentsState] = useState<boolean>(() =>
    StorageService.getBool('tt_cellular_attach', true),
  )
  const setCellularAttachments = (v: boolean) => {
    setCellularAttachmentsState(v)
    StorageService.set('tt_cellular_attach', v ? '1' : '0')
  }

  const [passcodeLock, setPasscodeLockState] = useState<boolean>(() =>
    StorageService.getBool('tt_passcode_lock', false),
  )
  const setPasscodeLock = (v: boolean) => {
    setPasscodeLockState(v)
    StorageService.set('tt_passcode_lock', v ? '1' : '0')
  }

  const [aiVoice, setAiVoiceState] = useState<boolean>(() =>
    StorageService.getBool('tt_ai_voice', false),
  )
  const setAiVoice = (v: boolean) => {
    setAiVoiceState(v)
    StorageService.set('tt_ai_voice', v ? '1' : '0')
  }

  const [aiImprove, setAiImproveState] = useState<boolean>(() =>
    StorageService.getBool('tt_ai_improve', true),
  )
  const setAiImprove = (v: boolean) => {
    setAiImproveState(v)
    StorageService.set('tt_ai_improve', v ? '1' : '0')
  }

  const [mcpNotice, setMcpNotice] = useState<string | null>(null)

  const [timeFormat, setTimeFormatState] = useState<'24' | '12'>(() =>
    StorageService.get<'24' | '12'>('time-format', '24'),
  )
  const setTimeFormat = (v: '24' | '12') => {
    setTimeFormatState(v)
    StorageService.set('time-format', v)
  }

  const [firstDayOfWeek, setFirstDayOfWeekState] = useState<'1' | '0' | '6'>(() =>
    StorageService.get<'1' | '0' | '6'>('first-day-of-week', '1'),
  )
  const setFirstDayOfWeek = (v: '1' | '0' | '6') => {
    setFirstDayOfWeekState(v)
    StorageService.set('first-day-of-week', v)
  }

  const [countdownMode, setCountdownModeState] = useState<'days' | 'standard'>(() =>
    StorageService.get<'days' | 'standard'>('countdown-mode', 'days'),
  )
  const setCountdownMode = (v: 'days' | 'standard') => {
    setCountdownModeState(v)
    StorageService.set('countdown-mode', v)
  }

  const [statusBarQuickAdd, setStatusBarQuickAddState] = useState<boolean>(() =>
    StorageService.getBool('tt_status_bar_quick_add', false),
  )
  const setStatusBarQuickAdd = (v: boolean) => {
    setStatusBarQuickAddState(v)
    StorageService.set('tt_status_bar_quick_add', v ? '1' : '0')
  }

  const [dailySummaryTime, setDailySummaryTimeState] = useState<string>(() =>
    StorageService.get<string>('tt_daily_summary_time', '09:00'),
  )
  const setDailySummaryTime = (v: string) => {
    setDailySummaryTimeState(v)
    StorageService.set('tt_daily_summary_time', v)
  }

  const [dailySummaryEnabled, setDailySummaryEnabledState] = useState<boolean>(() =>
    StorageService.getBool('tt_daily_summary_enabled', false),
  )
  const setDailySummaryEnabled = (v: boolean) => {
    setDailySummaryEnabledState(v)
    StorageService.set('tt_daily_summary_enabled', v ? '1' : '0')
  }

  const [notificationSound, setNotificationSoundState] = useState<NotificationSoundId>(getNotificationSoundPref)
  const setNotificationSound = (v: NotificationSoundId) => {
    setNotificationSoundState(v)
    setNotificationSoundPref(v)
  }

  const [completionSound, setCompletionSoundState] = useState<CompletionSoundId>(getCompletionSoundPref)
  const setCompletionSound = (v: CompletionSoundId) => {
    setCompletionSoundState(v)
    setCompletionSoundPref(v)
  }

  const [vibrateNotif, setVibrateNotifState] = useState<boolean>(() =>
    StorageService.getBool('tt_vibrate_notif', true),
  )
  const setVibrateNotif = (v: boolean) => {
    setVibrateNotifState(v)
    StorageService.set('tt_vibrate_notif', v ? '1' : '0')
  }

  const [vibrateDone, setVibrateDoneState] = useState<boolean>(() =>
    StorageService.getBool('tt_vibrate_done', true),
  )
  const setVibrateDone = (v: boolean) => {
    setVibrateDoneState(v)
    StorageService.set('tt_vibrate_done', v ? '1' : '0')
  }

  const [quietHoursEnabled, setQuietHoursEnabledState] = useState<boolean>(() =>
    StorageService.getBool('tt_quiet_hours_enabled', false),
  )
  const setQuietHoursEnabled = (v: boolean) => {
    setQuietHoursEnabledState(v)
    StorageService.set('tt_quiet_hours_enabled', v ? '1' : '0')
  }

  const [quietHoursStart, setQuietHoursStartState] = useState<string>(() =>
    StorageService.get<string>('tt_quiet_hours_start', '22:00'),
  )
  const setQuietHoursStart = (v: string) => {
    setQuietHoursStartState(v)
    StorageService.set('tt_quiet_hours_start', v)
  }

  const [quietHoursEnd, setQuietHoursEndState] = useState<string>(() =>
    StorageService.get<string>('tt_quiet_hours_end', '07:00'),
  )
  const setQuietHoursEnd = (v: string) => {
    setQuietHoursEndState(v)
    StorageService.set('tt_quiet_hours_end', v)
  }

  const [advanceMinutes, setAdvanceMinutesState] = useState<number>(() =>
    StorageService.get<number>('tt_advance_reminder_mins', 0),
  )
  const setAdvanceMinutes = (v: number) => {
    setAdvanceMinutesState(v)
    StorageService.set('tt_advance_reminder_mins', v)
  }

  return {
    selectedThemeId,
    setSelectedThemeId,
    appIconId,
    setAppIconId,
    fontSize,
    setFontSize,
    showSidebarCounts,
    setShowSidebarCounts,
    hideNote,
    setHideNote,
    showListColor,
    setShowListColor,
    recDate,
    setRecDate,
    removeDateText,
    setRemoveDateText,
    recTags,
    setRecTags,
    removeTagText,
    setRemoveTagText,
    appLanguage,
    setAppLanguage,
    defaultDate,
    setDefaultDate,
    defaultPriority,
    setDefaultPriority,
    defaultReminderNone,
    setDefaultReminderNone,
    defaultReminderAllDay,
    setDefaultReminderAllDay,
    cellularAttachments,
    setCellularAttachments,
    passcodeLock,
    setPasscodeLock,
    aiVoice,
    setAiVoice,
    aiImprove,
    setAiImprove,
    mcpNotice,
    setMcpNotice,
    timeFormat,
    setTimeFormat,
    firstDayOfWeek,
    setFirstDayOfWeek,
    countdownMode,
    setCountdownMode,
    statusBarQuickAdd,
    setStatusBarQuickAdd,
    dailySummaryTime,
    setDailySummaryTime,
    dailySummaryEnabled,
    setDailySummaryEnabled,
    notificationSound,
    setNotificationSound,
    completionSound,
    setCompletionSound,
    vibrateNotif,
    setVibrateNotif,
    vibrateDone,
    setVibrateDone,
    quietHoursEnabled,
    setQuietHoursEnabled,
    quietHoursStart,
    setQuietHoursStart,
    quietHoursEnd,
    setQuietHoursEnd,
    advanceMinutes,
    setAdvanceMinutes,
  }
}

