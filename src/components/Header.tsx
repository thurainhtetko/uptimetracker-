import type { MonitorStatus } from '../types'

const STATUS_LABEL: Record<MonitorStatus, string> = {
  up: 'Operational',
  down: 'Down',
  paused: 'Paused',
  starting: 'Starting',
}

interface HeaderProps {
  refreshing: boolean
  lastUpdated: Date | null
  mock: boolean
  onRefresh: () => void
}

export function Header({ refreshing, lastUpdated, mock, onRefresh }: HeaderProps) {
  return (
    <header className="header">
      <div className="header__actions">
        {mock && <span className="badge badge--mock">MOCK DATA</span>}
        {lastUpdated && (
          <span className="header__updated" title={lastUpdated.toLocaleString()}>
            Updated {lastUpdated.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        )}
        <button type="button" className="btn" onClick={onRefresh} disabled={refreshing}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={refreshing ? 'spin' : undefined} aria-hidden="true">
            <polyline points="23 4 23 10 17 10" />
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
          </svg>
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>
    </header>
  )
}

interface StatusBadgeProps {
  status: MonitorStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`badge badge--${status}`}>
      <span className="badge__dot" aria-hidden="true" />
      {STATUS_LABEL[status]}
    </span>
  )
}
