import { Clock3 } from 'lucide-react'
import { formatVisitDuration, visitDurationMs } from '../domain/visitDuration'
import type { Visit } from '../domain/types'

export default function VisitTimer({ visit, now, compact = false }: { visit: Visit; now: number; compact?: boolean }) {
  const time = formatVisitDuration(visitDurationMs(visit, now))
  return compact ? <span className="visit-timer is-compact" title={`Mesa ocupada desde hace ${time}`}><Clock3 size={12} aria-hidden="true" /> {time}</span>
    : <span className="visit-timer"><Clock3 size={14} aria-hidden="true" /> En atención: {time}</span>
}
