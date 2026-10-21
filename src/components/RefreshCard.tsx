interface RefreshCardProps {
  refreshing: boolean
  lastUpdated: Date | null
  mock: boolean
  onRefresh: () => void
}

export function RefreshCard({ refreshing, lastUpdated, mock, onRefresh }: RefreshCardProps) {
  return (
    <div className="stat-card refresh-card">
      {mock && <span className="badge badge--mock">MOCK DATA</span>}
      <span className="stat-card__label">Last updated</span>
      <span className="refresh-card__time">
        {lastUpdated
          ? lastUpdated.toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })
          : '—'}
      </span>
      <button type="button" className="btn refresh-card__btn" onClick={onRefresh} disabled={refreshing}>
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={refreshing ? 'spin' : undefined} aria-hidden="true">
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
        Refresh
      </button>
    </div>
  )
}
