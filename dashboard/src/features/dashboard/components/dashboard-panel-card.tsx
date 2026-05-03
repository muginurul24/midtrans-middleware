import type { ReactNode } from 'react'

import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type DashboardPanelCardProps = {
  children: ReactNode
  className?: string
  contentClassName?: string
  description?: ReactNode
  eyebrow: string
  headerAction?: ReactNode
  title: ReactNode
}

export function DashboardPanelCard({
  children,
  className,
  contentClassName,
  description,
  eyebrow,
  headerAction,
  title,
}: DashboardPanelCardProps) {
  return (
    <Card className={cn('gap-4 rounded-[1.5rem] bg-card/90 shadow-sm', className)}>
      <CardHeader className="gap-2">
        <div className="grid gap-2">
          <span className="dashboard-eyebrow">{eyebrow}</span>
          <div className="grid gap-1">
            <CardTitle className="text-[1.35rem] leading-[1.1] tracking-[-0.03em]">{title}</CardTitle>
            {description ? <CardDescription className="leading-6">{description}</CardDescription> : null}
          </div>
        </div>
        {headerAction ? <CardAction>{headerAction}</CardAction> : null}
      </CardHeader>
      <CardContent className={cn('grid gap-4', contentClassName)}>{children}</CardContent>
    </Card>
  )
}
