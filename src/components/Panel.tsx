import type { ReactNode } from 'react'

interface PanelProps {
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  className?: string
}

export function Panel({ title, subtitle, action, children, className = '' }: PanelProps) {
  return (
    <section className={`panel ${className}`}>
      <header className="panel__header">
        <div>
          <h2 className="panel__title">{title}</h2>
          {subtitle && <p className="panel__subtitle">{subtitle}</p>}
        </div>
        {action && <div className="panel__action">{action}</div>}
      </header>
      <div className="panel__body">{children}</div>
    </section>
  )
}
