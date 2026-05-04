import type { SessionContextValue } from '@/app/use-session'
import type {
  AuditLogFilters,
  AuditLogListResponse,
  DashboardTransactionListResponse,
  Store,
  StoreToken,
  WebhookDeliveryListResponse,
} from '@/features/dashboard/types'

type DashboardAPI = SessionContextValue['apiFetch']

export const dashboardQueryKeys = {
  stores: () => ['dashboard', 'stores'] as const,
  store: (storeId: string) => ['dashboard', 'stores', storeId] as const,
  storeTokens: (storeId: string) => ['dashboard', 'stores', storeId, 'tokens'] as const,
  transactions: (storeId: string, limit: number, offset: number, status: string, query: string) =>
    ['dashboard', 'stores', storeId, 'transactions', limit, offset, status, query] as const,
  auditLogs: (storeId: string, limit: number, offset: number, filters: AuditLogFilters) =>
    [
      'dashboard',
      'stores',
      storeId,
      'audit-logs',
      limit,
      offset,
      filters.direction,
      filters.query,
      filters.requestId,
      filters.orderId,
      filters.endpoint,
      filters.statusCode,
      filters.createdFrom,
      filters.createdTo,
    ] as const,
  webhookDeliveries: (storeId: string, limit: number, offset: number, status: string, query: string) =>
    ['dashboard', 'stores', storeId, 'webhook-deliveries', limit, offset, status, query] as const,
}

export async function fetchStores(apiFetch: DashboardAPI) {
  const data = await apiFetch<{ stores: Store[] }>('/v1/dashboard/stores')
  return data.stores ?? []
}

export function fetchStore(apiFetch: DashboardAPI, storeId: string) {
  return apiFetch<Store>(`/v1/dashboard/stores/${storeId}`)
}

export async function fetchStoreTokens(apiFetch: DashboardAPI, storeId: string) {
  const data = await apiFetch<{ tokens: StoreToken[] }>(`/v1/dashboard/stores/${storeId}/api-tokens`)
  return data.tokens ?? []
}

export function fetchTransactions(
  apiFetch: DashboardAPI,
  storeId: string,
  input: { limit: number; offset: number; status: string; query: string },
) {
  const params = new URLSearchParams({
    limit: String(input.limit),
    offset: String(input.offset),
  })
  if (input.status !== 'all') {
    params.set('status', input.status)
  }
  if (input.query) {
    params.set('query', input.query)
  }

  return apiFetch<DashboardTransactionListResponse>(`/v1/dashboard/stores/${storeId}/transactions?${params.toString()}`)
}

export function fetchAuditLogs(
  apiFetch: DashboardAPI,
  storeId: string,
  input: { limit: number; offset: number; filters: AuditLogFilters },
) {
  const params = new URLSearchParams({
    limit: String(input.limit),
    offset: String(input.offset),
  })
  if (input.filters.direction !== 'all') {
    params.set('direction', input.filters.direction)
  }
  if (input.filters.query) {
    params.set('query', input.filters.query)
  }
  if (input.filters.requestId) {
    params.set('request_id', input.filters.requestId)
  }
  if (input.filters.orderId) {
    params.set('order_id', input.filters.orderId)
  }
  if (input.filters.endpoint) {
    params.set('endpoint', input.filters.endpoint)
  }
  if (input.filters.statusCode) {
    params.set('status_code', input.filters.statusCode)
  }
  if (input.filters.createdFrom) {
    params.set('created_from', input.filters.createdFrom)
  }
  if (input.filters.createdTo) {
    params.set('created_to', input.filters.createdTo)
  }

  return apiFetch<AuditLogListResponse>(`/v1/dashboard/stores/${storeId}/audit-logs?${params.toString()}`)
}

export function fetchWebhookDeliveries(
  apiFetch: DashboardAPI,
  storeId: string,
  input: { limit: number; offset: number; status: string; query: string },
) {
  const params = new URLSearchParams({
    limit: String(input.limit),
    offset: String(input.offset),
  })
  if (input.status !== 'all') {
    params.set('status', input.status)
  }
  if (input.query) {
    params.set('query', input.query)
  }

  return apiFetch<WebhookDeliveryListResponse>(`/v1/dashboard/stores/${storeId}/webhook-deliveries?${params.toString()}`)
}
