import { Header } from './components/Header'
import { IncidentTimeline } from './components/IncidentTimeline'
import { MonitorList } from './components/MonitorList'
import { Panel } from './components/Panel'
import { ResponseBarComparison } from './components/ResponseBarComparison'
import { ResponseTimeChart } from './components/ResponseTimeChart'
import { StatCards } from './components/StatCards'
import { UptimeBars } from './components/UptimeBars'
import { UptimeTrendChart } from './components/UptimeTrendChart'
import { useMonitors } from './hooks/useMonitors'

export default function App() {
  const { monitors, loading, error, refreshing, lastUpdated, refresh, mock, rateLimited } = useMonitors()

  return (
    <div className="app">
      <Header refreshing={refreshing} lastUpdated={lastUpdated} mock={mock} onRefresh={() => void refresh()} />

      {error && (
        <div className={`alert ${rateLimited ? 'alert--warn' : 'alert--error'}`} role="alert">
          <span>{error}</span>
          <button type="button" className="btn btn--ghost" onClick={() => void refresh()}>
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="loading-grid" aria-busy="true">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="skeleton" />
          ))}
        </div>
      ) : (
        <main className="content">
          <StatCards monitors={monitors} />

          <Panel title="Response time" subtitle="Last 24 hours">
            <ResponseTimeChart monitors={monitors} />
          </Panel>

          <Panel title="Uptime over time" subtitle="Daily uptime %, last 30 days">
            <UptimeTrendChart monitors={monitors} />
          </Panel>

          <Panel title="90-day uptime" subtitle="Daily uptime per monitor">
            <UptimeBars monitors={monitors} />
          </Panel>

          <div className="grid grid--1-1">
            <Panel title="Average response time" subtitle="Latest average, comparison">
              <ResponseBarComparison monitors={monitors} />
            </Panel>
            <Panel title="Incidents" subtitle="Most recent downtime events">
              <IncidentTimeline monitors={monitors} />
            </Panel>
          </div>

          <Panel title="Monitors" subtitle="Details and uptime ratios">
            <MonitorList monitors={monitors} />
          </Panel>
        </main>
      )}

      <footer className="footer">
        <span>Data from UptimeRobot · refreshed manually</span>
      </footer>
    </div>
  )
}
