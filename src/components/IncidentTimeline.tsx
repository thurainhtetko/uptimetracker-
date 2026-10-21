import type { Monitor } from '../types'
import { formatDateTime, formatDuration } from '../utils/format'

interface IncidentTimelineProps {
  monitors: Monitor[]
}

interface MergedIncident {
  monitorName: string
  startedAt: number
  endedAt: number | null
  durationSec: number | null
  reason: string | null
}

export function IncidentTimeline({ monitors }: IncidentTimelineProps) {
  const incidents: MergedIncident[] = monitors
    .flatMap((m) =>
      m.incidents.map((inc) => ({
        monitorName: m.name,
        startedAt: inc.startedAt,
        endedAt: inc.endedAt,
        durationSec: inc.durationSec,
        reason: inc.reason,
      })),
    )
    .sort((a, b) => b.startedAt - a.startedAt)
    .slice(0, 20)

  if (incidents.length === 0) {
    return <p className="empty-state">No incidents recorded in the available history.</p>
  }

  return (
    <ol className="timeline">
      {incidents.map((inc) => {
        const ongoing = inc.endedAt == null
        return (
          <li key={`${inc.monitorName}-${inc.startedAt}`} className={`timeline__item timeline__item--${ongoing ? 'ongoing' : 'resolved'}`}>
            <span className="timeline__dot" aria-hidden="true" />
            <div className="timeline__content">
              <div className="timeline__head">
                <span className="timeline__monitor">{inc.monitorName}</span>
                <span className={`badge ${ongoing ? 'badge--down' : 'badge--resolved'}`}>
                  {ongoing ? 'Ongoing' : 'Resolved'}
                </span>
              </div>
              {inc.reason && <p className="timeline__reason">{inc.reason}</p>}
              <p className="timeline__meta">
                {formatDateTime(inc.startedAt)}
                {' · '}
                {ongoing ? 'ongoing' : formatDuration(inc.durationSec)}
              </p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
