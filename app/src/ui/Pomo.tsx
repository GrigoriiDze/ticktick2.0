import { useEffect, useMemo, useState } from 'react'
import type { Task } from '../domain/types'
import type { RowActions } from './TaskList'
import { usePomoSettings } from '../features/pomo/hooks/usePomoSettings'
import { usePomoStats } from '../features/pomo/hooks/usePomoStats'
import { usePomoTimer } from '../features/pomo/hooks/usePomoTimer'
import { PomoTimerScreen } from '../features/pomo/components/PomoTimerScreen'
import { PomoStatsScreen } from '../features/pomo/components/PomoStatsScreen'
import { PomoSettingsScreen } from '../features/pomo/components/PomoSettingsScreen'
import { PomoTaskPickerModal } from '../features/pomo/components/PomoTaskPickerModal'
import { PomoDurationModal } from '../features/pomo/components/PomoDurationModal'
import { PomoNoiseModal } from '../features/pomo/components/PomoNoiseModal'
import { PomoMoreMenuModal } from '../features/pomo/components/PomoMoreMenuModal'
import { PomoAddRecordModal } from '../features/pomo/components/PomoAddRecordModal'

interface Props {
  tasks: Task[]
  actions?: RowActions
}

type FocusSubScreen = 'timer' | 'stats' | 'settings'

export function Pomo({ tasks }: Props) {
  const [subScreen, setSubScreen] = useState<FocusSubScreen>('timer')
  const [taskId, setTaskId] = useState<string | null>(null)

  // Модальные окна
  const [taskPickerOpen, setTaskPickerOpen] = useState(false)
  const [durationPickerOpen, setDurationPickerOpen] = useState(false)
  const [whiteNoiseOpen, setWhiteNoiseOpen] = useState(false)
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [addRecordOpen, setAddRecordOpen] = useState(false)

  const openTasks = useMemo(() => tasks.filter((t) => t.status === 'open' && !t.deletedAt), [tasks])
  const selectedTask = useMemo(() => openTasks.find((t) => t.id === taskId) ?? null, [openTasks, taskId])

  const settings = usePomoSettings()
  const stats = usePomoStats(selectedTask)
  const timer = usePomoTimer({
    settings,
    recordSession: stats.recordSession,
  })

  // Перехват кнопки Back в Android
  useEffect(() => {
    const onBack = (e: Event) => {
      if (taskPickerOpen || durationPickerOpen || whiteNoiseOpen || moreMenuOpen || addRecordOpen) {
        e.preventDefault()
        setTaskPickerOpen(false)
        setDurationPickerOpen(false)
        setWhiteNoiseOpen(false)
        setMoreMenuOpen(false)
        setAddRecordOpen(false)
        return
      }
      if (subScreen !== 'timer') {
        e.preventDefault()
        setSubScreen('timer')
      }
    }
    window.addEventListener('tt-back-request', onBack)
    return () => window.removeEventListener('tt-back-request', onBack)
  }, [subScreen, taskPickerOpen, durationPickerOpen, whiteNoiseOpen, moreMenuOpen, addRecordOpen])

  return (
    <>
      {subScreen === 'stats' && (
        <PomoStatsScreen
          todayStats={stats.todayStats}
          totalPomoCount={stats.totalPomoCount}
          totalMins={stats.totalMins}
          sessions={stats.sessions}
          onBack={() => setSubScreen('timer')}
          onOpenAddRecord={() => setAddRecordOpen(true)}
        />
      )}

      {subScreen === 'settings' && (
        <PomoSettingsScreen
          settings={settings}
          status={timer.status}
          mode={timer.mode}
          onUpdatePomoDuration={(sec) => timer.switchMode(timer.mode, Math.round(sec / 60))}
          onBack={() => setSubScreen('timer')}
        />
      )}

      {subScreen === 'timer' && (
        <PomoTimerScreen
          mode={timer.mode}
          status={timer.status}
          displaySec={timer.displaySec}
          progress={timer.progress}
          whiteNoise={settings.whiteNoise}
          selectedTask={selectedTask}
          todayStats={stats.todayStats}
          onSwitchTab={timer.switchTab}
          onToggleStartPause={timer.toggleStartPause}
          onStopOrFinish={timer.handleStopOrFinish}
          onOpenTaskPicker={() => setTaskPickerOpen(true)}
          onOpenDurationPicker={() => setDurationPickerOpen(true)}
          onOpenNoiseModal={() => setWhiteNoiseOpen(true)}
          onOpenAddRecord={() => setAddRecordOpen(true)}
          onOpenStats={() => setSubScreen('stats')}
          onOpenMoreMenu={() => setMoreMenuOpen(true)}
        />
      )}

      <PomoTaskPickerModal
        open={taskPickerOpen}
        taskId={taskId}
        openTasks={openTasks}
        onSelect={setTaskId}
        onClose={() => setTaskPickerOpen(false)}
      />

      <PomoDurationModal
        open={durationPickerOpen}
        mode={timer.mode}
        durationSec={timer.durationSec}
        shortBreakMins={settings.shortBreakMins}
        longBreakMins={settings.longBreakMins}
        onSelectPomo={(m) => {
          settings.setPomoMins(m)
          timer.switchMode('pomo', m)
        }}
        onSelectBreak={(breakMode, mins) => timer.switchMode(breakMode, mins)}
        onClose={() => setDurationPickerOpen(false)}
      />

      <PomoNoiseModal
        open={whiteNoiseOpen}
        whiteNoise={settings.whiteNoise}
        onSelect={settings.setWhiteNoise}
        onClose={() => setWhiteNoiseOpen(false)}
      />

      <PomoMoreMenuModal
        open={moreMenuOpen}
        whiteNoise={settings.whiteNoise}
        onOpenNoise={() => setWhiteNoiseOpen(true)}
        onOpenDuration={() => setDurationPickerOpen(true)}
        onOpenStats={() => setSubScreen('stats')}
        onOpenSettings={() => setSubScreen('settings')}
        onClose={() => setMoreMenuOpen(false)}
      />

      <PomoAddRecordModal
        open={addRecordOpen}
        onAdd={stats.addManualRecord}
        onClose={() => setAddRecordOpen(false)}
      />
    </>
  )
}
