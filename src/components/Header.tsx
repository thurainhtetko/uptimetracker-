import { formatClock, formatUpdated } from '../utils/format'

interface HeaderProps {
  now: number
  lastUpdated: number | null
  refreshing: boolean
  onRefresh: () => void
  timeZoneLabel: string
}

export function Header({ now, lastUpdated, refreshing, onRefresh, timeZoneLabel }: HeaderProps) {
  const clock = formatClock(now)

  return (
    <header className="header">
      <div className="header__brand">
        <h1 className="header__title">UP Time Tracker</h1>
        <p className="header__subtitle">
          Live uptime for <a href="https://thurain.website">thurain.website</a>
        </p>
      </div>

      <div className="header__meta">
        <span className="header__clock" aria-label={`Current time ${clock} ${timeZoneLabel}`}>
          <span className="header__clock-time">{clock}</span>
          <span className="header__clock-zone">{timeZoneLabel}</span>
        </span>
        <span className="header__updated" aria-live="polite">
          {formatUpdated(now, lastUpdated)}
        </span>
        <button type="button" className="btn" onClick={onRefresh} disabled={refreshing}>
          <svg
            viewBox="0 0 24 24"
            width="14"
            height="14"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={refreshing ? 'spin' : undefined}
            aria-hidden="true"
          >
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
    </header>
  )
}
