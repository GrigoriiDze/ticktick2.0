import { useEffect, useMemo, useRef, useState } from 'react'
import { db } from '../../data/firebase'
import { createColumnsRepo } from '../../data/columns'
import { createCountdownsRepo } from '../../data/countdowns'
import { createProjectGroupsRepo } from '../../data/projectGroups'
import { createProjectsRepo } from '../../data/projects'
import { INBOX_ID, type BoardColumn, type Countdown, type Project, type ProjectGroup } from '../../domain/types'
import { readWsCache, writeWsCache } from './cache'

export function useProjectsData(uid: string) {
  const projectsRepo = useMemo(() => createProjectsRepo(db, uid), [uid])
  const groupsRepo = useMemo(() => createProjectGroupsRepo(db, uid), [uid])
  const columnsRepo = useMemo(() => createColumnsRepo(db, uid), [uid])
  const countdownsRepo = useMemo(() => createCountdownsRepo(db, uid), [uid])

  const [projects, setProjects] = useState<Project[] | null>(() => readWsCache<Project[]>(uid, 'projects'))
  const [columns, setColumns] = useState<BoardColumn[] | null>(() => readWsCache<BoardColumn[]>(uid, 'columns'))
  const [countdowns, setCountdowns] = useState<Countdown[] | null>(() => readWsCache<Countdown[]>(uid, 'countdowns'))
  const [groups, setGroups] = useState<ProjectGroup[] | null>(() => readWsCache<ProjectGroup[]>(uid, 'groups'))
  const [error, setError] = useState<string | null>(null)
  const inboxRequested = useRef(false)

  useEffect(() => {
    const stopProjects = projectsRepo.subscribe(
      (list, { fromCache }) => {
        setProjects(list)
        writeWsCache(uid, 'projects', list)
        // Входящие создаём только когда сервер подтвердил, что их нет
        if (!fromCache && !inboxRequested.current && !list.some((p) => p.id === INBOX_ID)) {
          inboxRequested.current = true
          projectsRepo.createInbox().catch((e: Error) => setError(e.message))
        }
      },
      (e) => setError(e.message),
    )
    const stopGroups = groupsRepo.subscribe(
      (list) => {
        setGroups(list)
        writeWsCache(uid, 'groups', list)
      },
      (e) => setError(e.message),
    )
    const stopColumns = columnsRepo.subscribe(
      (list) => {
        setColumns(list)
        writeWsCache(uid, 'columns', list)
      },
      (e) => setError(e.message),
    )
    const stopCountdowns = countdownsRepo.subscribe(
      (list) => {
        setCountdowns(list)
        writeWsCache(uid, 'countdowns', list)
      },
      (e) => setError(e.message),
    )

    return () => {
      stopProjects()
      stopGroups()
      stopColumns()
      stopCountdowns()
    }
  }, [uid, projectsRepo, groupsRepo, columnsRepo, countdownsRepo])

  return {
    projectsRepo,
    groupsRepo,
    columnsRepo,
    countdownsRepo,
    projects,
    groups,
    columns,
    countdowns,
    error,
  }
}

