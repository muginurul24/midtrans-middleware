import type { DashboardTab } from '@/features/dashboard/types'

type DashboardDetailRoute = {
  transactionId?: string | null
  deliveryId?: string | null
}

type DashboardRouteStateInput = {
  pathname: string
  routeDeliveryId?: string | null
  routeStoreId?: string | null
  routeTransactionId?: string | null
  searchParams: URLSearchParams
}

export const dashboardTabOptions: Array<{ value: DashboardTab; label: string }> = [
  { value: 'directory', label: 'Direktori Store' },
  { value: 'create', label: 'Buat Store' },
  { value: 'overview', label: 'Pengaturan Store' },
  { value: 'tokens', label: 'Token API' },
  { value: 'transactions', label: 'Transaksi' },
  { value: 'audit', label: 'Audit Log' },
  { value: 'webhooks', label: 'Webhook' },
  { value: 'docs', label: 'Dokumentasi API' },
  { value: 'profile', label: 'Profil & Sesi' },
]

export function isDashboardTab(value: string | null): value is DashboardTab {
  return dashboardTabOptions.some((item) => item.value === value)
}

export function isStoreScopedDashboardTab(tab: DashboardTab) {
  return tab !== 'directory' && tab !== 'create' && tab !== 'profile'
}

export function normalizeStoreSelectionTab(tab: DashboardTab): DashboardTab {
  return isStoreScopedDashboardTab(tab) ? tab : 'overview'
}

export function buildDashboardDestination(
  storeId: string | null,
  tab: DashboardTab,
  detail: DashboardDetailRoute = {},
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

  if (tab === 'directory') {
    return {
      pathname: '/app/stores',
      search: '',
    }
  }

  if (tab === 'create') {
    return {
      pathname: '/app/stores/new',
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

  const nextSearchParams = new URLSearchParams()
  if (normalizedStoreId) {
    nextSearchParams.set('store', normalizedStoreId)
  }
  nextSearchParams.set('tab', tab)

  const search = nextSearchParams.toString()
  return {
    pathname: '/app',
    search: search ? `?${search}` : '',
  }
}

export function resolveDashboardRouteState({
  pathname,
  routeDeliveryId,
  routeStoreId,
  routeTransactionId,
  searchParams,
}: DashboardRouteStateInput) {
  const routeTab = resolveRouteTab(pathname, routeStoreId, routeTransactionId, routeDeliveryId)
  const activeTab = routeTab ?? (isDashboardTab(searchParams.get('tab')) ? (searchParams.get('tab') as DashboardTab) : 'overview')

  return {
    activeTab,
    selectedDeliveryId: routeDeliveryId ?? searchParams.get('delivery'),
    selectedStoreId: isStoreScopedDashboardTab(activeTab) ? routeStoreId ?? searchParams.get('store') : null,
    selectedTransactionId: routeTransactionId ?? searchParams.get('transaction'),
  }
}

export function describeDashboardContext(
  activeTab: DashboardTab,
  currentStoreName: string,
  userName: string | null | undefined,
  selectedStoreId: string | null,
) {
  const workspaceTitle =
    activeTab === 'profile'
      ? 'Profil & Sesi'
      : activeTab === 'directory'
        ? 'Direktori Store'
        : activeTab === 'create'
          ? 'Buat Store'
          : currentStoreName

  const headerTitle =
    activeTab === 'profile'
      ? (userName ?? 'Profil Akun')
      : activeTab === 'directory'
        ? 'Direktori Store'
        : activeTab === 'create'
          ? 'Buat Store'
          : currentStoreName

  const headerStatusLabel =
    activeTab === 'profile'
      ? 'Akun aktif'
      : activeTab === 'directory'
        ? 'Semua tenant'
        : activeTab === 'create'
          ? 'Form tenant'
          : selectedStoreId
            ? 'Store aktif'
            : 'Pilih store'

  const headerStatusVariant: 'secondary' | 'success' =
    activeTab === 'profile' || activeTab === 'directory' || activeTab === 'create' ? 'secondary' : selectedStoreId ? 'success' : 'secondary'

  const activeTabLabel = dashboardTabOptions.find((item) => item.value === activeTab)?.label ?? 'Dashboard'

  const pageTitle =
    activeTab === 'profile'
      ? 'Profil & Sesi | PayGate'
      : activeTab === 'directory'
        ? 'Direktori Store | PayGate'
        : activeTab === 'create'
          ? 'Buat Store | PayGate'
          : activeTab === 'overview' && !selectedStoreId
            ? 'Dashboard | PayGate'
            : selectedStoreId
              ? `${currentStoreName} · ${activeTabLabel} | PayGate`
              : `Dashboard · ${activeTabLabel} | PayGate`

  return {
    activeTabLabel,
    headerStatusLabel,
    headerStatusVariant,
    headerTitle,
    pageTitle,
    workspaceTitle,
  }
}

function resolveRouteTab(
  pathname: string,
  routeStoreId?: string | null,
  routeTransactionId?: string | null,
  routeDeliveryId?: string | null,
): DashboardTab | null {
  if (pathname === '/app/profile') {
    return 'profile'
  }

  if (pathname === '/app/stores') {
    return 'directory'
  }

  if (pathname === '/app/stores/new') {
    return 'create'
  }

  if (routeTransactionId || pathname.endsWith('/transactions')) {
    return 'transactions'
  }

  if (routeDeliveryId || pathname.endsWith('/webhooks')) {
    return 'webhooks'
  }

  if (!routeStoreId) {
    return null
  }

  if (pathname.endsWith('/tokens')) {
    return 'tokens'
  }

  if (pathname.endsWith('/audit')) {
    return 'audit'
  }

  if (pathname.endsWith('/docs')) {
    return 'docs'
  }

  return 'overview'
}
