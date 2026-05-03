import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type DashboardStatusVariant = 'success' | 'warning' | 'secondary' | 'destructive'

type DashboardStatusBadgeProps = {
  className?: string
  status: string
}

const successStatuses = new Set(['paid', 'success', 'active'])
const warningStatuses = new Set(['created', 'pending', 'retrying', 'challenge'])
const secondaryStatuses = new Set(['inactive', 'expired', 'cancelled', 'refunded', 'partial_refunded'])
const destructiveStatuses = new Set(['failed', 'failed_permanently', 'revoked', 'unknown'])

function dashboardStatusVariant(status: string): DashboardStatusVariant {
  const normalized = status.trim().toLowerCase()
  if (successStatuses.has(normalized)) {
    return 'success'
  }
  if (warningStatuses.has(normalized)) {
    return 'warning'
  }
  if (secondaryStatuses.has(normalized)) {
    return 'secondary'
  }
  if (destructiveStatuses.has(normalized)) {
    return 'destructive'
  }
  return 'secondary'
}

export function DashboardStatusBadge({ className, status }: DashboardStatusBadgeProps) {
  return (
    <Badge className={cn('capitalize', className)} variant={dashboardStatusVariant(status)}>
      {status}
    </Badge>
  )
}
