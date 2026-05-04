import { QueryClientProvider, keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { Suspense, lazy, useCallback, useEffect, useMemo, useState, type CSSProperties, type FormEvent } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { RefreshCcw } from 'lucide-react'

import { queryClient } from '@/app/query-client'
import { useSession, type APIError } from '@/app/use-session'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import { TooltipProvider } from '@/components/ui/tooltip'
import { DashboardAppSidebar } from '@/features/dashboard/components/dashboard-app-sidebar'
import { ProfileSessionPanel } from '@/features/dashboard/components/profile-session-panel'
import { ProfileWorkspacePanel } from '@/features/dashboard/components/profile-workspace-panel'
import { DashboardSiteHeader } from '@/features/dashboard/components/dashboard-site-header'
import {
  dashboardQueryKeys,
  fetchAuditLogs,
  fetchStore,
  fetchStores,
  fetchStoreTokens,
  fetchTransactions,
  fetchWebhookDeliveries,
} from '@/features/dashboard/queries'
import { WorkspaceHeader } from '@/features/dashboard/components/workspace-header'
import type {
  AuditLog,
  AuditLogFilters,
  DashboardTab,
  DashboardTransaction,
  FilterOption,
  PasswordForm,
  PaginationMeta,
  Store,
  StoreCreateForm,
  StoreSettingsForm,
  StoreToken,
  TokenCreateFormValues,
  WebhookDelivery,
  WebhookDeliveryDetail,
} from '@/features/dashboard/types'
import { useDocumentTitle } from '@/lib/use-document-title'
import { cn } from '@/lib/utils'

type FlashTone = 'success' | 'error' | 'info'

type FlashMessage = {
  tone: FlashTone
  message: string
}

const StoreOverviewPanel = lazy(() =>
  import('@/features/dashboard/components/store-overview-panel').then((module) => ({ default: module.StoreOverviewPanel })),
)
const TokensPanel = lazy(() =>
  import('@/features/dashboard/components/tokens-panel').then((module) => ({ default: module.TokensPanel })),
)
const TransactionsPanel = lazy(() =>
  import('@/features/dashboard/components/transactions-panel').then((module) => ({ default: module.TransactionsPanel })),
)
const AuditLogsPanel = lazy(() =>
  import('@/features/dashboard/components/audit-logs-panel').then((module) => ({ default: module.AuditLogsPanel })),
)
const WebhookDeliveriesPanel = lazy(() =>
  import('@/features/dashboard/components/webhook-deliveries-panel').then((module) => ({ default: module.WebhookDeliveriesPanel })),
)
const DeveloperDocsPanel = lazy(() =>
  import('@/features/dashboard/components/developer-docs-panel').then((module) => ({ default: module.DeveloperDocsPanel })),
)

const tabOptions: Array<{ value: DashboardTab; label: string }> = [
  { value: 'overview', label: 'Store' },
  { value: 'tokens', label: 'Token API' },
  { value: 'transactions', label: 'Transaksi' },
  { value: 'audit', label: 'Audit Log' },
  { value: 'webhooks', label: 'Webhook' },
  { value: 'docs', label: 'Dokumentasi API' },
  { value: 'profile', label: 'Profil & Sesi' },
]

const transactionPageSize = 10
const auditPageSize = 10
const deliveryPageSize = 10
const emptyStores: Store[] = []
const emptyTokens: StoreToken[] = []
const emptyTransactions: DashboardTransaction[] = []
const emptyAuditLogs: AuditLog[] = []
const emptyDeliveries: WebhookDelivery[] = []
const emptyAuditFilters: AuditLogFilters = {
  direction: 'all',
  query: '',
  requestId: '',
  orderId: '',
  endpoint: '',
  statusCode: '',
  createdFrom: '',
  createdTo: '',
}

const defaultPaginationMeta: PaginationMeta = {
  total: 0,
  limit: transactionPageSize,
  offset: 0,
  has_next: false,
}

const transactionStatusOptions: readonly FilterOption[] = [
  { value: 'all', label: 'Semua status' },
  { value: 'pending', label: 'pending' },
  { value: 'paid', label: 'paid' },
  { value: 'challenge', label: 'challenge' },
  { value: 'failed', label: 'failed' },
  { value: 'expired', label: 'expired' },
  { value: 'cancelled', label: 'cancelled' },
  { value: 'refunded', label: 'refunded' },
  { value: 'partial_refunded', label: 'partial_refunded' },
  { value: 'unknown', label: 'unknown' },
] as const

const deliveryStatusOptions: readonly FilterOption[] = [
  { value: 'all', label: 'Semua status' },
  { value: 'pending', label: 'pending' },
  { value: 'retrying', label: 'retrying' },
  { value: 'success', label: 'success' },
  { value: 'failed_permanently', label: 'failed_permanently' },
] as const

const auditDirectionOptions: readonly FilterOption[] = [
  { value: 'all', label: 'Semua arah' },
  { value: 'inbound', label: 'inbound' },
  { value: 'outbound', label: 'outbound' },
] as const

function isDashboardTab(value: string | null): value is DashboardTab {
  return tabOptions.some((item) => item.value === value)
}

function buildDashboardDestination(
  storeId: string | null,
  tab: DashboardTab,
  detail: { transactionId?: string | null; deliveryId?: string | null } = {},
) {
  const normalizedStoreId = storeId?.trim() || null
  const transactionId = detail.transactionId?.trim() || null
  const deliveryId = detail.deliveryId?.trim() || null

  if (tab === 'profile') {
    return {
      pathname: '/app/profile',
      search: '',
    }
  }

  if (normalizedStoreId && tab === 'overview') {
    return {
      pathname: `/app/stores/${normalizedStoreId}`,
      search: '',
    }
  }

  if (normalizedStoreId && tab === 'tokens') {
    return {
      pathname: `/app/stores/${normalizedStoreId}/tokens`,
      search: '',
    }
  }

  if (normalizedStoreId && tab === 'transactions') {
    return {
      pathname: transactionId
        ? `/app/stores/${normalizedStoreId}/transactions/${transactionId}`
        : `/app/stores/${normalizedStoreId}/transactions`,
      search: '',
    }
  }

  if (normalizedStoreId && tab === 'audit') {
    return {
      pathname: `/app/stores/${normalizedStoreId}/audit`,
      search: '',
    }
  }

  if (normalizedStoreId && tab === 'webhooks') {
    return {
      pathname: deliveryId
        ? `/app/stores/${normalizedStoreId}/webhooks/${deliveryId}`
        : `/app/stores/${normalizedStoreId}/webhooks`,
      search: '',
    }
  }

  if (normalizedStoreId && tab === 'docs') {
    return {
      pathname: `/app/stores/${normalizedStoreId}/docs`,
      search: '',
    }
  }

  const searchParams = new URLSearchParams()
  if (normalizedStoreId) {
    searchParams.set('store', normalizedStoreId)
  }
  searchParams.set('tab', tab)

  const search = searchParams.toString()
  return {
    pathname: '/app',
    search: search ? `?${search}` : '',
  }
}

function formatDate(value?: string | null) {
  if (!value) {
    return '—'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function formatCurrency(amount: number, currency: string) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount)
}

function prettyJSON(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2)
}

function extractErrorMessage(error: unknown) {
  const apiError = error as APIError
  return apiError?.message ?? 'Terjadi error yang tidak diketahui.'
}

function DashboardTabLoader({
  eyebrow = 'Memuat Tab',
  message = 'Panel aktif dimuat terpisah agar bundle awal dashboard tetap ringan.',
  title = 'Menyiapkan konten workspace…',
}: {
  eyebrow?: string
  message?: string
  title?: string
}) {
  return (
    <Card>
      <CardContent className="grid gap-3 p-6">
        <Badge variant="secondary" className="w-fit">
          {eyebrow}
        </Badge>
        <strong className="text-lg font-semibold text-foreground">{title}</strong>
        <p className="text-sm leading-6 text-muted-foreground">{message}</p>
      </CardContent>
    </Card>
  )
}

function DashboardWorkspace() {
  const { apiFetch, isAuthenticated, logout, mfa, reloadSession, tokens: sessionTokens, user } = useSession()
  const queryClient = useQueryClient()
  const location = useLocation()
  const navigate = useNavigate()
  const { deliveryId: routeDeliveryId, storeId: routeStoreId, transactionId: routeTransactionId } = useParams()
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false)
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLog | null>(null)
  const [revealedStoreSecret, setRevealedStoreSecret] = useState<{ storeName: string; secret: string } | null>(null)
  const [revealedToken, setRevealedToken] = useState<StoreToken | null>(null)
  const [flash, setFlash] = useState<FlashMessage | null>(null)
  const [isSavingStore, setIsSavingStore] = useState(false)
  const [isCreatingStore, setIsCreatingStore] = useState(false)
  const [isCreatingToken, setIsCreatingToken] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isViewingWebhookSecret, setIsViewingWebhookSecret] = useState(false)
  const [isRotatingWebhookSecret, setIsRotatingWebhookSecret] = useState(false)
  const [rotatingTokenId, setRotatingTokenId] = useState<string | null>(null)
  const [transactionOffset, setTransactionOffset] = useState(0)
  const [transactionQueryDraft, setTransactionQueryDraft] = useState('')
  const [transactionQuery, setTransactionQuery] = useState('')
  const [transactionStatusFilter, setTransactionStatusFilter] = useState<(typeof transactionStatusOptions)[number]['value']>('all')
  const [auditOffset, setAuditOffset] = useState(0)
  const [auditFiltersDraft, setAuditFiltersDraft] = useState<AuditLogFilters>(emptyAuditFilters)
  const [auditFilters, setAuditFilters] = useState<AuditLogFilters>(emptyAuditFilters)
  const [deliveryOffset, setDeliveryOffset] = useState(0)
  const [deliveryQueryDraft, setDeliveryQueryDraft] = useState('')
  const [deliveryQuery, setDeliveryQuery] = useState('')
  const [deliveryStatusFilter, setDeliveryStatusFilter] = useState<(typeof deliveryStatusOptions)[number]['value']>('all')

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search])
  const routeTab = useMemo<DashboardTab | null>(() => {
    if (location.pathname === '/app/profile') {
      return 'profile'
    }

    if (routeTransactionId || location.pathname.endsWith('/transactions')) {
      return 'transactions'
    }

    if (routeDeliveryId || location.pathname.endsWith('/webhooks')) {
      return 'webhooks'
    }

    if (!routeStoreId) {
      return null
    }

    if (location.pathname.endsWith('/tokens')) {
      return 'tokens'
    }

    if (location.pathname.endsWith('/audit')) {
      return 'audit'
    }

    if (location.pathname.endsWith('/docs')) {
      return 'docs'
    }

    return 'overview'
  }, [location.pathname, routeDeliveryId, routeStoreId, routeTransactionId])
  const activeTab = routeTab ?? (isDashboardTab(searchParams.get('tab')) ? (searchParams.get('tab') as DashboardTab) : 'overview')
  const selectedStoreId = activeTab === 'profile' ? null : routeStoreId ?? searchParams.get('store')
  const selectedTransactionId = routeTransactionId ?? searchParams.get('transaction')
  const selectedDeliveryId = routeDeliveryId ?? searchParams.get('delivery')

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
  const activeTabLabel = useMemo(
    () => tabOptions.find((item) => item.value === activeTab)?.label ?? 'Dashboard',
    [activeTab],
  )

  const setWorkspaceParams = useCallback((storeId: string | null, tab = activeTab) => {
    navigate(buildDashboardDestination(storeId, tab), { replace: true })
  }, [activeTab, navigate])

  const setDetailParams = useCallback((updates: { transactionId?: string | null; deliveryId?: string | null }) => {
    if (!selectedStoreId) {
      navigate(buildDashboardDestination(null, activeTab), { replace: true })
      return
    }

    navigate(
      buildDashboardDestination(selectedStoreId, activeTab, {
        transactionId: updates.transactionId,
        deliveryId: updates.deliveryId,
      }),
      { replace: true },
    )
  }, [activeTab, navigate, selectedStoreId])

  const resetWorkspaceView = useCallback(() => {
    setRevealedStoreSecret(null)
    setRevealedToken(null)
    setSelectedAuditLog(null)
    setTransactionOffset(0)
    setAuditOffset(0)
    setDeliveryOffset(0)
  }, [])

  const handleSelectStore = useCallback((storeId: string | null, tab = activeTab) => {
    resetWorkspaceView()
    setIsMobileSidebarOpen(false)
    setWorkspaceParams(storeId, tab === 'profile' ? 'overview' : tab)
  }, [activeTab, resetWorkspaceView, setWorkspaceParams])

  const handleSelectTab = useCallback((tab: DashboardTab) => {
    setIsMobileSidebarOpen(false)
    setWorkspaceParams(selectedStoreId, tab)
  }, [selectedStoreId, setWorkspaceParams])

  useEffect(() => {
    if (activeTab === 'profile') {
      return
    }

    if (!storesQuery.isSuccess) {
      return
    }

    if (stores.length === 0) {
      if (selectedStoreId) {
        setWorkspaceParams(null, activeTab)
      }
      return
    }

    const targetStoreId =
      selectedStoreId && stores.some((item) => item.id === selectedStoreId)
        ? selectedStoreId
        : stores[0].id

    if (targetStoreId !== selectedStoreId) {
      setWorkspaceParams(targetStoreId)
    }
  }, [activeTab, selectedStoreId, setWorkspaceParams, stores, storesQuery.isSuccess])

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
    ...defaultPaginationMeta,
    limit: transactionPageSize,
    offset: transactionOffset,
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
    ...defaultPaginationMeta,
    limit: auditPageSize,
    offset: auditOffset,
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
    ...defaultPaginationMeta,
    limit: deliveryPageSize,
    offset: deliveryOffset,
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

  const feedbackMessage = flash ?? (workspaceErrorMessage ? { tone: 'error' as const, message: workspaceErrorMessage } : null)

  const isLoadingStores = storesQuery.isPending
  const isLoadingWorkspace = Boolean(selectedStoreId) && (
    selectedStoreQuery.isPending ||
    tokensQuery.isPending ||
    transactionsQuery.isPending ||
    auditLogsQuery.isPending ||
    deliveriesQuery.isPending
  )
  const isTransactionsLoading = transactionsQuery.isFetching
  const isAuditLogsLoading = auditLogsQuery.isFetching
  const isDeliveriesLoading = deliveriesQuery.isFetching
  const isTransactionDetailLoading = selectedTransactionQuery.isFetching
  const isDeliveryDetailLoading = selectedDeliveryQuery.isFetching

  const handleCreateStore = async (values: StoreCreateForm) => {
    setIsCreatingStore(true)
    setFlash(null)

    try {
      const created = await apiFetch<Store>(`/v1/dashboard/stores`, {
        method: 'POST',
        body: JSON.stringify(values),
      })

      setRevealedStoreSecret(
        created.webhook_secret
          ? {
              storeName: created.name,
              secret: created.webhook_secret,
            }
          : null,
      )
      setFlash({
        tone: 'success',
        message: `Store ${created.name} berhasil dibuat.`,
      })
      await queryClient.invalidateQueries({
        queryKey: dashboardQueryKeys.stores(),
      })
      handleSelectStore(created.id)
      return true
    } catch (error) {
      setFlash({
        tone: 'error',
        message: extractErrorMessage(error),
      })
      return false
    } finally {
      setIsCreatingStore(false)
    }
  }

  const handleUpdateStore = async (values: StoreSettingsForm) => {
    if (!selectedStoreId) {
      return false
    }

    setIsSavingStore(true)
    setFlash(null)

    try {
      const updated = await apiFetch<Store>(`/v1/dashboard/stores/${selectedStoreId}`, {
        method: 'PATCH',
        body: JSON.stringify(values),
      })

      queryClient.setQueryData(dashboardQueryKeys.store(selectedStoreId), updated)
      queryClient.setQueryData<Store[]>(dashboardQueryKeys.stores(), (current) =>
        current?.map((item) => (item.id === updated.id ? updated : item)) ?? [updated],
      )
      setFlash({
        tone: 'success',
        message: `Store ${updated.name} berhasil diperbarui.`,
      })
      return true
    } catch (error) {
      setFlash({
        tone: 'error',
        message: extractErrorMessage(error),
      })
      return false
    } finally {
      setIsSavingStore(false)
    }
  }

  const handleDeactivateStore = async () => {
    if (!selectedStoreId) {
      return
    }

    setFlash(null)
    try {
      await apiFetch<void>(`/v1/dashboard/stores/${selectedStoreId}`, {
        method: 'DELETE',
      })

      setFlash({
        tone: 'success',
        message: 'Store berhasil dinonaktifkan.',
      })
      queryClient.removeQueries({
        queryKey: dashboardQueryKeys.store(selectedStoreId),
      })
      queryClient.removeQueries({
        queryKey: dashboardQueryKeys.storeTokens(selectedStoreId),
      })
      queryClient.removeQueries({
        queryKey: ['dashboard', 'stores', selectedStoreId, 'transactions'],
      })
      queryClient.removeQueries({
        queryKey: ['dashboard', 'stores', selectedStoreId, 'audit-logs'],
      })
      queryClient.removeQueries({
        queryKey: ['dashboard', 'stores', selectedStoreId, 'webhook-deliveries'],
      })
      await queryClient.invalidateQueries({
        queryKey: dashboardQueryKeys.stores(),
      })
    } catch (error) {
      setFlash({
        tone: 'error',
        message: extractErrorMessage(error),
      })
    }
  }

  const handleCreateToken = async (values: TokenCreateFormValues) => {
    if (!selectedStoreId) {
      return false
    }

    setIsCreatingToken(true)
    setFlash(null)

    try {
      const created = await apiFetch<StoreToken>(`/v1/dashboard/stores/${selectedStoreId}/api-tokens`, {
        method: 'POST',
        body: JSON.stringify(values),
      })

      setRevealedToken(created)
      setFlash({
        tone: 'success',
        message: `Token ${created.name} berhasil dibuat.`,
      })
      await queryClient.invalidateQueries({
        queryKey: dashboardQueryKeys.storeTokens(selectedStoreId),
      })
      return true
    } catch (error) {
      setFlash({
        tone: 'error',
        message: extractErrorMessage(error),
      })
      return false
    } finally {
      setIsCreatingToken(false)
    }
  }

  const handleRevokeToken = async (tokenId: string) => {
    if (!selectedStoreId) {
      return
    }

    setFlash(null)
    try {
      await apiFetch<void>(`/v1/dashboard/stores/${selectedStoreId}/api-tokens/${tokenId}`, {
        method: 'DELETE',
      })
      queryClient.setQueryData<StoreToken[]>(dashboardQueryKeys.storeTokens(selectedStoreId), (current) =>
        current?.map((item) => (item.id === tokenId ? { ...item, revoked_at: new Date().toISOString() } : item)) ?? [],
      )
      setFlash({
        tone: 'success',
        message: 'Token berhasil direvoke.',
      })
    } catch (error) {
      setFlash({
        tone: 'error',
        message: extractErrorMessage(error),
      })
    }
  }

  const handleRotateToken = async (tokenId: string) => {
    if (!selectedStoreId) {
      return
    }

    setRotatingTokenId(tokenId)
    setFlash(null)
    try {
      const rotated = await apiFetch<StoreToken>(`/v1/dashboard/stores/${selectedStoreId}/api-tokens/${tokenId}/rotate`, {
        method: 'POST',
      })
      setRevealedToken(rotated)
      await queryClient.invalidateQueries({
        queryKey: dashboardQueryKeys.storeTokens(selectedStoreId),
      })
      setFlash({
        tone: 'success',
        message: `Token ${rotated.name} berhasil dirotasi. Token lama sudah direvoke.`,
      })
    } catch (error) {
      setFlash({
        tone: 'error',
        message: extractErrorMessage(error),
      })
    } finally {
      setRotatingTokenId(null)
    }
  }

  const handleRevealWebhookSecret = async () => {
    if (!selectedStoreId) {
      return
    }

    setIsViewingWebhookSecret(true)
    setFlash(null)
    try {
      const payload = await apiFetch<{ store_id: string; secret: string }>(`/v1/dashboard/stores/${selectedStoreId}/webhook-secret`)
      setRevealedStoreSecret({
        storeName: selectedStore?.name ?? currentStoreName,
        secret: payload.secret,
      })
      setFlash({
        tone: 'info',
        message: 'Webhook secret berhasil ditampilkan. Perlakukan seperti credential sensitif.',
      })
    } catch (error) {
      setFlash({
        tone: 'error',
        message: extractErrorMessage(error),
      })
    } finally {
      setIsViewingWebhookSecret(false)
    }
  }

  const handleRotateWebhookSecret = async () => {
    if (!selectedStoreId) {
      return
    }

    setIsRotatingWebhookSecret(true)
    setFlash(null)
    try {
      const payload = await apiFetch<{ store_id: string; secret: string }>(
        `/v1/dashboard/stores/${selectedStoreId}/webhook-secret/rotate`,
        {
          method: 'POST',
        },
      )
      setRevealedStoreSecret({
        storeName: selectedStore?.name ?? currentStoreName,
        secret: payload.secret,
      })
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: dashboardQueryKeys.stores(),
        }),
        queryClient.invalidateQueries({
          queryKey: dashboardQueryKeys.store(selectedStoreId),
        }),
      ])
      setFlash({
        tone: 'success',
        message: 'Webhook secret berhasil dirotasi. Backend store harus memakai secret baru untuk verifikasi signature.',
      })
    } catch (error) {
      setFlash({
        tone: 'error',
        message: extractErrorMessage(error),
      })
    } finally {
      setIsRotatingWebhookSecret(false)
    }
  }

  const handleChangePassword = async (values: PasswordForm) => {
    setIsChangingPassword(true)
    setFlash(null)

    try {
      await apiFetch<void>('/v1/dashboard/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(values),
      })
      setFlash({
        tone: 'success',
        message: 'Password dashboard berhasil diubah.',
      })
      return true
    } catch (error) {
      setFlash({
        tone: 'error',
        message: extractErrorMessage(error),
      })
      return false
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleReloadProfile = async () => {
    setFlash(null)
    try {
      await reloadSession()
      setFlash({
        tone: 'success',
        message: 'Profil, expiry token, dan status MFA berhasil disegarkan.',
      })
    } catch (error) {
      setFlash({
        tone: 'error',
        message: extractErrorMessage(error),
      })
    }
  }

  const handleTransactionSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setTransactionQuery(transactionQueryDraft.trim())
    setTransactionOffset(0)
  }

  const handleResetTransactionFilters = () => {
    setTransactionQueryDraft('')
    setTransactionQuery('')
    setTransactionStatusFilter('all')
    setTransactionOffset(0)
  }

  const handleTransactionStatusChange = (value: (typeof transactionStatusOptions)[number]['value']) => {
    setTransactionStatusFilter(value)
    setTransactionOffset(0)
  }

  const handleTransactionPageChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setTransactionOffset((current) => Math.max(current - transactionMeta.limit, 0))
      return
    }

    if (!transactionMeta.has_next) {
      return
    }

    setTransactionOffset((current) => current + transactionMeta.limit)
  }

  const handleAuditSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setAuditFilters({
      direction: auditFiltersDraft.direction,
      query: auditFiltersDraft.query.trim(),
      requestId: auditFiltersDraft.requestId.trim(),
      orderId: auditFiltersDraft.orderId.trim(),
      endpoint: auditFiltersDraft.endpoint.trim(),
      statusCode: auditFiltersDraft.statusCode.trim(),
      createdFrom: auditFiltersDraft.createdFrom,
      createdTo: auditFiltersDraft.createdTo,
    })
    setAuditOffset(0)
  }

  const handleResetAuditFilters = () => {
    setAuditFiltersDraft(emptyAuditFilters)
    setAuditFilters(emptyAuditFilters)
    setAuditOffset(0)
  }

  const handleAuditFilterChange = (field: keyof AuditLogFilters, value: string) => {
    setAuditFiltersDraft((current) => ({
      ...current,
      [field]: value,
    }))
  }

  const handleAuditPageChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setAuditOffset((current) => Math.max(current - auditMeta.limit, 0))
      return
    }

    if (!auditMeta.has_next) {
      return
    }

    setAuditOffset((current) => current + auditMeta.limit)
  }

  const handleDeliverySearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setDeliveryQuery(deliveryQueryDraft.trim())
    setDeliveryOffset(0)
  }

  const handleResetDeliveryFilters = () => {
    setDeliveryQueryDraft('')
    setDeliveryQuery('')
    setDeliveryStatusFilter('all')
    setDeliveryOffset(0)
  }

  const handleDeliveryStatusChange = (value: (typeof deliveryStatusOptions)[number]['value']) => {
    setDeliveryStatusFilter(value)
    setDeliveryOffset(0)
  }

  const handleDeliveryPageChange = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setDeliveryOffset((current) => Math.max(current - deliveryMeta.limit, 0))
      return
    }

    if (!deliveryMeta.has_next) {
      return
    }

    setDeliveryOffset((current) => current + deliveryMeta.limit)
  }

  const handleLoadTransaction = useCallback((transactionId: string) => {
    setDetailParams({
      transactionId,
      deliveryId: null,
    })
  }, [setDetailParams])

  const handleClearTransactionSelection = useCallback(() => {
    setDetailParams({ transactionId: null })
  }, [setDetailParams])

  const handleLoadDelivery = useCallback((deliveryId: string) => {
    setDetailParams({
      transactionId: null,
      deliveryId,
    })
  }, [setDetailParams])

  const handleClearDeliverySelection = useCallback(() => {
    setDetailParams({ deliveryId: null })
  }, [setDetailParams])

  const handleResendDelivery = async (deliveryId: string) => {
    if (!selectedStoreId) {
      return
    }

    setFlash(null)
    try {
      await apiFetch(`/v1/dashboard/webhook-deliveries/${deliveryId}/resend`, {
        method: 'POST',
      })

      setFlash({
        tone: 'success',
        message: 'Webhook delivery berhasil di-enqueue ulang.',
      })

      const detail = await apiFetch<WebhookDeliveryDetail>(`/v1/dashboard/webhook-deliveries/${deliveryId}`)
      queryClient.setQueryData(['dashboard', 'webhook-deliveries', deliveryId, 'detail'], detail)
      await queryClient.invalidateQueries({
        queryKey: ['dashboard', 'stores', selectedStoreId, 'webhook-deliveries'],
      })
    } catch (error) {
      setFlash({
        tone: 'error',
        message: extractErrorMessage(error),
      })
    }
  }

  const currentStoreName = selectedStore?.name ?? selectedStoreSummary?.name ?? 'Pilih store'
  const workspaceTitle = activeTab === 'profile' ? 'Profil & Sesi' : currentStoreName
  const headerTitle = activeTab === 'profile' ? (user?.name ?? 'Profil Akun') : currentStoreName
  const headerStatusLabel = activeTab === 'profile' ? 'Akun aktif' : selectedStoreId ? 'Store aktif' : 'Pilih store'
  const headerStatusVariant: 'secondary' | 'success' = activeTab === 'profile' ? 'secondary' : selectedStoreId ? 'success' : 'secondary'
  const pageTitle =
    activeTab === 'profile'
      ? 'Profil & Sesi | PayGate'
      : activeTab === 'overview' && !selectedStoreId
      ? 'Dashboard | PayGate'
      : selectedStoreId
        ? `${currentStoreName} · ${activeTabLabel} | PayGate`
        : `Dashboard · ${activeTabLabel} | PayGate`

  useDocumentTitle(pageTitle)

  return (
    <TooltipProvider>
      <SidebarProvider
        onOpenMobileChange={setIsMobileSidebarOpen}
        openMobile={isMobileSidebarOpen}
        style={
          {
            '--sidebar-width': '18rem',
            '--header-height': '4rem',
          } as CSSProperties
        }
      >
        <DashboardAppSidebar
          activeTab={activeTab}
          currentStoreName={currentStoreName}
          isCreatingStore={isCreatingStore}
          isLoadingStores={isLoadingStores}
          onCopySecret={(secret) => void navigator.clipboard.writeText(secret)}
          onCreateStore={handleCreateStore}
          onSelectStore={handleSelectStore}
          onSelectTab={handleSelectTab}
          revealedStoreSecret={revealedStoreSecret}
          selectedStoreId={selectedStoreId}
          stores={stores}
          tabOptions={tabOptions}
          user={user}
        />
        <SidebarInset className="min-h-svh bg-transparent">
          <DashboardSiteHeader
            activeTabLabel={activeTabLabel}
            headerTitle={headerTitle}
            onLogout={logout}
            statusLabel={headerStatusLabel}
            statusVariant={headerStatusVariant}
            user={user}
          />

          <main className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-4 py-4 md:gap-6 md:py-6">
              <section className="grid gap-6 px-4 lg:px-6">
                <WorkspaceHeader
                  activeTab={activeTab}
                  activeTokensCount={tokens.filter((item) => !item.revoked_at).length}
                  currentStoreName={workspaceTitle}
                  deliveriesCount={deliveries.length}
                  onSelectTab={handleSelectTab}
                  storesCount={stores.length}
                  tabOptions={tabOptions}
                  transactionsCount={transactions.length}
                />

            {feedbackMessage ? (
              <div
                className={cn(
                  'rounded-2xl border px-4 py-3 text-sm font-medium',
                  feedbackMessage.tone === 'success' &&
                    'border-primary/20 bg-primary/10 text-primary',
                  feedbackMessage.tone === 'error' &&
                    'border-destructive/20 bg-destructive/10 text-destructive',
                  feedbackMessage.tone === 'info' &&
                    'border-border/70 bg-muted/60 text-foreground',
                )}
              >
                {feedbackMessage.message}
              </div>
            ) : null}

            {isLoadingWorkspace && selectedStoreId ? (
              <Card>
                <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
                  <RefreshCcw className="size-4 animate-spin" />
                  Memuat data workspace untuk store terpilih…
                </CardContent>
              </Card>
            ) : null}

                {!selectedStoreId && !isLoadingStores && activeTab !== 'overview' && activeTab !== 'profile' ? (
                  <Card>
                    <CardContent className="grid gap-3 p-6">
                      <Badge variant="secondary" className="w-fit">
                        Belum ada store aktif
                      </Badge>
                      <h3 className="text-xl font-semibold tracking-[-0.03em] text-foreground">
                        Buat atau pilih store untuk mulai bekerja.
                      </h3>
                      <p className="text-sm leading-6 text-muted-foreground">
                        Setelah store dipilih, dashboard akan menampilkan token, transaksi, audit trail, dan webhook relay miliknya.
                      </p>
                    </CardContent>
                  </Card>
                ) : null}

            {!selectedStoreId && !isLoadingStores && activeTab === 'overview' ? (
              <section className="dashboard-section-grid">
                <Card className="border-dashed bg-muted/35 shadow-none">
                  <CardHeader className="p-6">
                    <CardTitle className="text-lg font-semibold text-foreground">Ruang Kerja Kosong</CardTitle>
                    <CardDescription>
                      Buat store pertama untuk mulai memakai charge API, audit trail, dan webhook relay.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-3 p-6 pt-0">
                    <Badge variant="secondary" className="w-fit">
                      Belum ada store aktif
                    </Badge>
                    <h3 className="text-xl font-semibold tracking-[-0.03em] text-foreground">
                      Profil dan session tetap bisa dikelola tanpa store aktif.
                    </h3>
                    <p className="text-sm leading-6 text-muted-foreground">
                      Setelah store dibuat, tab lain akan menampilkan token, transaksi, audit trail, dan webhook relay miliknya.
                    </p>
                  </CardContent>
                </Card>

                <ProfileSessionPanel
                  mfa={mfa}
                  onLogout={logout}
                  onReloadSession={handleReloadProfile}
                  tokens={sessionTokens}
                  user={user}
                />
              </section>
            ) : null}

            {activeTab === 'profile' ? (
              <ProfileWorkspacePanel
                isChangingPassword={isChangingPassword}
                mfa={mfa}
                onChangePassword={handleChangePassword}
                onLogout={logout}
                onReloadProfile={handleReloadProfile}
                tokens={sessionTokens}
                user={user}
              />
            ) : null}

            {selectedStoreId && !isLoadingWorkspace ? (
              <>
                {activeTab === 'overview' ? (
                  <Suspense
                    fallback={
                      <DashboardTabLoader
                        eyebrow="Memuat Store"
                        message="Panel konfigurasi store dan keamanan akun sedang dimuat terpisah."
                        title="Menyiapkan pengaturan store…"
                      />
                    }
                  >
                    <StoreOverviewPanel
                      formatDate={formatDate}
                      isChangingPassword={isChangingPassword}
                      isRotatingWebhookSecret={isRotatingWebhookSecret}
                      isSavingStore={isSavingStore}
                      isViewingWebhookSecret={isViewingWebhookSecret}
                      mfa={mfa}
                      onChangePassword={handleChangePassword}
                      onCopySecret={(secret) => void navigator.clipboard.writeText(secret)}
                      onDeactivateStore={() => void handleDeactivateStore()}
                      onLogout={logout}
                      onReloadProfile={handleReloadProfile}
                      onRevealWebhookSecret={() => void handleRevealWebhookSecret()}
                      onRotateWebhookSecret={() => void handleRotateWebhookSecret()}
                      onUpdateStore={handleUpdateStore}
                      revealedStoreSecret={revealedStoreSecret}
                      selectedStore={selectedStore}
                      sessionTokens={sessionTokens}
                      user={user}
                    />
                  </Suspense>
                ) : null}

                {activeTab === 'tokens' ? (
                  <Suspense
                    fallback={
                      <DashboardTabLoader
                        eyebrow="Memuat Token"
                        message="Daftar dan form token store sedang dimuat saat tab ini dibuka."
                        title="Menyiapkan token API…"
                      />
                    }
                  >
                    <TokensPanel
                      formatDate={formatDate}
                      isCreatingToken={isCreatingToken}
                      onCopyToken={(token) => void navigator.clipboard.writeText(token)}
                      onCreateToken={handleCreateToken}
                      onRevokeToken={(tokenId) => void handleRevokeToken(tokenId)}
                      onRotateToken={(tokenId) => void handleRotateToken(tokenId)}
                      revealedToken={revealedToken}
                      rotatingTokenId={rotatingTokenId}
                      tokens={tokens}
                    />
                  </Suspense>
                ) : null}

                {activeTab === 'transactions' ? (
                  <Suspense
                    fallback={
                      <DashboardTabLoader
                        eyebrow="Memuat Transaksi"
                        message="Tabel transaksi dan panel detail dimuat hanya saat benar-benar diperlukan."
                        title="Menyiapkan data transaksi…"
                      />
                    }
                  >
                    <TransactionsPanel
                      formatCurrency={formatCurrency}
                      formatDate={formatDate}
                      isDetailLoading={isTransactionDetailLoading}
                      isLoading={isTransactionsLoading}
                      meta={transactionMeta}
                      onClearTransaction={handleClearTransactionSelection}
                      onLoadTransaction={(transactionId) => void handleLoadTransaction(transactionId)}
                      onPageChange={handleTransactionPageChange}
                      onQueryDraftChange={setTransactionQueryDraft}
                      onResetFilters={handleResetTransactionFilters}
                      onSearch={handleTransactionSearch}
                      onStatusChange={handleTransactionStatusChange}
                      prettyJSON={prettyJSON}
                      queryDraft={transactionQueryDraft}
                      selectedTransaction={selectedTransaction}
                      statusFilter={transactionStatusFilter}
                      statusOptions={transactionStatusOptions}
                      transactions={transactions}
                    />
                  </Suspense>
                ) : null}

                {activeTab === 'audit' ? (
                  <Suspense
                    fallback={
                      <DashboardTabLoader
                        eyebrow="Memuat Audit"
                        message="Audit log dan viewer payload dipisah dari chunk awal agar tab inti tetap cepat."
                        title="Menyiapkan audit log…"
                      />
                    }
                  >
                    <AuditLogsPanel
                      auditLogs={auditLogs}
                      directionOptions={auditDirectionOptions}
                      filters={auditFiltersDraft}
                      formatDate={formatDate}
                      isLoading={isAuditLogsLoading}
                      meta={auditMeta}
                      onFilterChange={handleAuditFilterChange}
                      onPageChange={handleAuditPageChange}
                      onResetFilters={handleResetAuditFilters}
                      onSearch={handleAuditSearch}
                      onSelectAuditLog={setSelectedAuditLog}
                      prettyJSON={prettyJSON}
                      selectedAuditLog={effectiveSelectedAuditLog}
                    />
                  </Suspense>
                ) : null}

                {activeTab === 'webhooks' ? (
                  <Suspense
                    fallback={
                      <DashboardTabLoader
                        eyebrow="Memuat Webhook"
                        message="Riwayat delivery dan detail retry dimuat saat tab webhook dipilih."
                        title="Menyiapkan webhook delivery…"
                      />
                    }
                  >
                    <WebhookDeliveriesPanel
                      deliveries={deliveries}
                      formatDate={formatDate}
                      onClearDelivery={handleClearDeliverySelection}
                      isDetailLoading={isDeliveryDetailLoading}
                      isLoading={isDeliveriesLoading}
                      meta={deliveryMeta}
                      onLoadDelivery={(deliveryId) => void handleLoadDelivery(deliveryId)}
                      onPageChange={handleDeliveryPageChange}
                      onQueryDraftChange={setDeliveryQueryDraft}
                      onResetFilters={handleResetDeliveryFilters}
                      onResendDelivery={(deliveryId) => void handleResendDelivery(deliveryId)}
                      onSearch={handleDeliverySearch}
                      onStatusChange={handleDeliveryStatusChange}
                      prettyJSON={prettyJSON}
                      queryDraft={deliveryQueryDraft}
                      selectedDelivery={selectedDelivery}
                      statusFilter={deliveryStatusFilter}
                      statusOptions={deliveryStatusOptions}
                    />
                  </Suspense>
                ) : null}

                {activeTab === 'docs' ? (
                  <Suspense
                    fallback={
                      <DashboardTabLoader
                        eyebrow="Memuat Dokumentasi"
                        message="Snippet integrasi dan panduan webhook dipindah ke chunk terpisah agar workspace utama tetap ringan."
                        title="Menyiapkan dokumentasi API…"
                      />
                    }
                  >
                    <DeveloperDocsPanel />
                  </Suspense>
                ) : null}
              </>
            ) : null}
              </section>
            </div>
          </main>
        </SidebarInset>
      </SidebarProvider>
    </TooltipProvider>
  )
}

export function DashboardPage() {
  return (
    <QueryClientProvider client={queryClient}>
      <DashboardWorkspace />
    </QueryClientProvider>
  )
}
