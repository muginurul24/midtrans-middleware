import type { ReactNode } from 'react'

import { cn } from '@/lib/utils'

type DashboardSnippetBlockProps = {
  className?: string
  code: string
  eyebrow: string
  title: ReactNode
}

export function DashboardSnippetBlock({
  className,
  code,
  eyebrow,
  title,
}: DashboardSnippetBlockProps) {
  return (
    <div className={cn('dashboard-code-surface', className)}>
      <span className="dashboard-meta-text">{eyebrow}</span>
      <strong className="text-sm text-foreground">{title}</strong>
      <pre className="dashboard-json-block">{code}</pre>
    </div>
  )
}
