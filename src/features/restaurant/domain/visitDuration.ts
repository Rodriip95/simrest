import type { Visit } from './types.ts'

export function visitDurationMs(visit: Visit, now: number): number {
  return Math.max(0, (visit.closedAt ?? now) - visit.openedAt)
}

export function formatVisitDuration(durationMs: number): string {
  const seconds = Math.floor(Math.max(0, durationMs) / 1000)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor(seconds % 3600 / 60)
  const remainingSeconds = seconds % 60
  return hours ? `${hours} h ${String(minutes).padStart(2, '0')} min`
    : minutes ? `${minutes} min ${String(remainingSeconds).padStart(2, '0')} s`
      : `${seconds} s`
}
