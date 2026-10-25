import { useEffect, useMemo, useRef, useState } from 'react'
import { db } from '../data/firebase'
import { createColumnsRepo } from '../data/columns'
import { createCountdownsRepo } from '../data/countdowns'
import { createProjectGroupsRepo } from '../data/projectGroups'
import { createProjectsRepo } from '../data/projects'
import { createCheckinsRepo, createHabitsRepo } from '../data/habits'
import { createFilesRepo } from '../data/files'
import { createSettingsRepo } from '../data/settings'
import { DEFAULT_AI, type AiSettings } from '../domain/assistant'
import { createTasksRepo } from '../data/tasks'
import { runImport, type ImportBundle } from '../import/bundle'
import { INBOX_ID, type BoardColumn, type Countdown, type Habit, type HabitCheckin, type Project, type ProjectGroup, type Task } from '../domain/types'

/** Данные пользователя и операции над ними. Единственное место, где UI связан с слоем data/ */
export function useWorkspace(uid: string) {
  const tasksRepo = useMemo(() => createTasksRepo(db, uid), [uid])
  const filesRepo = useMemo(() => createFilesRepo(db, uid), [uid])
  const settingsRepo = useMemo(() => createSettingsRepo(db, uid), [uid])
  const [aiSettings, setAiSettings] = useState<AiSettings | null>(null)
  const projectsRepo = useMemo(() => createProjectsRepo(db, uid), [uid])
  const groupsRepo = useMemo(() => createProjectGroupsRepo(db, uid), [uid])
  const columnsRepo = useMemo(() => createColumnsRepo(db, uid), [uid])
  const countdownsRepo = useMemo(() => createCountdownsRepo(db, uid), [uid])
  const habitsRepo = useMemo(() => createHabitsRepo(db, uid), [uid])
  const checkinsRepo = useMemo(() => createCheckinsRepo(db, uid), [uid])
  const [habits, setHabits] = useState<Habit[] | null>(null)
  const [checkins, setCheckins] = useState<HabitCheckin[] | null>(null)
  const [projects, setProjects] = useState<Project[] | null>(null)
  const [columns, setColumns] = useState<BoardColumn[] | null>(null)
  const [countdowns, setCountdowns] = useState<Countdown[] | null>(null)
  const [groups, setGroups] = useState<ProjectGroup[] | null>(null)
  const [tasks, setTasks] = useState<Task[] | null>(null)
  const [deleted, setDeleted] = useState<Task[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const inboxRequested = useRef(false)

  useEffect(() => {
    const stopProjects = projectsRepo.subscribe(
      (list, { fromCache }) => {
        setProjects(list)
        // Входящие создаём только когда сервер подтвердил, что их нет
        if (!fromCache && !inboxRequested.current && !list.some((p) => p.id === INBOX_ID)) {
          inboxRequested.current = true
          projectsRepo.createInbox().catch((e: Error) => setError(e.message))
        }
      },
      (e) => setError(e.message),
    )
    const stopGroups = groupsRepo.subscribe(setGroups, (e) => setError(e.message))
    const stopColumns = columnsRepo.subscribe(setColumns, (e) => setError(e.message))
    const stopCountdowns = countdownsRepo.subscribe(setCountdowns, (e) => setError(e.message))
    const stopTasks = tasksRepo.subscribe(setTasks, (e) => setError(e.message))
    const stopDeleted = tasksRepo.subscribeDeleted(setDeleted, (e) => setError(e.message))
    const stopAi = settingsRepo.subscribeAi(setAiSettings, () => setAiSettings(DEFAULT_AI))
    const stopHabits = habitsRepo.subscribe(setHabits, (e) => setError(e.message))
    const stopCheckins = checkinsRepo.subscribe(setCheckins, (e) => setError(e.message))
    return () => {
      stopProjects()
      stopGroups()
      stopColumns()
      stopCountdowns()
      stopTasks()
      stopDeleted()
      stopAi()
      stopHabits()
      stopCheckins()
    }
  }, [projectsRepo, groupsRepo, columnsRepo, countdownsRepo, tasksRepo, habitsRepo, checkinsRepo, settingsRepo])

  /** Записывает файл с задачами из TickTick в аккаунт. Уже имеющееся не трогает */
  const importBundle = (bundle: ImportBundle, onProgress?: (done: number, total: number) => void) => runImport(db, uid, bundle, onProgress)

  return { importBundle, projects, groups, columns, columnsRepo, countdowns, countdownsRepo, tasks, deleted, habits, checkins, error, tasksRepo, filesRepo, aiSettings, settingsRepo, projectsRepo, groupsRepo, habitsRepo, checkinsRepo }
}
