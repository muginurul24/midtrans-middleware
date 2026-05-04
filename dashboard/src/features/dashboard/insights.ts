import type { DashboardTransaction, Store, StoreToken, WebhookDelivery } from '@/features/dashboard/types'

type TimelinePoint = {
  label: string
  paidCount: number
  pendingCount: number
  failureCount: number
  volume: number
}

type DistributionPoint = {
  label: string
  value: number
  fill: string
}

function bucketDateLabel(date: Date) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
  }).format(date)
}

function startOfDay(date: Date) {
  const next = new Date(date)
  next.setHours(0, 0, 0, 0)
  return next
}

export function buildTransactionTimeline(transactions: DashboardTransaction[], days = 7) {
  const today = startOfDay(new Date())
  const points: TimelinePoint[] = Array.from({ length: days }, (_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (days - index - 1))

    return {
      label: bucketDateLabel(date),
      paidCount: 0,
      pendingCount: 0,
      failureCount: 0,
      volume: 0,
    }
  })

  const dayIndexByTime = new Map<number, number>()
  points.forEach((_, index) => {
    const date = new Date(today)
    date.setDate(today.getDate() - (days - index - 1))
    dayIndexByTime.set(startOfDay(date).getTime(), index)
  })

  transactions.forEach((transaction) => {
    const transactionDate = startOfDay(new Date(transaction.created_at))
    const index = dayIndexByTime.get(transactionDate.getTime())
    if (index === undefined) {
      return
    }

    const point = points[index]
    point.volume += transaction.gross_amount

    switch (transaction.status) {
      case 'paid':
      case 'settlement':
        point.paidCount += 1
        break
      case 'pending':
      case 'challenge':
        point.pendingCount += 1
        break
      case 'failed':
      case 'cancelled':
      case 'expired':
        point.failureCount += 1
        break
      default:
        point.pendingCount += 1
        break
    }
  })

  return points
}

export function buildTransactionStatusDistribution(transactions: DashboardTransaction[]) {
  const counts = new Map<string, number>()
  transactions.forEach((transaction) => {
    counts.set(transaction.status, (counts.get(transaction.status) ?? 0) + 1)
  })

  const colorByStatus: Record<string, string> = {
    paid: 'var(--color-chart-1)',
    settlement: 'var(--color-chart-1)',
    pending: 'var(--color-chart-3)',
    challenge: 'var(--color-chart-4)',
    failed: 'var(--color-destructive)',
    cancelled: 'var(--color-destructive)',
    expired: 'var(--color-muted-foreground)',
    refunded: 'var(--color-chart-5)',
    partial_refunded: 'var(--color-chart-5)',
    unknown: 'var(--color-chart-2)',
  }

  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([label, value]) => ({
      label,
      value,
      fill: colorByStatus[label] ?? 'var(--color-chart-2)',
    }))
}

export function buildDeliveryStatusDistribution(deliveries: WebhookDelivery[]) {
  const counts = new Map<string, number>()
  deliveries.forEach((delivery) => {
    counts.set(delivery.status, (counts.get(delivery.status) ?? 0) + 1)
  })

  const colorByStatus: Record<string, string> = {
    success: 'var(--color-chart-1)',
    retrying: 'var(--color-chart-3)',
    pending: 'var(--color-chart-2)',
    failed_permanently: 'var(--color-destructive)',
  }

  return Array.from(counts.entries())
    .sort((left, right) => right[1] - left[1])
    .map(([label, value]) => ({
      label,
      value,
      fill: colorByStatus[label] ?? 'var(--color-chart-4)',
    }))
}

export function buildStoreStatusDistribution(stores: Store[]): DistributionPoint[] {
  const activeCount = stores.filter((store) => store.status === 'active').length
  const inactiveCount = stores.length - activeCount

  return [
    { label: 'active', value: activeCount, fill: 'var(--color-chart-1)' },
    { label: 'inactive', value: inactiveCount, fill: 'var(--color-chart-4)' },
  ].filter((entry) => entry.value > 0)
}

export function countActiveTokens(tokens: StoreToken[]) {
  return tokens.filter((token) => !token.revoked_at).length
}

export function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('id-ID', {
    notation: value >= 1000 ? 'compact' : 'standard',
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value)
}

export function formatCurrencyShort(value: number, currency = 'IDR') {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    notation: value >= 1000000 ? 'compact' : 'standard',
    maximumFractionDigits: value >= 1000000 ? 1 : 0,
  }).format(value)
}
