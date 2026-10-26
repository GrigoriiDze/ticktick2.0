import { useEffect, useState } from 'react'
import {
  applyDisplayPrefs,
  getTaskMode,
  setAccent,
  setTaskMode as persistTaskMode,
  setTheme,
  type Accent,
  type TaskViewMode,
  type ThemeMode,
} from '../platform/theme'
import { PickerModal } from '../features/settings/components/PickerModal'
import { useAppSettings } from '../features/settings/hooks/useAppSettings'
import { useImportAndUpdates } from '../features/settings/hooks/useImportAndUpdates'
import type { PickerModalConfig, SettingsProps, SettingsScreen } from '../features/settings/types'

import { AiSection } from '../features/settings/sections/AiSection'
import { BackupSection } from '../features/settings/sections/BackupSection'
import { DateTimeSection } from '../features/settings/sections/DateTimeSection'
import { DefaultsSection } from '../features/settings/sections/DefaultsSection'
import { GeneralSection } from '../features/settings/sections/GeneralSection'
import { NotificationsAdvancedSection } from '../features/settings/sections/NotificationsAdvancedSection'
import { NotificationsSection } from '../features/settings/sections/NotificationsSection'
import { ProfileSection } from '../features/settings/sections/ProfileSection'
import { SettingsMainScreen } from '../features/settings/sections/SettingsMainScreen'
import { SmartRecSection } from '../features/settings/sections/SmartRecSection'
import { TabBarSection } from '../features/settings/sections/TabBarSection'
import { ThemeSection } from '../features/settings/sections/ThemeSection'
import { WidgetsSection } from '../features/settings/sections/WidgetsSection'

export { copyMcpConfig } from '../features/settings/components/copyMcpConfig'
export { useImportAndUpdates } from '../features/settings/hooks/useImportAndUpdates'
export type { SettingsProps as Props }

export function Settings(props: SettingsProps) {
  const [screen, setScreen] = useState<SettingsScreen>('main')
  const [pickerModal, setPickerModal] = useState<PickerModalConfig | null>(null)
  const [toastMsg, setToastMsg] = useState<string | null>(null)
  const [taskMode, setTaskModeState] = useState<TaskViewMode>(getTaskMode)

  const settings = useAppSettings()
  const importUpdates = useImportAndUpdates(props.onImport)

  function showToast(msg: string) {
    setToastMsg(msg)
    window.setTimeout(() => {
      setToastMsg((cur) => (cur === msg ? null : cur))
    }, 2600)
  }

  useEffect(() => {
    const onBack = (e: Event) => {
      if (pickerModal) {
        e.preventDefault()
        setPickerModal(null)
        return
      }
      if (screen === 'smart_rec' || screen === 'defaults') {
        e.preventDefault()
        setScreen('general')
      } else if (screen === 'notifications_advanced') {
        e.preventDefault()
        setScreen('notifications')
      } else if (screen !== 'main') {
        e.preventDefault()
        setScreen('main')
      }
    }
    window.addEventListener('tt-back-request', onBack)
    return () => window.removeEventListener('tt-back-request', onBack)
  }, [screen, pickerModal])

  const wrapClass = `m-settings-view${props.leaving ? ' page-leave-active' : ''}`

  const handleTaskModeChange = (mode: TaskViewMode) => {
    setTaskModeState(mode)
    persistTaskMode(mode)
    props.onTaskMode(mode)
  }

  const handlePickTheme = (id: string, accent: Accent, mode: ThemeMode) => {
    settings.setSelectedThemeId(id)
    setTheme(mode)
    setAccent(accent)
  }

  const renderContent = () => {
    switch (screen) {
      case 'profile':
        return (
          <ProfileSection
            wrapClass={wrapClass}
            email={props.email}
            onBack={() => setScreen('main')}
            showToast={showToast}
          />
        )

      case 'theme':
        return (
          <ThemeSection
            wrapClass={wrapClass}
            selectedThemeId={settings.selectedThemeId}
            appIconId={settings.appIconId}
            fontSize={settings.fontSize}
            showSidebarCounts={settings.showSidebarCounts}
            hideNote={settings.hideNote}
            showListColor={settings.showListColor}
            onBack={() => setScreen('main')}
            onPickTheme={handlePickTheme}
            onSetAppIconId={settings.setAppIconId}
            onSetFontSize={(sz) => {
              settings.setFontSize(sz)
              applyDisplayPrefs()
            }}
            onSetShowSidebarCounts={(v) => {
              settings.setShowSidebarCounts(v)
              applyDisplayPrefs()
            }}
            onSetHideNote={(v) => {
              settings.setHideNote(v)
              applyDisplayPrefs()
            }}
            onSetShowListColor={(v) => {
              settings.setShowListColor(v)
              applyDisplayPrefs()
            }}
            onOpenPicker={setPickerModal}
            showToast={showToast}
          />
        )

      case 'datetime':
        return (
          <DateTimeSection
            wrapClass={wrapClass}
            onBack={() => setScreen('main')}
            onOpenPicker={setPickerModal}
          />
        )

      case 'tabbar':
        return (
          <TabBarSection
            wrapClass={wrapClass}
            onBack={() => setScreen('main')}
            onOpenPicker={setPickerModal}
          />
        )

      case 'notifications':
        return (
          <NotificationsSection
            wrapClass={wrapClass}
            settings={settings}
            onBack={() => setScreen('main')}
            onOpenAdvanced={() => setScreen('notifications_advanced')}
            onOpenPicker={setPickerModal}
            showToast={showToast}
          />
        )

      case 'notifications_advanced':
        return (
          <NotificationsAdvancedSection
            wrapClass={wrapClass}
            onBack={() => setScreen('notifications')}
          />
        )

      case 'widgets':
        return (
          <WidgetsSection
            wrapClass={wrapClass}
            onBack={() => setScreen('main')}
            showToast={showToast}
          />
        )

      case 'ai':
        return (
          <AiSection
            wrapClass={wrapClass}
            onBack={() => setScreen('main')}
            aiVoice={settings.aiVoice}
            setAiVoice={settings.setAiVoice}
            aiImprove={settings.aiImprove}
            setAiImprove={settings.setAiImprove}
            mcpNotice={settings.mcpNotice || ''}
            setMcpNotice={settings.setMcpNotice}
          />
        )

      case 'import':
        return (
          <BackupSection
            wrapClass={wrapClass}
            bundle={importUpdates.bundle}
            imp={importUpdates.imp}
            impBusy={importUpdates.impBusy}
            pickFile={importUpdates.pickFile}
            runBundle={importUpdates.runBundle}
            exportBackup={importUpdates.exportBackup}
            onBack={() => setScreen('main')}
            showToast={showToast}
          />
        )

      case 'general':
        return (
          <GeneralSection
            wrapClass={wrapClass}
            setScreen={setScreen}
            appLanguage={settings.appLanguage}
            setAppLanguage={settings.setAppLanguage}
            taskMode={taskMode}
            setTaskMode={handleTaskModeChange}
            onTaskMode={props.onTaskMode}
            cellularAttachments={settings.cellularAttachments}
            setCellularAttachments={settings.setCellularAttachments}
            menuLists={props.menuLists}
            onMenuLists={props.onMenuLists}
            passcodeLock={settings.passcodeLock}
            setPasscodeLock={settings.setPasscodeLock}
            setPickerModal={setPickerModal}
            showToast={showToast}
          />
        )

      case 'smart_rec':
        return (
          <SmartRecSection
            wrapClass={wrapClass}
            onBack={() => setScreen('general')}
            recDate={settings.recDate}
            setRecDate={settings.setRecDate}
            removeDateText={settings.removeDateText}
            setRemoveDateText={settings.setRemoveDateText}
            recTags={settings.recTags}
            setRecTags={settings.setRecTags}
            removeTagText={settings.removeTagText}
            setRemoveTagText={settings.setRemoveTagText}
            showToast={showToast}
          />
        )

      case 'defaults':
        return (
          <DefaultsSection
            wrapClass={wrapClass}
            onBack={() => setScreen('general')}
            defaultDate={settings.defaultDate}
            setDefaultDate={settings.setDefaultDate}
            defaultPriority={settings.defaultPriority}
            setDefaultPriority={settings.setDefaultPriority}
            defaultReminderNone={settings.defaultReminderNone}
            setDefaultReminderNone={settings.setDefaultReminderNone}
            defaultReminderAllDay={settings.defaultReminderAllDay}
            setDefaultReminderAllDay={settings.setDefaultReminderAllDay}
            setPickerModal={setPickerModal}
          />
        )

      case 'main':
      default:
        return (
          <SettingsMainScreen
            wrapClass={wrapClass}
            email={props.email}
            onClose={props.onClose}
            setScreen={setScreen}
            showToast={showToast}
            checkUpdates={importUpdates.checkUpdates}
            checking={importUpdates.checking}
            upd={importUpdates.upd}
            onSignOut={props.onSignOut}
          />
        )
    }
  }

  return (
    <>
      {renderContent()}
      <PickerModal modal={pickerModal} toastMsg={toastMsg} onClose={() => setPickerModal(null)} />
    </>
  )
}
