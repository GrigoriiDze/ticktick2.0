import { useEffect, useMemo, useState } from 'react'
import { db } from '../data/firebase'
import { createFilesRepo } from '../data/files'
import { createSettingsRepo } from '../data/settings'
import { DEFAULT_AI, type AiSettings } from '../domain/assistant'
import { runImport, type ImportBundle } from '../import/bundle'
import { useTasksData } from './hooks/useTasksData'
import { useProjectsData } from './hooks/useProjectsData'
import { useHabitsData } from './hooks/useHabitsData'

export { useTasksData } from './hooks/useTasksData'
export { useProjectsData } from './hooks/useProjectsData'
export { useHabitsData } from './hooks/useHabitsData'

/** Агрегированный хук данных пользователя, собирающий атомарные подписки воедино */
export function useWorkspace(uid: string) {
  const tasksData = useTasksData(uid)
  const projectsData = useProjectsData(uid)
  const habitsData = useHabitsData(uid)

  const filesRepo = useMemo(() => createFilesRepo(db, uid), [uid])
  const settingsRepo = useMemo(() => createSettingsRepo(db, uid), [uid])
  const [aiSettings, setAiSettings] = useState<AiSettings | null>(null)

  useEffect(() => {
    const stopAi = settingsRepo.subscribeAi(setAiSettings, () => setAiSettings(DEFAULT_AI))
    return () => {
      stopAi()
    }
  }, [settingsRepo])

  const importBundle = (bundle: ImportBundle, onProgress?: (done: number, total: number) => void) =>
    runImport(db, uid, bundle, onProgress)

  const error = tasksData.error || projectsData.error || habitsData.error || null

  return {
    importBundle,
    projects: projectsData.projects,
    groups: projectsData.groups,
    columns: projectsData.columns,
    columnsRepo: projectsData.columnsRepo,
    countdowns: projectsData.countdowns,
    countdownsRepo: projectsData.countdownsRepo,
    tasks: tasksData.tasks,
    deleted: tasksData.deleted,
    habits: habitsData.habits,
    checkins: habitsData.checkins,
    error,
    tasksRepo: tasksData.tasksRepo,
    filesRepo,
    aiSettings,
    settingsRepo,
    projectsRepo: projectsData.projectsRepo,
    groupsRepo: projectsData.groupsRepo,
    habitsRepo: habitsData.habitsRepo,
    checkinsRepo: habitsData.checkinsRepo,
  }
}
