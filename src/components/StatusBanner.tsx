import type { Monitor } from '../types'

interface StatusBannerProps {
  monitors: Monitor[]
}

type BannerTone = 'success' | 'danger' | 'warn' | 'muted'

export function StatusBanner({ monitors }: StatusBannerProps) {
  let tone: BannerTone = 'success'
  let icon = '✓'
  let title = 'All services operational'
  let detail: string | null = `${monitors.length} monitor${monitors.length === 1 ? '' : 's'} checked`
  let affected: Monitor[] = []

  const down = monitors.filter((monitor) => monitor.status === 'down' || monitor.status === 'seems_down')
  const inactive = monitors.filter((monitor) => monitor.status === 'paused' || monitor.status === 'not_checked')

  if (monitors.length === 0) {
    tone = 'muted'
    icon = '–'
    title = 'No monitors configured'
    detail = 'Add a monitor in UptimeRobot to see its status here.'
  } else if (down.length > 0) {
    tone = 'danger'
    icon = '✕'
    title = `${down.length} service${down.length === 1 ? '' : 's'} down`
    detail = null
    affected = down
  } else if (inactive.length === monitors.length) {
    tone = 'warn'
    icon = '!'
    title = 'No active checks'
    detail = 'All monitors are paused or awaiting their first result.'
  } else if (inactive.length > 0) {
    tone = 'warn'
    icon = '!'
    title = 'All active services operational'
    detail = `${inactive.length} monitor${inactive.length === 1 ? '' : 's'} paused or awaiting first check`
  }

  return (
    <section className={`status-banner status-banner--${tone}`} role="status" aria-live="polite">
      <span className="status-banner__icon" aria-hidden="true">
        {icon}
      </span>
      <div className="status-banner__body">
        <h2 className="status-banner__title">{title}</h2>
        {affected.length > 0 ? (
          <p className="status-banner__detail">
            Affected:{' '}
            {affected.map((monitor, index) => (
              <span key={monitor.id}>
                {index > 0 && ', '}
                <a href={monitor.url} target="_blank" rel="noreferrer">
                  {monitor.name}
                </a>
              </span>
            ))}
          </p>
        ) : (
          detail && <p className="status-banner__detail">{detail}</p>
        )}
      </div>
    </section>
  )
}
