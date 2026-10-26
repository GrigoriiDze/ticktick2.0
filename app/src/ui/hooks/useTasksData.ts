import { useEffect, useMemo, useState } from 'react'
import { db } from '../../data/firebase'
import { createTasksRepo } from '../../data/tasks'
import type { Task } from '../../domain/types'
import { readWsCache, writeWsCache } from './cache'

export function useTasksData(uid: string) {
  const tasksRepo = useMemo(() => createTasksRepo(db, uid), [uid])
  const [tasks, setTasks] = useState<Task[] | null>(() => readWsCache<Task[]>(uid, 'tasks'))
  const [deleted, setDeleted] = useState<Task[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const stopTasks = tasksRepo.subscribe(
      (list) => {
        setTasks(list)
        writeWsCache(uid, 'tasks', list)
      },
      (e) => setError(e.message),
    )
    const stopDeleted = tasksRepo.subscribeDeleted(setDeleted, (e) => setError(e.message))

    return () => {
      stopTasks()
      stopDeleted()
    }
  }, [uid, tasksRepo])

  return { tasksRepo, tasks, deleted, error }
}

