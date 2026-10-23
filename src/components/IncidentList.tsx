import type { Incident, Monitor } from '../types'
import { INCIDENT_META } from '../types'
import { formatDuration, formatTimestamp, TIME_ZONE_LABEL } from '../utils/format'

interface IncidentListProps {
  monitors: Monitor[]
  now: number
}

export function IncidentList({ monitors, now }: IncidentListProps) {
  const incidents = monitors
    .flatMap((monitor) => monitor.incidents)
    .sort((a, b) => b.startedAt - a.startedAt)

  if (incidents.length === 0) {
    return <p className="empty-state">No incidents recorded.</p>
  }

  const nowSec = Math.floor(now / 1000)
  const current = incidents.filter((incident) => incident.status === 'ongoing')
  const past = incidents.filter((incident) => incident.status !== 'ongoing')

  return (
    <div className="incidents">
      <section className="incidents__group" aria-labelledby="incidents-current">
        <h3 id="incidents-current" className="incidents__title">
          Current incidents <span className="incidents__count">{current.length}</span>
        </h3>
        {current.length > 0 ? (
          <ol className="incident-list">
            {current.map((incident, index) => (
              <IncidentRow key={incident.id} incident={incident} number={index + 1} nowSec={nowSec} />
            ))}
          </ol>
        ) : (
          <p className="incidents__empty">No open incidents.</p>
        )}
      </section>

      <section className="incidents__group" aria-labelledby="incidents-past">
        <h3 id="incidents-past" className="incidents__title">
          Past incidents <span className="incidents__count">{past.length}</span>
        </h3>
        {past.length > 0 ? (
          <ol className="incident-list">
            {past.map((incident, index) => (
              <IncidentRow key={incident.id} incident={incident} number={index + 1} nowSec={nowSec} />
            ))}
          </ol>
        ) : (
          <p className="incidents__empty">No past incidents recorded.</p>
        )}
      </section>
    </div>
  )
}

interface IncidentRowProps {
  incident: Incident
  number: number
  nowSec: number
}

function IncidentRow({ incident, number, nowSec }: IncidentRowProps) {
  const meta = INCIDENT_META[incident.status]
  const duration = incident.status === 'ongoing' ? Math.max(0, nowSec - incident.startedAt) : incident.durationSec

  return (
    <li className={`incident incident--${meta.tone}`}>
      <span className="incident__number" aria-hidden="true">
        {number}
      </span>
      <div className="incident__body">
        <div className="incident__head">
          <span className="incident__monitor">{incident.monitorName}</span>
          <span className={`badge badge--${meta.tone}`}>
            <span className="badge__dot" aria-hidden="true" />
            {meta.label}
          </span>
        </div>
        <p className="incident__reason">{incident.reason ?? 'No details available'}</p>
        <p className="incident__meta">
          <time dateTime={new Date(incident.startedAt * 1000).toISOString()}>
            {formatTimestamp(incident.startedAt)}
          </time>{' '}
          {TIME_ZONE_LABEL} · {formatDuration(duration)}
        </p>
      </div>
    </li>
  )
}
