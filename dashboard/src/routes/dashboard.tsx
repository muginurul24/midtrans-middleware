import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Copy, LogOut, RefreshCcw } from 'lucide-react'

import { useSession, type APIError, type User } from '@/app/use-session'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

type StoreStatus = 'active' | 'inactive'
type DashboardTab = 'overview' | 'tokens' | 'transactions' | 'audit' | 'webhooks' | 'docs'

type Store = {
  id: string
  user_id: string
  name: string
  slug: string
  domain?: string | null
  default_callback_url?: string | null
  status: StoreStatus
  created_at: string
  updated_at: string
  webhook_secret?: string
}

type StoreToken = {
  id: string
  store_id: string
  name: string
  token_prefix: string
  scopes: string[]
  last_used_at?: string | null
  expires_at?: string | null
  revoked_at?: string | null
  created_at: string
  token?: string
}

type DashboardTransaction = {
  id: string
  order_id: string
  platform_order_id: string
  midtrans_transaction_id?: string | null
  payment_type: string
  gross_amount: number
  currency: string
  status: string
  fraud_status?: string | null
  callback_url?: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
  paid_at?: string | null
}

type AuditLog = {
  id: string
  request_id: string
  actor_type: string
  actor_id?: string | null
  direction: string
  method?: string | null
  url?: string | null
  status_code?: number | null
  request_body: Record<string, unknown>
  response_body: Record<string, unknown>
  error_message?: string | null
  duration_ms?: number | null
  created_at: string
}

type WebhookDelivery = {
  id: string
  store_id: string
  transaction_id?: string | null
  midtrans_webhook_id?: string | null
  order_id?: string | null
  callback_url: string
  event_type: string
  status: string
  attempt_count: number
  next_attempt_at?: string | null
  delivered_at?: string | null
  failed_at?: string | null
  created_at: string
  updated_at: string
}

type WebhookDeliveryAttempt = {
  id: string
  attempt_number: number
  request_headers: Record<string, unknown>
  request_body: Record<string, unknown>
  response_status?: number | null
  response_body?: string | null
  error_message?: string | null
  duration_ms?: number | null
  attempted_at: string
}

type WebhookDeliveryDetail = {
  delivery: WebhookDelivery & { payload: Record<string, unknown> }
  attempts: WebhookDeliveryAttempt[]
}

type FlashTone = 'success' | 'error' | 'info'

type FlashMessage = {
  tone: FlashTone
  message: string
}

type StoreCreateForm = {
  name: string
  slug: string
  domain: string
  default_callback_url: string
}

type StoreSettingsForm = {
  name: string
  domain: string
  default_callback_url: string
  status: StoreStatus
}

type PasswordForm = {
  current_password: string
  new_password: string
}

const tabOptions: Array<{ value: DashboardTab; label: string }> = [
  { value: 'overview', label: 'Store' },
  { value: 'tokens', label: 'API Tokens' },
  { value: 'transactions', label: 'Transactions' },
  { value: 'audit', label: 'Audit Logs' },
  { value: 'webhooks', label: 'Webhooks' },
  { value: 'docs', label: 'Developer Docs' },
]

const defaultCreateStoreForm: StoreCreateForm = {
  name: '',
  slug: '',
  domain: '',
  default_callback_url: '',
}

const defaultPasswordForm: PasswordForm = {
  current_password: '',
  new_password: '',
}

const statusLegend = [
  'paid/success -> sukses',
  'pending/retrying -> menunggu atau sedang dicoba ulang',
  'failed/failed_permanently -> gagal dan butuh investigasi',
  'expired/cancelled -> transaksi berhenti sebelum dibayar',
]

function isDashboardTab(value: string | null): value is DashboardTab {
  return tabOptions.some((item) => item.value === value)
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

function toSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function statusTone(status: string) {
  const normalized = status.toLowerCase()
  if (normalized === 'paid' || normalized === 'success' || normalized === 'active') {
    return 'success'
  }
  if (normalized === 'retrying' || normalized === 'pending' || normalized === 'challenge') {
    return 'warning'
  }
  if (normalized === 'inactive' || normalized === 'expired' || normalized === 'cancelled') {
    return 'muted'
  }
  return 'danger'
}

function statusVariant(status: string): 'success' | 'warning' | 'secondary' | 'destructive' {
  const tone = statusTone(status)
  if (tone === 'success') {
    return 'success'
  }
  if (tone === 'warning') {
    return 'warning'
  }
  if (tone === 'muted') {
    return 'secondary'
  }
  return 'destructive'
}

function userInitials(user: User | null) {
  const source = user?.name?.trim() || user?.email?.trim() || 'PG'
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }
  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}

function prettyJSON(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2)
}

function extractErrorMessage(error: unknown) {
  const apiError = error as APIError
  return apiError?.message ?? 'Terjadi error yang tidak diketahui.'
}

function DashboardHeader({ user, onLogout }: { user: User | null; onLogout: () => Promise<void> }) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await onLogout()
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <header className="flex flex-col gap-4 rounded-[2rem] border border-stone-200/70 bg-white/85 p-5 shadow-[0_20px_60px_rgba(48,34,21,0.08)] backdrop-blur dark:border-white/10 dark:bg-stone-950/70 dark:shadow-[0_20px_60px_rgba(0,0,0,0.28)] md:flex-row md:items-center md:justify-between">
      <div className="grid gap-2">
        <Badge variant="success" className="w-fit">
          Operational Dashboard
        </Badge>
        <div className="grid gap-1">
          <h1 className="text-2xl font-black tracking-[-0.05em] text-stone-950 dark:text-stone-50 md:text-3xl">
            Kontrol panel payment middleware multi-tenant.
          </h1>
          <p className="text-sm leading-6 text-stone-600 dark:text-stone-400">
            Satu workspace untuk store, token, transaksi, audit trail, dan webhook delivery.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3 rounded-2xl border border-stone-200/70 bg-stone-50/80 px-3 py-2 dark:border-white/10 dark:bg-white/5">
          <Avatar>
            <AvatarFallback>{userInitials(user)}</AvatarFallback>
          </Avatar>
          <div className="grid gap-0.5">
            <strong className="text-sm text-stone-950 dark:text-stone-50">{user?.name}</strong>
            <span className="text-xs text-stone-500 dark:text-stone-400">{user?.email}</span>
          </div>
        </div>
        <Link className={buttonVariants({ variant: 'secondary' })} to="/mfa">
          MFA
        </Link>
        <Button onClick={() => void handleLogout()} type="button" variant="outline">
          <LogOut className="size-4" />
          {isLoggingOut ? 'Keluar…' : 'Logout'}
        </Button>
      </div>
    </header>
  )
}

export function DashboardPage() {
  const { apiFetch, logout, user } = useSession()
  const [searchParams, setSearchParams] = useSearchParams()
  const [stores, setStores] = useState<Store[]>([])
  const [selectedStore, setSelectedStore] = useState<Store | null>(null)
  const [tokens, setTokens] = useState<StoreToken[]>([])
  const [transactions, setTransactions] = useState<DashboardTransaction[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([])
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([])
  const [selectedTransaction, setSelectedTransaction] = useState<DashboardTransaction | null>(null)
  const [selectedDelivery, setSelectedDelivery] = useState<WebhookDeliveryDetail | null>(null)
  const [createStoreForm, setCreateStoreForm] = useState<StoreCreateForm>(defaultCreateStoreForm)
  const [settingsForm, setSettingsForm] = useState<StoreSettingsForm>({
    name: '',
    domain: '',
    default_callback_url: '',
    status: 'active',
  })
  const [newTokenName, setNewTokenName] = useState('')
  const [tokenScopes, setTokenScopes] = useState<string[]>(['transaction:create', 'transaction:read'])
  const [revealedStoreSecret, setRevealedStoreSecret] = useState<{ storeName: string; secret: string } | null>(null)
  const [revealedToken, setRevealedToken] = useState<StoreToken | null>(null)
  const [passwordForm, setPasswordForm] = useState<PasswordForm>(defaultPasswordForm)
  const [flash, setFlash] = useState<FlashMessage | null>(null)
  const [isLoadingStores, setIsLoadingStores] = useState(true)
  const [isLoadingWorkspace, setIsLoadingWorkspace] = useState(false)
  const [isSavingStore, setIsSavingStore] = useState(false)
  const [isCreatingStore, setIsCreatingStore] = useState(false)
  const [isCreatingToken, setIsCreatingToken] = useState(false)
  const [isChangingPassword, setIsChangingPassword] = useState(false)
  const [isViewingWebhookSecret, setIsViewingWebhookSecret] = useState(false)
  const [isRotatingWebhookSecret, setIsRotatingWebhookSecret] = useState(false)
  const [rotatingTokenId, setRotatingTokenId] = useState<string | null>(null)
  const [isTransactionDetailLoading, setIsTransactionDetailLoading] = useState(false)
  const [isDeliveryDetailLoading, setIsDeliveryDetailLoading] = useState(false)

  const selectedStoreId = searchParams.get('store')
  const activeTab = isDashboardTab(searchParams.get('tab')) ? (searchParams.get('tab') as DashboardTab) : 'overview'

  const selectedStoreSummary = useMemo(
    () => stores.find((item) => item.id === selectedStoreId) ?? null,
    [selectedStoreId, stores],
  )

  const setWorkspaceParams = useCallback((storeId: string | null, tab = activeTab) => {
    const next = new URLSearchParams(searchParams)

    if (storeId) {
      next.set('store', storeId)
    } else {
      next.delete('store')
    }

    next.set('tab', tab)
    setSearchParams(next, { replace: true })
  }, [activeTab, searchParams, setSearchParams])

  const loadStores = async (preferredStoreId?: string | null) => {
    setIsLoadingStores(true)
    try {
      const data = await apiFetch<{ stores: Store[] }>('/v1/dashboard/stores')
      const nextStores = data.stores ?? []
      setStores(nextStores)

      if (nextStores.length === 0) {
        setSelectedStore(null)
        setTokens([])
        setTransactions([])
        setAuditLogs([])
        setDeliveries([])
        setWorkspaceParams(null)
        return
      }

      const targetStoreId =
        preferredStoreId && nextStores.some((item) => item.id === preferredStoreId)
          ? preferredStoreId
          : selectedStoreId && nextStores.some((item) => item.id === selectedStoreId)
            ? selectedStoreId
            : nextStores[0].id

      if (targetStoreId !== selectedStoreId) {
        setWorkspaceParams(targetStoreId)
      }
    } catch (error) {
      setFlash({
        tone: 'error',
        message: extractErrorMessage(error),
      })
    } finally {
      setIsLoadingStores(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    const bootstrapStores = async () => {
      setIsLoadingStores(true)
      try {
        const data = await apiFetch<{ stores: Store[] }>('/v1/dashboard/stores')
        if (cancelled) {
          return
        }

        const nextStores = data.stores ?? []
        setStores(nextStores)

        if (nextStores.length === 0) {
          setSelectedStore(null)
          setTokens([])
          setTransactions([])
          setAuditLogs([])
          setDeliveries([])
          setWorkspaceParams(null)
          return
        }

        const targetStoreId =
          selectedStoreId && nextStores.some((item) => item.id === selectedStoreId)
            ? selectedStoreId
            : nextStores[0].id

        if (targetStoreId !== selectedStoreId) {
          setWorkspaceParams(targetStoreId)
        }
      } catch (error) {
        if (!cancelled) {
          setFlash({
            tone: 'error',
            message: extractErrorMessage(error),
          })
        }
      } finally {
        if (!cancelled) {
          setIsLoadingStores(false)
        }
      }
    }

    void bootstrapStores()

    return () => {
      cancelled = true
    }
  }, [apiFetch, selectedStoreId, setWorkspaceParams])

  useEffect(() => {
    if (!selectedStoreId) {
      return
    }

    let cancelled = false

    const loadWorkspace = async () => {
      setIsLoadingWorkspace(true)
      try {
        const [storeData, tokenData, transactionData, auditData, deliveryData] = await Promise.all([
          apiFetch<Store>(`/v1/dashboard/stores/${selectedStoreId}`),
          apiFetch<{ tokens: StoreToken[] }>(`/v1/dashboard/stores/${selectedStoreId}/api-tokens`),
          apiFetch<{ transactions: DashboardTransaction[] }>(
            `/v1/dashboard/stores/${selectedStoreId}/transactions?limit=30`,
          ),
          apiFetch<{ logs: AuditLog[] }>(`/v1/dashboard/stores/${selectedStoreId}/audit-logs?limit=25`),
          apiFetch<{ deliveries: WebhookDelivery[] }>(
            `/v1/dashboard/stores/${selectedStoreId}/webhook-deliveries?limit=25`,
          ),
        ])

        if (cancelled) {
          return
        }

        setRevealedStoreSecret(null)
        setRevealedToken(null)
        setSelectedStore(storeData)
        setSelectedTransaction(null)
        setSelectedDelivery(null)
        setSettingsForm({
          name: storeData.name,
          domain: storeData.domain ?? '',
          default_callback_url: storeData.default_callback_url ?? '',
          status: storeData.status,
        })
        setTokens(tokenData.tokens ?? [])
        setTransactions(transactionData.transactions ?? [])
        setAuditLogs(auditData.logs ?? [])
        setDeliveries(deliveryData.deliveries ?? [])
      } catch (error) {
        if (!cancelled) {
          setFlash({
            tone: 'error',
            message: extractErrorMessage(error),
          })
        }
      } finally {
        if (!cancelled) {
          setIsLoadingWorkspace(false)
        }
      }
    }

    void loadWorkspace()

    return () => {
      cancelled = true
    }
  }, [apiFetch, selectedStoreId])

  const handleCreateStore = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsCreatingStore(true)
    setFlash(null)

    try {
      const created = await apiFetch<Store>(`/v1/dashboard/stores`, {
        method: 'POST',
        body: JSON.stringify(createStoreForm),
      })

      setRevealedStoreSecret(
        created.webhook_secret
          ? {
              storeName: created.name,
              secret: created.webhook_secret,
            }
          : null,
      )
      setCreateStoreForm(defaultCreateStoreForm)
      setFlash({
        tone: 'success',
        message: `Store ${created.name} berhasil dibuat.`,
      })
      await loadStores(created.id)
    } catch (error) {
      setFlash({
        tone: 'error',
        message: extractErrorMessage(error),
      })
    } finally {
      setIsCreatingStore(false)
    }
  }

  const handleUpdateStore = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedStoreId) {
      return
    }

    setIsSavingStore(true)
    setFlash(null)

    try {
      const updated = await apiFetch<Store>(`/v1/dashboard/stores/${selectedStoreId}`, {
        method: 'PATCH',
        body: JSON.stringify(settingsForm),
      })

      setSelectedStore(updated)
      setStores((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      setFlash({
        tone: 'success',
        message: `Store ${updated.name} berhasil diperbarui.`,
      })
    } catch (error) {
      setFlash({
        tone: 'error',
        message: extractErrorMessage(error),
      })
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
      await loadStores(selectedStoreId)
    } catch (error) {
      setFlash({
        tone: 'error',
        message: extractErrorMessage(error),
      })
    }
  }

  const handleCreateToken = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedStoreId) {
      return
    }

    setIsCreatingToken(true)
    setFlash(null)

    try {
      const created = await apiFetch<StoreToken>(`/v1/dashboard/stores/${selectedStoreId}/api-tokens`, {
        method: 'POST',
        body: JSON.stringify({
          name: newTokenName,
          scopes: tokenScopes,
        }),
      })

      setRevealedToken(created)
      setNewTokenName('')
      setFlash({
        tone: 'success',
        message: `Token ${created.name} berhasil dibuat.`,
      })
      const data = await apiFetch<{ tokens: StoreToken[] }>(`/v1/dashboard/stores/${selectedStoreId}/api-tokens`)
      setTokens(data.tokens ?? [])
    } catch (error) {
      setFlash({
        tone: 'error',
        message: extractErrorMessage(error),
      })
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
      setTokens((current) =>
        current.map((item) => (item.id === tokenId ? { ...item, revoked_at: new Date().toISOString() } : item)),
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
      const data = await apiFetch<{ tokens: StoreToken[] }>(`/v1/dashboard/stores/${selectedStoreId}/api-tokens`)
      setTokens(data.tokens ?? [])
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
      await loadStores(selectedStoreId)
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

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsChangingPassword(true)
    setFlash(null)

    try {
      await apiFetch<void>('/v1/dashboard/auth/change-password', {
        method: 'POST',
        body: JSON.stringify(passwordForm),
      })
      setPasswordForm(defaultPasswordForm)
      setFlash({
        tone: 'success',
        message: 'Password dashboard berhasil diubah.',
      })
    } catch (error) {
      setFlash({
        tone: 'error',
        message: extractErrorMessage(error),
      })
    } finally {
      setIsChangingPassword(false)
    }
  }

  const handleLoadTransaction = async (transactionId: string) => {
    if (!selectedStoreId) {
      return
    }

    setIsTransactionDetailLoading(true)
    try {
      const detail = await apiFetch<DashboardTransaction>(
        `/v1/dashboard/stores/${selectedStoreId}/transactions/${transactionId}`,
      )
      setSelectedTransaction(detail)
    } catch (error) {
      setFlash({
        tone: 'error',
        message: extractErrorMessage(error),
      })
    } finally {
      setIsTransactionDetailLoading(false)
    }
  }

  const handleLoadDelivery = async (deliveryId: string) => {
    setIsDeliveryDetailLoading(true)
    try {
      const detail = await apiFetch<WebhookDeliveryDetail>(`/v1/dashboard/webhook-deliveries/${deliveryId}`)
      setSelectedDelivery(detail)
    } catch (error) {
      setFlash({
        tone: 'error',
        message: extractErrorMessage(error),
      })
    } finally {
      setIsDeliveryDetailLoading(false)
    }
  }

  const handleResendDelivery = async (deliveryId: string) => {
    setFlash(null)
    try {
      const updated = await apiFetch<WebhookDelivery>(`/v1/dashboard/webhook-deliveries/${deliveryId}/resend`, {
        method: 'POST',
      })

      setDeliveries((current) => current.map((item) => (item.id === updated.id ? updated : item)))
      setFlash({
        tone: 'success',
        message: 'Webhook delivery berhasil di-enqueue ulang.',
      })

      const detail = await apiFetch<WebhookDeliveryDetail>(`/v1/dashboard/webhook-deliveries/${deliveryId}`)
      setSelectedDelivery(detail)
    } catch (error) {
      setFlash({
        tone: 'error',
        message: extractErrorMessage(error),
      })
    }
  }

  const currentStoreName = selectedStore?.name ?? selectedStoreSummary?.name ?? 'Pilih store'

  return (
    <main className="mx-auto min-h-screen w-full max-w-7xl px-4 py-6 md:px-6 lg:py-8">
      <div className="grid gap-6">
        <DashboardHeader user={user} onLogout={logout} />

        <div className="grid gap-6 xl:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="xl:sticky xl:top-6 xl:self-start">
            <Card className="overflow-hidden">
              <CardHeader className="pb-4">
                <Badge variant="secondary" className="w-fit">
                  Store Directory
                </Badge>
                <CardTitle>Store yang Anda kelola</CardTitle>
                <CardDescription>Buat tenant baru lalu pilih store yang ingin Anda audit atau operasikan.</CardDescription>
              </CardHeader>

              <CardContent className="grid gap-6">
                <form className="grid gap-4" onSubmit={handleCreateStore}>
                  <div className="grid gap-2">
                    <Label htmlFor="create-store-name">Nama store</Label>
                    <Input
                      id="create-store-name"
                      value={createStoreForm.name}
                      onChange={(event) =>
                        setCreateStoreForm((current) => ({
                          ...current,
                          name: event.target.value,
                          slug: current.slug ? current.slug : toSlug(event.target.value),
                        }))
                      }
                      placeholder="Mis. Toko Kopi Nusantara"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="create-store-slug">Slug</Label>
                    <Input
                      id="create-store-slug"
                      value={createStoreForm.slug}
                      onChange={(event) =>
                        setCreateStoreForm((current) => ({
                          ...current,
                          slug: toSlug(event.target.value),
                        }))
                      }
                      placeholder="toko-kopi-nusantara"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="create-store-domain">Domain</Label>
                    <Input
                      id="create-store-domain"
                      value={createStoreForm.domain}
                      onChange={(event) =>
                        setCreateStoreForm((current) => ({
                          ...current,
                          domain: event.target.value,
                        }))
                      }
                      placeholder="tokokopi.com"
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="create-store-callback">Default callback URL</Label>
                    <Input
                      id="create-store-callback"
                      value={createStoreForm.default_callback_url}
                      onChange={(event) =>
                        setCreateStoreForm((current) => ({
                          ...current,
                          default_callback_url: event.target.value,
                        }))
                      }
                      placeholder="https://tokokopi.com/api/payment/callback"
                    />
                  </div>

                  <Button className="h-11 rounded-2xl" disabled={isCreatingStore} type="submit">
                    {isCreatingStore ? 'Membuat store…' : 'Buat Store'}
                  </Button>
                </form>

                {revealedStoreSecret ? (
                  <div className="grid gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-4 dark:border-emerald-400/20 dark:bg-emerald-400/10">
                    <Badge variant="success" className="w-fit">
                      Webhook Secret Baru
                    </Badge>
                    <strong className="text-sm text-stone-950 dark:text-stone-50">{revealedStoreSecret.storeName}</strong>
                    <code className="overflow-x-auto rounded-xl bg-stone-950 px-3 py-2 text-xs text-emerald-200 dark:bg-stone-900">
                      {revealedStoreSecret.secret}
                    </code>
                    <Button
                      className="w-fit"
                      onClick={() => void navigator.clipboard.writeText(revealedStoreSecret.secret)}
                      size="sm"
                      type="button"
                      variant="secondary"
                    >
                      <Copy className="size-4" />
                      Copy secret
                    </Button>
                  </div>
                ) : null}

                <Separator />

                <div className="grid gap-3">
                  {isLoadingStores ? <p className="text-sm text-stone-500 dark:text-stone-400">Memuat daftar store…</p> : null}
                  {!isLoadingStores && stores.length === 0 ? (
                    <p className="text-sm leading-6 text-stone-500 dark:text-stone-400">
                      Belum ada store. Buat store pertama dari form di atas.
                    </p>
                  ) : null}
                  {stores.map((store) => (
                    <button
                      className={cn(
                        'grid gap-2 rounded-2xl border px-4 py-3 text-left transition-colors',
                        store.id === selectedStoreId
                          ? 'border-emerald-500/40 bg-emerald-500/8 shadow-sm dark:border-emerald-400/30 dark:bg-emerald-400/10'
                          : 'border-stone-200/70 bg-stone-50/70 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:hover:bg-white/10',
                      )}
                      key={store.id}
                      onClick={() => setWorkspaceParams(store.id)}
                      type="button"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="grid gap-1">
                          <strong className="text-sm text-stone-950 dark:text-stone-50">{store.name}</strong>
                          <span className="text-xs text-stone-500 dark:text-stone-400">{store.slug}</span>
                        </div>
                        <Badge variant={statusVariant(store.status)}>{store.status}</Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </aside>

          <section className="grid gap-6">
            <Card className="overflow-hidden">
              <CardHeader className="gap-4">
                <div className="grid gap-2">
                  <Badge variant="secondary" className="w-fit">
                    Workspace
                  </Badge>
                  <CardTitle className="text-3xl">{currentStoreName}</CardTitle>
                  <CardDescription>
                    Kelola konfigurasi store, token, transaksi, audit, dan webhook relay dari satu tempat.
                  </CardDescription>
                </div>

                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-stone-200/70 bg-stone-50/70 p-4 dark:border-white/10 dark:bg-white/5">
                    <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-stone-500 dark:text-stone-400">
                      Stores
                    </span>
                    <strong className="mt-2 block text-3xl font-black tracking-[-0.05em] text-stone-950 dark:text-stone-50">
                      {stores.length}
                    </strong>
                    <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">Total tenant milik akun ini.</p>
                  </div>
                  <div className="rounded-2xl border border-stone-200/70 bg-stone-50/70 p-4 dark:border-white/10 dark:bg-white/5">
                    <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-stone-500 dark:text-stone-400">
                      Active Tokens
                    </span>
                    <strong className="mt-2 block text-3xl font-black tracking-[-0.05em] text-stone-950 dark:text-stone-50">
                      {tokens.filter((item) => !item.revoked_at).length}
                    </strong>
                    <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
                      Token yang masih dapat dipakai oleh backend store.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-stone-200/70 bg-stone-50/70 p-4 dark:border-white/10 dark:bg-white/5">
                    <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-stone-500 dark:text-stone-400">
                      Transactions
                    </span>
                    <strong className="mt-2 block text-3xl font-black tracking-[-0.05em] text-stone-950 dark:text-stone-50">
                      {transactions.length}
                    </strong>
                    <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
                      Snapshot transaksi terakhir untuk store yang dipilih.
                    </p>
                  </div>
                  <div className="rounded-2xl border border-stone-200/70 bg-stone-50/70 p-4 dark:border-white/10 dark:bg-white/5">
                    <span className="block text-xs font-semibold uppercase tracking-[0.16em] text-stone-500 dark:text-stone-400">
                      Webhook Deliveries
                    </span>
                    <strong className="mt-2 block text-3xl font-black tracking-[-0.05em] text-stone-950 dark:text-stone-50">
                      {deliveries.length}
                    </strong>
                    <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
                      Riwayat delivery callback dan retry attempt.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {tabOptions.map((item) => (
                    <button
                      className={cn(
                        buttonVariants({ variant: activeTab === item.value ? 'default' : 'secondary', size: 'sm' }),
                        'rounded-full',
                      )}
                      key={item.value}
                      onClick={() => setWorkspaceParams(selectedStoreId, item.value)}
                      type="button"
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </CardHeader>
            </Card>

            {flash ? (
              <div
                className={cn(
                  'rounded-2xl border px-4 py-3 text-sm font-medium',
                  flash.tone === 'success' &&
                    'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:border-emerald-400/20 dark:text-emerald-300',
                  flash.tone === 'error' &&
                    'border-red-500/20 bg-red-500/10 text-red-700 dark:border-red-400/20 dark:text-red-300',
                  flash.tone === 'info' &&
                    'border-stone-300/70 bg-stone-100/80 text-stone-700 dark:border-white/10 dark:bg-white/5 dark:text-stone-200',
                )}
              >
                {flash.message}
              </div>
            ) : null}

            {isLoadingWorkspace && selectedStoreId ? (
              <Card>
                <CardContent className="flex items-center gap-3 p-6 text-sm text-stone-500 dark:text-stone-400">
                  <RefreshCcw className="size-4 animate-spin" />
                  Memuat data workspace untuk store terpilih…
                </CardContent>
              </Card>
            ) : null}

            {!selectedStoreId && !isLoadingStores ? (
              <Card>
                <CardContent className="grid gap-3 p-6">
                  <Badge variant="secondary" className="w-fit">
                    No Store Selected
                  </Badge>
                  <h3 className="text-xl font-semibold tracking-[-0.03em] text-stone-950 dark:text-stone-50">
                    Buat atau pilih store untuk mulai bekerja.
                  </h3>
                  <p className="text-sm leading-6 text-stone-600 dark:text-stone-400">
                    Setelah store dipilih, dashboard akan menampilkan token, transaksi, audit trail, dan webhook relay miliknya.
                  </p>
                </CardContent>
              </Card>
            ) : null}

            {selectedStoreId && !isLoadingWorkspace ? (
              <>
                {activeTab === 'overview' ? (
                  <section className="dashboard-section-grid">
                    <article className="dashboard-panel">
                      <div className="dashboard-panel__header">
                        <span className="dashboard-eyebrow">Store Settings</span>
                        <h3>Konfigurasi inti store</h3>
                      </div>

                      <form className="dashboard-form" onSubmit={handleUpdateStore}>
                        <label>
                          <span>Nama</span>
                          <input
                            value={settingsForm.name}
                            onChange={(event) => setSettingsForm((current) => ({ ...current, name: event.target.value }))}
                            required
                          />
                        </label>
                        <label>
                          <span>Domain</span>
                          <input
                            value={settingsForm.domain}
                            onChange={(event) => setSettingsForm((current) => ({ ...current, domain: event.target.value }))}
                            placeholder="contoh.com"
                          />
                        </label>
                        <label>
                          <span>Default callback URL</span>
                          <input
                            value={settingsForm.default_callback_url}
                            onChange={(event) =>
                              setSettingsForm((current) => ({ ...current, default_callback_url: event.target.value }))
                            }
                            placeholder="https://domain.com/api/callback"
                          />
                        </label>
                        <label>
                          <span>Status</span>
                          <select
                            value={settingsForm.status}
                            onChange={(event) =>
                              setSettingsForm((current) => ({
                                ...current,
                                status: event.target.value as StoreStatus,
                              }))
                            }
                          >
                            <option value="active">active</option>
                            <option value="inactive">inactive</option>
                          </select>
                        </label>

                        <div className="dashboard-form__actions">
                          <Button className="rounded-2xl" disabled={isSavingStore} type="submit">
                            {isSavingStore ? 'Menyimpan…' : 'Simpan Perubahan'}
                          </Button>
                          <Button onClick={handleDeactivateStore} type="button" variant="destructive">
                            Nonaktifkan Store
                          </Button>
                        </div>
                      </form>
                    </article>

                    <article className="dashboard-panel">
                      <div className="dashboard-panel__header">
                        <span className="dashboard-eyebrow">Operational Notes</span>
                        <h3>Ringkasan store</h3>
                      </div>

                      <dl className="dashboard-definition-list">
                        <div>
                          <dt>Store ID</dt>
                          <dd>{selectedStore?.id}</dd>
                        </div>
                        <div>
                          <dt>Slug</dt>
                          <dd>{selectedStore?.slug}</dd>
                        </div>
                        <div>
                          <dt>Domain</dt>
                          <dd>{selectedStore?.domain || '—'}</dd>
                        </div>
                        <div>
                          <dt>Callback URL</dt>
                          <dd>{selectedStore?.default_callback_url || '—'}</dd>
                        </div>
                        <div>
                          <dt>Created</dt>
                          <dd>{formatDate(selectedStore?.created_at)}</dd>
                        </div>
                        <div>
                          <dt>Updated</dt>
                          <dd>{formatDate(selectedStore?.updated_at)}</dd>
                        </div>
                      </dl>

                      <div className="dashboard-note-card">
                        <strong>Checklist integrasi</strong>
                        <ul>
                          <li>Backend store menggunakan `Authorization: Bearer sk_test_xxx`.</li>
                          <li>Set `Idempotency-Key` unik untuk setiap charge request.</li>
                          <li>Pastikan callback URL store bisa menerima POST JSON dari worker.</li>
                        </ul>
                      </div>

                      <div className="dashboard-form__actions">
                        <Button disabled={isViewingWebhookSecret} onClick={() => void handleRevealWebhookSecret()} type="button" variant="secondary">
                          {isViewingWebhookSecret ? 'Membuka secret…' : 'Lihat Webhook Secret'}
                        </Button>
                        <Button disabled={isRotatingWebhookSecret} onClick={() => void handleRotateWebhookSecret()} type="button" variant="outline">
                          {isRotatingWebhookSecret ? 'Merotasi secret…' : 'Rotate Webhook Secret'}
                        </Button>
                      </div>

                      {revealedStoreSecret ? (
                        <div className="dashboard-reveal-card">
                          <span className="dashboard-reveal-card__eyebrow">Webhook Secret</span>
                          <strong>{revealedStoreSecret.storeName}</strong>
                          <code>{revealedStoreSecret.secret}</code>
                          <Button
                            onClick={() => void navigator.clipboard.writeText(revealedStoreSecret.secret)}
                            size="sm"
                            type="button"
                            variant="secondary"
                          >
                            <Copy className="size-4" />
                            Copy secret
                          </Button>
                        </div>
                      ) : null}
                    </article>

                    <article className="dashboard-panel">
                      <div className="dashboard-panel__header">
                        <span className="dashboard-eyebrow">Security</span>
                        <h3>Ganti password dashboard</h3>
                      </div>

                      <form className="dashboard-form" onSubmit={handleChangePassword}>
                        <label>
                          <span>Password saat ini</span>
                          <input
                            type="password"
                            value={passwordForm.current_password}
                            onChange={(event) =>
                              setPasswordForm((current) => ({
                                ...current,
                                current_password: event.target.value,
                              }))
                            }
                            required
                          />
                        </label>
                        <label>
                          <span>Password baru</span>
                          <input
                            type="password"
                            value={passwordForm.new_password}
                            onChange={(event) =>
                              setPasswordForm((current) => ({
                                ...current,
                                new_password: event.target.value,
                              }))
                            }
                            minLength={8}
                            required
                          />
                        </label>

                        <div className="dashboard-note-card">
                          <strong>Catatan</strong>
                          <ul>
                            <li>Gunakan password baru minimal 8 karakter.</li>
                            <li>Simpan password di password manager, bukan di catatan plain text.</li>
                          </ul>
                        </div>

                        <Button className="rounded-2xl" disabled={isChangingPassword} type="submit">
                          {isChangingPassword ? 'Mengubah password…' : 'Ganti Password'}
                        </Button>
                      </form>
                    </article>
                  </section>
                ) : null}

                {activeTab === 'tokens' ? (
                  <section className="dashboard-section-grid">
                    <article className="dashboard-panel">
                      <div className="dashboard-panel__header">
                        <span className="dashboard-eyebrow">Create Token</span>
                        <h3>Buat secret token baru</h3>
                      </div>

                      <form className="dashboard-form" onSubmit={handleCreateToken}>
                        <label>
                          <span>Nama token</span>
                          <input
                            value={newTokenName}
                            onChange={(event) => setNewTokenName(event.target.value)}
                            placeholder="production-backend"
                            required
                          />
                        </label>

                        <fieldset className="dashboard-checkbox-group">
                          <legend>Scopes</legend>
                          {['transaction:create', 'transaction:read'].map((scope) => {
                            const checked = tokenScopes.includes(scope)
                            return (
                              <label key={scope}>
                                <input
                                  checked={checked}
                                  onChange={(event) =>
                                    setTokenScopes((current) =>
                                      event.target.checked
                                        ? [...current, scope]
                                        : current.filter((item) => item !== scope),
                                    )
                                  }
                                  type="checkbox"
                                />
                                <span>{scope}</span>
                              </label>
                            )
                          })}
                        </fieldset>

                        <Button className="rounded-2xl" disabled={isCreatingToken} type="submit">
                          {isCreatingToken ? 'Membuat token…' : 'Generate Token'}
                        </Button>
                      </form>

                      {revealedToken?.token ? (
                        <div className="dashboard-reveal-card">
                          <span className="dashboard-reveal-card__eyebrow">Tampilkan Sekali</span>
                          <strong>{revealedToken.name}</strong>
                          <code>{revealedToken.token}</code>
                          <Button
                            onClick={() => void navigator.clipboard.writeText(revealedToken.token ?? '')}
                            size="sm"
                            type="button"
                            variant="secondary"
                          >
                            <Copy className="size-4" />
                            Copy token
                          </Button>
                        </div>
                      ) : null}
                    </article>

                    <article className="dashboard-panel">
                      <div className="dashboard-panel__header">
                        <span className="dashboard-eyebrow">Token List</span>
                        <h3>Secret token store</h3>
                      </div>

                      <div className="dashboard-table">
                        <div className="dashboard-table__head">
                          <span>Name</span>
                          <span>Prefix</span>
                          <span>Scopes</span>
                          <span>Last Used</span>
                          <span>Status</span>
                          <span />
                        </div>
                        {tokens.map((token) => (
                          <div className="dashboard-table__row" key={token.id}>
                            <span>{token.name}</span>
                            <code>{token.token_prefix}</code>
                            <span>{token.scopes.join(', ')}</span>
                            <span>{formatDate(token.last_used_at)}</span>
                            <Badge variant={token.revoked_at ? 'destructive' : 'success'}>
                              {token.revoked_at ? 'revoked' : 'active'}
                            </Badge>
                            <div className="flex flex-wrap justify-end gap-2">
                              <Button
                                disabled={Boolean(token.revoked_at) || rotatingTokenId === token.id}
                                onClick={() => void handleRotateToken(token.id)}
                                size="sm"
                                type="button"
                                variant="outline"
                              >
                                {rotatingTokenId === token.id ? 'Rotating…' : 'Rotate'}
                              </Button>
                              <Button
                                disabled={Boolean(token.revoked_at)}
                                onClick={() => void handleRevokeToken(token.id)}
                                size="sm"
                                type="button"
                                variant="secondary"
                              >
                                Revoke
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </article>
                  </section>
                ) : null}

                {activeTab === 'transactions' ? (
                  <section className="dashboard-section-grid">
                    <article className="dashboard-panel">
                      <div className="dashboard-panel__header">
                        <span className="dashboard-eyebrow">Transactions</span>
                        <h3>Daftar transaksi terbaru</h3>
                      </div>

                      <div className="dashboard-table">
                        <div className="dashboard-table__head">
                          <span>Order</span>
                          <span>Status</span>
                          <span>Amount</span>
                          <span>Payment Type</span>
                          <span>Updated</span>
                          <span />
                        </div>
                        {transactions.map((transaction) => (
                          <div className="dashboard-table__row" key={transaction.id}>
                            <div>
                              <strong>{transaction.order_id}</strong>
                              <span>{transaction.platform_order_id}</span>
                            </div>
                            <Badge variant={statusVariant(transaction.status)}>{transaction.status}</Badge>
                            <span>{formatCurrency(transaction.gross_amount, transaction.currency)}</span>
                            <span>{transaction.payment_type}</span>
                            <span>{formatDate(transaction.updated_at)}</span>
                            <Button onClick={() => void handleLoadTransaction(transaction.id)} size="sm" type="button" variant="secondary">
                              Detail
                            </Button>
                          </div>
                        ))}
                      </div>
                    </article>

                    <article className="dashboard-panel">
                      <div className="dashboard-panel__header">
                        <span className="dashboard-eyebrow">Transaction Detail</span>
                        <h3>{selectedTransaction ? selectedTransaction.order_id : 'Pilih transaksi'}</h3>
                      </div>

                      {isTransactionDetailLoading ? (
                        <p className="text-sm text-stone-500 dark:text-stone-400">Memuat detail transaksi…</p>
                      ) : null}
                      {!selectedTransaction && !isTransactionDetailLoading ? (
                        <p className="text-sm text-stone-500 dark:text-stone-400">
                          Klik salah satu transaksi untuk melihat detailnya.
                        </p>
                      ) : null}
                      {selectedTransaction ? (
                        <>
                          <dl className="dashboard-definition-list">
                            <div>
                              <dt>Status</dt>
                              <dd>{selectedTransaction.status}</dd>
                            </div>
                            <div>
                              <dt>Midtrans Transaction ID</dt>
                              <dd>{selectedTransaction.midtrans_transaction_id || '—'}</dd>
                            </div>
                            <div>
                              <dt>Fraud Status</dt>
                              <dd>{selectedTransaction.fraud_status || '—'}</dd>
                            </div>
                            <div>
                              <dt>Callback URL</dt>
                              <dd>{selectedTransaction.callback_url || '—'}</dd>
                            </div>
                            <div>
                              <dt>Paid At</dt>
                              <dd>{formatDate(selectedTransaction.paid_at)}</dd>
                            </div>
                          </dl>

                          <pre className="dashboard-json-block">{prettyJSON(selectedTransaction.metadata)}</pre>
                        </>
                      ) : null}
                    </article>
                  </section>
                ) : null}

                {activeTab === 'audit' ? (
                  <section className="dashboard-section-grid">
                    <article className="dashboard-panel dashboard-panel--wide">
                      <div className="dashboard-panel__header">
                        <span className="dashboard-eyebrow">Audit Logs</span>
                        <h3>Request, response, webhook, dan delivery trail</h3>
                      </div>

                      <div className="dashboard-audit-list">
                        {auditLogs.map((log) => (
                          <details className="dashboard-audit-item" key={log.id}>
                            <summary>
                              <div>
                                <strong>{log.actor_type}</strong>
                                <span>{log.request_id}</span>
                              </div>
                              <div className="dashboard-audit-item__meta">
                                <span>{log.method || '—'}</span>
                                <span>{log.url || '—'}</span>
                                <span>{typeof log.status_code === 'number' ? log.status_code : '—'}</span>
                                <span>{formatDate(log.created_at)}</span>
                              </div>
                            </summary>
                            <div className="dashboard-audit-item__body">
                              <pre className="dashboard-json-block">{prettyJSON(log.request_body)}</pre>
                              <pre className="dashboard-json-block">{prettyJSON(log.response_body)}</pre>
                            </div>
                          </details>
                        ))}
                      </div>
                    </article>
                  </section>
                ) : null}

                {activeTab === 'webhooks' ? (
                  <section className="dashboard-section-grid">
                    <article className="dashboard-panel">
                      <div className="dashboard-panel__header">
                        <span className="dashboard-eyebrow">Webhook Deliveries</span>
                        <h3>Monitoring callback ke backend store</h3>
                      </div>

                      <div className="dashboard-table">
                        <div className="dashboard-table__head">
                          <span>Order</span>
                          <span>Status</span>
                          <span>Attempts</span>
                          <span>Callback URL</span>
                          <span />
                        </div>
                        {deliveries.map((delivery) => (
                          <div className="dashboard-table__row" key={delivery.id}>
                            <div>
                              <strong>{delivery.order_id || delivery.id}</strong>
                              <span>{delivery.event_type}</span>
                            </div>
                            <Badge variant={statusVariant(delivery.status)}>{delivery.status}</Badge>
                            <span>{delivery.attempt_count}</span>
                            <span>{delivery.callback_url}</span>
                            <Button onClick={() => void handleLoadDelivery(delivery.id)} size="sm" type="button" variant="secondary">
                              Detail
                            </Button>
                          </div>
                        ))}
                      </div>
                    </article>

                    <article className="dashboard-panel">
                      <div className="dashboard-panel__header">
                        <span className="dashboard-eyebrow">Delivery Detail</span>
                        <h3>{selectedDelivery?.delivery.id ?? 'Pilih delivery'}</h3>
                      </div>

                      {isDeliveryDetailLoading ? (
                        <p className="text-sm text-stone-500 dark:text-stone-400">Memuat detail delivery…</p>
                      ) : null}
                      {!selectedDelivery && !isDeliveryDetailLoading ? (
                        <p className="text-sm text-stone-500 dark:text-stone-400">
                          Klik salah satu delivery untuk melihat payload dan attempts.
                        </p>
                      ) : null}
                      {selectedDelivery ? (
                        <>
                          <dl className="dashboard-definition-list">
                            <div>
                              <dt>Status</dt>
                              <dd>{selectedDelivery.delivery.status}</dd>
                            </div>
                            <div>
                              <dt>Attempt Count</dt>
                              <dd>{selectedDelivery.delivery.attempt_count}</dd>
                            </div>
                            <div>
                              <dt>Delivered At</dt>
                              <dd>{formatDate(selectedDelivery.delivery.delivered_at)}</dd>
                            </div>
                            <div>
                              <dt>Failed At</dt>
                              <dd>{formatDate(selectedDelivery.delivery.failed_at)}</dd>
                            </div>
                          </dl>

                          {selectedDelivery.delivery.status === 'failed_permanently' ? (
                            <Button onClick={() => void handleResendDelivery(selectedDelivery.delivery.id)} type="button">
                              Resend Manual
                            </Button>
                          ) : null}

                          <pre className="dashboard-json-block">{prettyJSON(selectedDelivery.delivery.payload)}</pre>

                          <div className="dashboard-attempt-list">
                            {selectedDelivery.attempts.map((attempt) => (
                              <article className="dashboard-attempt-card" key={attempt.id}>
                                <div className="dashboard-attempt-card__header">
                                  <strong>Attempt #{attempt.attempt_number}</strong>
                                  <span>{formatDate(attempt.attempted_at)}</span>
                                </div>
                                <p>
                                  status: {attempt.response_status ?? '—'} · duration:{' '}
                                  {typeof attempt.duration_ms === 'number' ? `${attempt.duration_ms} ms` : '—'}
                                </p>
                                {attempt.error_message ? <p className="form-message is-error">{attempt.error_message}</p> : null}
                                <pre className="dashboard-json-block">{prettyJSON(attempt.request_headers)}</pre>
                              </article>
                            ))}
                          </div>
                        </>
                      ) : null}
                    </article>
                  </section>
                ) : null}

                {activeTab === 'docs' ? (
                  <section className="dashboard-section-grid">
                    <article className="dashboard-panel">
                      <div className="dashboard-panel__header">
                        <span className="dashboard-eyebrow">Developer Quickstart</span>
                        <h3>Integrasi store ke platform</h3>
                      </div>

                      <ol className="dashboard-steps">
                        <li>Buat store dari panel kiri lalu generate secret token pada tab API Tokens.</li>
                        <li>Kirim request charge ke `POST /v1/transactions/charge` dengan `Authorization: Bearer sk_test_xxx`.</li>
                        <li>Tambahkan `Idempotency-Key` unik untuk mencegah double charge.</li>
                        <li>Terima callback POST dari worker platform dan verifikasi `X-Webhook-Signature`.</li>
                      </ol>

                      <pre className="dashboard-json-block">{`POST /v1/transactions/charge
Authorization: Bearer sk_test_xxx
Idempotency-Key: INV-2026-0001
Content-Type: application/json

{
  "order_id": "INV-2026-0001",
  "amount": 150000,
  "currency": "IDR",
  "payment_type": "bank_transfer",
  "bank": "bca"
}`}</pre>
                    </article>

                    <article className="dashboard-panel">
                      <div className="dashboard-panel__header">
                        <span className="dashboard-eyebrow">Status Legend</span>
                        <h3>Status internal yang terlihat di dashboard</h3>
                      </div>

                      <ul className="dashboard-legend">
                        {statusLegend.map((item) => (
                          <li key={item}>{item}</li>
                        ))}
                      </ul>

                      <div className="dashboard-note-card">
                        <strong>Area publik</strong>
                        <p>
                          Landing page publik tetap tersedia di{' '}
                          <Link to="/">/</Link>. Store owner login di{' '}
                          <Link to="/login">/login</Link> dan register di{' '}
                          <Link to="/register">/register</Link>.
                        </p>
                      </div>
                    </article>
                  </section>
                ) : null}
              </>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  )
}
