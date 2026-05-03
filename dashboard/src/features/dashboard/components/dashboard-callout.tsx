import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type DashboardCalloutTone = 'muted' | 'success' | 'warning' | 'danger'

type DashboardCalloutProps = {
  actions?: ReactNode
  children?: ReactNode
  className?: string
  description?: ReactNode
  meta?: ReactNode
  tone?: DashboardCalloutTone
  title?: ReactNode
}

export function DashboardCallout({
  actions,
  children,
  className,
  description,
  meta,
  tone = 'muted',
  title,
}: DashboardCalloutProps) {
  return (
    <div className={cn('dashboard-callout', `dashboard-callout--${tone}`, className)}>
      {title || description || meta ? (
        <div className="grid gap-2">
          {title ? <div className="dashboard-callout__title">{title}</div> : null}
          {description ? <div className="dashboard-callout__copy">{description}</div> : null}
          {meta}
        </div>
      ) : null}
      {children}
      {actions}
    </div>
  )
}
