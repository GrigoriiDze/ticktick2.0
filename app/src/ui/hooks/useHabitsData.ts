import { useEffect, useMemo, useState } from 'react'
import { db } from '../../data/firebase'
import { createCheckinsRepo, createHabitsRepo } from '../../data/habits'
import type { Habit, HabitCheckin } from '../../domain/types'
import { readWsCache, writeWsCache } from './cache'

export function useHabitsData(uid: string) {
  const habitsRepo = useMemo(() => createHabitsRepo(db, uid), [uid])
  const checkinsRepo = useMemo(() => createCheckinsRepo(db, uid), [uid])

  const [habits, setHabits] = useState<Habit[] | null>(() => readWsCache<Habit[]>(uid, 'habits'))
  const [checkins, setCheckins] = useState<HabitCheckin[] | null>(() => readWsCache<HabitCheckin[]>(uid, 'checkins'))
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const stopHabits = habitsRepo.subscribe(
      (list) => {
        setHabits(list)
        writeWsCache(uid, 'habits', list)
      },
      (e) => setError(e.message),
    )
    const stopCheckins = checkinsRepo.subscribe(
      (list) => {
        setCheckins(list)
        writeWsCache(uid, 'checkins', list)
      },
      (e) => setError(e.message),
    )

    return () => {
      stopHabits()
      stopCheckins()
    }
  }, [uid, habitsRepo, checkinsRepo])

  return { habitsRepo, checkinsRepo, habits, checkins, error }
}

