import type { CheckStatus, Habit, HabitCheckin } from '../../domain/types'
import type { DateCtx, DayKey } from '../../domain/dates'
import type { HabitPatch } from '../../data/habits'

export type Checks = Map<DayKey, CheckStatus>

export interface HabitsProps {
  habits: Habit[]
  checkins: HabitCheckin[]
  ctx: DateCtx
  wide?: boolean
  onCreate: (name: string, patch?: Partial<HabitPatch>) => void
  onUpdate: (id: string, patch: HabitPatch) => void
  onArchive: (id: string, archived: boolean) => void
  onDelete: (id: string) => void
  onSet: (habitId: string, day: DayKey, status: CheckStatus | undefined, note?: string | null) => void
}

