import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import type { APIError, SessionContextValue } from '@/app/use-session'
import {
  dashboardQueryKeys,
  fetchAuditLogs,
  fetchStore,
  fetchStores,
  fetchStoreTokens,
  fetchTransactions,
  fetchWebhookDeliveries,
} from '@/features/dashboard/queries'
import type {
  AuditLog,
  AuditLogFilters,
  DashboardTab,
  DashboardTransaction,
  Store,
  StoreToken,
  WebhookDelivery,
  WebhookDeliveryDetail,
} from '@/features/dashboard/types'

const emptyStores: Store[] = []
const emptyTokens: StoreToken[] = []
const emptyTransactions: DashboardTransaction[] = []
const emptyAuditLogs: AuditLog[] = []
const emptyDeliveries: WebhookDelivery[] = []

function extractErrorMessage(error: unknown) {
  const apiError = error as APIError
  return apiError?.message ?? 'Terjadi error yang tidak diketahui.'
}

type UseDashboardWorkspaceQueriesParams = {
  activeTab: DashboardTab
  apiFetch: SessionContextValue['apiFetch']
  auditFilters: AuditLogFilters
  auditOffset: number
  auditPageSize: number
  deliveryOffset: number
  deliveryPageSize: number
  deliveryQuery: string
  deliveryStatusFilter: string
  isAuthenticated: boolean
  selectedAuditLog: AuditLog | null
  selectedDeliveryId: string | null
  selectedStoreId: string | null
  selectedTransactionId: string | null
  transactionOffset: number
  transactionPageSize: number
  transactionQuery: string
  transactionStatusFilter: string
}

export function useDashboardWorkspaceQueries({
  activeTab,
  apiFetch,
  auditFilters,
  auditOffset,
  auditPageSize,
  deliveryOffset,
  deliveryPageSize,
  deliveryQuery,
  deliveryStatusFilter,
  isAuthenticated,
  selectedAuditLog,
  selectedDeliveryId,
  selectedStoreId,
  selectedTransactionId,
  transactionOffset,
  transactionPageSize,
  transactionQuery,
  transactionStatusFilter,
}: UseDashboardWorkspaceQueriesParams) {
  const storesQuery = useQuery({
    queryKey: dashboardQueryKeys.stores(),
    queryFn: () => fetchStores(apiFetch),
    enabled: isAuthenticated,
  })
  const stores = storesQuery.data ?? emptyStores

  const selectedStoreSummary = useMemo(
    () => stores.find((item) => item.id === selectedStoreId) ?? null,
    [selectedStoreId, stores],
  )

  const selectedStoreQuery = useQuery({
    queryKey: selectedStoreId ? dashboardQueryKeys.store(selectedStoreId) : ['dashboard', 'stores', 'selected-store'],
    queryFn: () => fetchStore(apiFetch, selectedStoreId ?? ''),
    enabled: Boolean(isAuthenticated && selectedStoreId),
  })
  const selectedStore = selectedStoreQuery.data ?? null

  const tokensQuery = useQuery({
    queryKey: selectedStoreId ? dashboardQueryKeys.storeTokens(selectedStoreId) : ['dashboard', 'stores', 'selected-store', 'tokens'],
    queryFn: () => fetchStoreTokens(apiFetch, selectedStoreId ?? ''),
    enabled: Boolean(isAuthenticated && selectedStoreId),
  })
  const tokens = tokensQuery.data ?? emptyTokens

  const transactionsQuery = useQuery({
    queryKey: selectedStoreId
      ? dashboardQueryKeys.transactions(selectedStoreId, transactionPageSize, transactionOffset, transactionStatusFilter, transactionQuery)
      : ['dashboard', 'stores', 'selected-store', 'transactions'],
    queryFn: () =>
      fetchTransactions(apiFetch, selectedStoreId ?? '', {
        limit: transactionPageSize,
        offset: transactionOffset,
        status: transactionStatusFilter,
        query: transactionQuery,
      }),
    enabled: Boolean(isAuthenticated && selectedStoreId),
    placeholderData: keepPreviousData,
  })
  const transactions = transactionsQuery.data?.transactions ?? emptyTransactions
  const transactionMeta = transactionsQuery.data?.meta ?? {
    total: 0,
    limit: transactionPageSize,
    offset: transactionOffset,
    has_next: false,
  }

  const auditLogsQuery = useQuery({
    queryKey: selectedStoreId
      ? dashboardQueryKeys.auditLogs(selectedStoreId, auditPageSize, auditOffset, auditFilters)
      : ['dashboard', 'stores', 'selected-store', 'audit-logs'],
    queryFn: () =>
      fetchAuditLogs(apiFetch, selectedStoreId ?? '', {
        limit: auditPageSize,
        offset: auditOffset,
        filters: auditFilters,
      }),
    enabled: Boolean(isAuthenticated && selectedStoreId),
    placeholderData: keepPreviousData,
  })
  const auditLogs = auditLogsQuery.data?.logs ?? emptyAuditLogs
  const auditMeta = auditLogsQuery.data?.meta ?? {
    total: 0,
    limit: auditPageSize,
    offset: auditOffset,
    has_next: false,
  }

  const deliveriesQuery = useQuery({
    queryKey: selectedStoreId
      ? dashboardQueryKeys.webhookDeliveries(selectedStoreId, deliveryPageSize, deliveryOffset, deliveryStatusFilter, deliveryQuery)
      : ['dashboard', 'stores', 'selected-store', 'webhook-deliveries'],
    queryFn: () =>
      fetchWebhookDeliveries(apiFetch, selectedStoreId ?? '', {
        limit: deliveryPageSize,
        offset: deliveryOffset,
        status: deliveryStatusFilter,
        query: deliveryQuery,
      }),
    enabled: Boolean(isAuthenticated && selectedStoreId),
    placeholderData: keepPreviousData,
  })
  const deliveries = deliveriesQuery.data?.deliveries ?? emptyDeliveries
  const deliveryMeta = deliveriesQuery.data?.meta ?? {
    total: 0,
    limit: deliveryPageSize,
    offset: deliveryOffset,
    has_next: false,
  }

  const selectedTransactionQuery = useQuery({
    queryKey: selectedStoreId && selectedTransactionId
      ? ['dashboard', 'stores', selectedStoreId, 'transactions', selectedTransactionId, 'detail']
      : ['dashboard', 'stores', 'selected-store', 'transactions', 'detail'],
    queryFn: () =>
      apiFetch<DashboardTransaction>(`/v1/dashboard/stores/${selectedStoreId}/transactions/${selectedTransactionId}`),
    enabled: Boolean(isAuthenticated && activeTab === 'transactions' && selectedStoreId && selectedTransactionId),
  })
  const selectedTransaction = selectedTransactionQuery.data ?? null

  const selectedDeliveryQuery = useQuery({
    queryKey: selectedDeliveryId
      ? ['dashboard', 'webhook-deliveries', selectedDeliveryId, 'detail']
      : ['dashboard', 'webhook-deliveries', 'detail'],
    queryFn: () => apiFetch<WebhookDeliveryDetail>(`/v1/dashboard/webhook-deliveries/${selectedDeliveryId}`),
    enabled: Boolean(isAuthenticated && activeTab === 'webhooks' && selectedDeliveryId),
  })
  const selectedDelivery = selectedDeliveryQuery.data ?? null

  const effectiveSelectedAuditLog = useMemo(() => {
    if (auditLogs.length === 0) {
      return null
    }

    if (!selectedAuditLog) {
      return auditLogs[0]
    }

    return auditLogs.find((item) => item.id === selectedAuditLog.id) ?? auditLogs[0]
  }, [auditLogs, selectedAuditLog])

  const workspaceErrorMessage = useMemo(() => {
    const error =
      storesQuery.error ??
      selectedStoreQuery.error ??
      tokensQuery.error ??
      transactionsQuery.error ??
      selectedTransactionQuery.error ??
      auditLogsQuery.error ??
      deliveriesQuery.error ??
      selectedDeliveryQuery.error

    return error ? extractErrorMessage(error) : null
  }, [
    auditLogsQuery.error,
    deliveriesQuery.error,
    selectedDeliveryQuery.error,
    selectedStoreQuery.error,
    selectedTransactionQuery.error,
    storesQuery.error,
    tokensQuery.error,
    transactionsQuery.error,
  ])

  return {
    auditLogs,
    auditLogsQuery,
    auditMeta,
    deliveries,
    deliveriesQuery,
    deliveryMeta,
    effectiveSelectedAuditLog,
    selectedDelivery,
    selectedDeliveryQuery,
    selectedStore,
    selectedStoreQuery,
    selectedStoreSummary,
    selectedTransaction,
    selectedTransactionQuery,
    stores,
    storesQuery,
    tokens,
    tokensQuery,
    transactionMeta,
    transactions,
    transactionsQuery,
    workspaceErrorMessage,
  }
}
