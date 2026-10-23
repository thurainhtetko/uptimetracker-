import { useCallback, useEffect, useMemo, useState } from 'react'
import { Header } from './components/Header'
import { IncidentList } from './components/IncidentList'
import { MonitorDetail } from './components/MonitorDetail'
import { MonitorList } from './components/MonitorList'
import { Panel } from './components/Panel'
import { StatCards } from './components/StatCards'
import { StatusBanner } from './components/StatusBanner'
import { UptimeBarChart } from './components/UptimeBarChart'
import { useNow } from './hooks/useNow'
import { useStatus } from './hooks/useStatus'
import { TIME_ZONE_LABEL } from './utils/format'

function readHashId(): number | null {
  const match = window.location.hash.match(/^#\/?(\d+)$/)
  if (!match) return null
  const id = Number(match[1])
  return Number.isFinite(id) ? id : null
}

function replaceHash(id: number): void {
  const next = `#${id}`
  if (window.location.hash !== next) window.history.replaceState(null, '', next)
}

export default function App() {
  const { data, loading, refreshing, error, refresh, lastUpdated } = useStatus()
  const now = useNow(1000)
  const [selectedId, setSelectedId] = useState<number | null>(() => readHashId())

  const monitors = useMemo(() => data?.monitors ?? [], [data])

  const selected = useMemo(() => {
    return monitors.find((monitor) => monitor.id === selectedId) ?? monitors[0] ?? null
  }, [monitors, selectedId])

  const select = useCallback((id: number) => {
    setSelectedId(id)
    replaceHash(id)
  }, [])

  useEffect(() => {
    if (selected) replaceHash(selected.id)
  }, [selected])

  useEffect(() => {
    const onHashChange = () => {
      const id = readHashId()
      if (id != null) setSelectedId(id)
    }

    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const timeZoneLabel = data?.timeZoneLabel ?? TIME_ZONE_LABEL

  return (
    <div className="app">
      <Header
        now={now}
        lastUpdated={lastUpdated}
        refreshing={refreshing}
        onRefresh={refresh}
        timeZoneLabel={timeZoneLabel}
      />

      <main className="content">
        {error && data && (
          <div className="alert alert--error" role="alert">
            <span>{error}</span>
            <button type="button" className="btn btn--ghost" onClick={refresh}>
              Retry
            </button>
          </div>
        )}

        {loading && !data ? (
          <LoadingSkeleton />
        ) : !data ? (
          <ErrorState message={error ?? 'Unable to load status.'} onRetry={refresh} />
        ) : (
          <>
            <StatusBanner monitors={monitors} />

            <StatCards monitors={monitors} lastUpdated={lastUpdated} now={now} />

            <Panel title="Monitors" subtitle="Select a monitor to update the charts below">
              <MonitorList monitors={monitors} selectedId={selected?.id ?? null} onSelect={select} />
            </Panel>

            <Panel title="90-day uptime" subtitle={`Daily uptime · times in ${timeZoneLabel}`}>
              <UptimeBarChart monitor={selected} />
            </Panel>

            <Panel title="Monitor details">
              <MonitorDetail monitor={selected} />
            </Panel>

            <Panel title="Latest checks" subtitle={`Newest first · times in ${timeZoneLabel}`}>
              <IncidentList monitors={monitors} now={now} />
            </Panel>
          </>
        )}
      </main>

      <footer className="footer">
        <span>Powered by UptimeRobot</span>
        <span>All times {timeZoneLabel}</span>
      </footer>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="loading" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading status…</span>
      <div className="skeleton skeleton--banner" />
      <div className="stat-grid">
        <div className="skeleton skeleton--card" />
        <div className="skeleton skeleton--card" />
        <div className="skeleton skeleton--card" />
      </div>
      <div className="skeleton skeleton--panel" />
      <div className="skeleton skeleton--panel" />
      <div className="skeleton skeleton--panel" />
    </div>
  )
}

interface ErrorStateProps {
  message: string
  onRetry: () => void
}

function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <div className="error-state" role="alert">
      <h2 className="error-state__title">Unable to load status</h2>
      <p className="error-state__message">{message}</p>
      <button type="button" className="btn" onClick={onRetry}>
        Try again
      </button>
    </div>
  )
}
