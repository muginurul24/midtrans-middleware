import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type DashboardMobileSummaryGridProps = {
  children: ReactNode
  className?: string
}

type DashboardMobileSummaryItemProps = {
  children: ReactNode
  className?: string
  label: string
  valueClassName?: string
}

export function DashboardMobileSummaryGrid({ children, className }: DashboardMobileSummaryGridProps) {
  return <div className={cn('grid gap-3 sm:grid-cols-2', className)}>{children}</div>
}

export function DashboardMobileSummaryItem({
  children,
  className,
  label,
  valueClassName,
}: DashboardMobileSummaryItemProps) {
  return (
    <div className={cn('grid gap-1 rounded-2xl border border-border/70 bg-muted/30 px-3 py-2', className)}>
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      <div className={cn('min-w-0 text-sm font-medium text-foreground break-all', valueClassName)}>{children}</div>
    </div>
  )
}
