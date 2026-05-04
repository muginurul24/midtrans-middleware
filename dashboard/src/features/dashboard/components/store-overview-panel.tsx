import { Copy } from 'lucide-react'
import { Suspense, lazy, useMemo, useState } from 'react'
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Tooltip, XAxis, Cell } from 'recharts'

import type { MfaState, TokenPair, User } from '@/app/use-session'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartStage } from '@/components/ui/chart-stage'
import { DashboardCallout } from '@/features/dashboard/components/dashboard-callout'
import { DashboardStatusBadge } from '@/features/dashboard/components/dashboard-status-badge'
import {
  buildDeliveryStatusDistribution,
  buildTransactionStatusDistribution,
  buildTransactionTimeline,
  countActiveTokens,
  formatCompactNumber,
  formatCurrencyShort,
} from '@/features/dashboard/insights'
import { ProfileSessionPanel } from '@/features/dashboard/components/profile-session-panel'
import type { DashboardTransaction, PasswordForm, Store, StoreSettingsForm, StoreToken, WebhookDelivery } from '@/features/dashboard/types'

const StoreSettingsFormPanel = lazy(() =>
  import('@/features/dashboard/components/store-overview-forms').then((module) => ({ default: module.StoreSettingsFormPanel })),
)
const StorePasswordFormPanel = lazy(() =>
  import('@/features/dashboard/components/store-overview-forms').then((module) => ({ default: module.StorePasswordFormPanel })),
)

type StoreOverviewPanelProps = {
  deliveries: WebhookDelivery[]
  formatDate: (value?: string | null) => string
  isChangingPassword: boolean
  isRotatingWebhookSecret: boolean
  isSavingStore: boolean
  isViewingWebhookSecret: boolean
  mfa: MfaState | null
  onChangePassword: (values: PasswordForm) => Promise<boolean>
  onCopySecret: (secret: string) => void
  onDeactivateStore: () => void
  onLogout: () => Promise<void>
  onReloadProfile: () => Promise<void>
  onRevealWebhookSecret: () => void
  onRotateWebhookSecret: () => void
  onUpdateStore: (values: StoreSettingsForm) => Promise<boolean>
  revealedStoreSecret: { storeName: string; secret: string } | null
  selectedStore: Store | null
  sessionTokens: TokenPair | null
  tokens: StoreToken[]
  transactions: DashboardTransaction[]
  user: User | null
}

export function StoreOverviewPanel({
  deliveries,
  formatDate,
  isChangingPassword,
  isRotatingWebhookSecret,
  isSavingStore,
  isViewingWebhookSecret,
  mfa,
  onChangePassword,
  onCopySecret,
  onDeactivateStore,
  onLogout,
  onReloadProfile,
  onRevealWebhookSecret,
  onRotateWebhookSecret,
  onUpdateStore,
  revealedStoreSecret,
  selectedStore,
  sessionTokens,
  tokens,
  transactions,
  user,
}: StoreOverviewPanelProps) {
  const [isStoreSettingsOpen, setIsStoreSettingsOpen] = useState(false)
  const [isPasswordFormOpen, setIsPasswordFormOpen] = useState(false)
  const timeline = useMemo(() => buildTransactionTimeline(transactions, 7), [transactions])
  const transactionDistribution = useMemo(() => buildTransactionStatusDistribution(transactions), [transactions])
  const deliveryDistribution = useMemo(() => buildDeliveryStatusDistribution(deliveries), [deliveries])
  const grossVolume = transactions.reduce((total, transaction) => total + transaction.gross_amount, 0)
  const paidCount = transactions.filter((transaction) => transaction.status === 'paid' || transaction.status === 'settlement').length
  const pendingCount = transactions.filter((transaction) => transaction.status === 'pending' || transaction.status === 'challenge').length
  const activeTokenCount = countActiveTokens(tokens)

  return (
    <section className="grid gap-6">
      <Card className="overflow-hidden rounded-[2.1rem] border-border/70 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--primary)_8%,transparent),transparent)] shadow-[0_30px_90px_-70px_rgba(15,23,42,0.7)]">
        <CardHeader className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-end">
          <div className="grid gap-5">
            <div className="flex flex-wrap items-center gap-3">
              <DashboardStatusBadge status={selectedStore?.status ?? 'inactive'} />
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Store operations overview</span>
            </div>
            <div className="grid gap-3">
              <CardTitle className="text-4xl font-semibold tracking-[-0.08em] text-foreground">
                {selectedStore?.name ?? 'Store tidak ditemukan'}
              </CardTitle>
              <CardDescription className="max-w-2xl text-base leading-8">
                Ringkasan ini memadukan posture store, volume charge, distribusi status, dan kesehatan webhook delivery
                dalam satu panel utama sebelum Anda turun ke token, audit, atau tabel transaksi.
              </CardDescription>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              {[
                {
                  label: 'Volume snapshot',
                  value: formatCurrencyShort(grossVolume),
                  copy: 'Total gross amount dari transaksi yang sedang tampil di workspace.',
                },
                {
                  label: 'Paid lane',
                  value: formatCompactNumber(paidCount),
                  copy: 'Charge yang sudah berhasil masuk ke status paid atau settlement.',
                },
                {
                  label: 'Pending lane',
                  value: formatCompactNumber(pendingCount),
                  copy: 'Transaksi yang masih menunggu penyelesaian, challenge, atau aksi customer.',
                },
                {
                  label: 'Token posture',
                  value: formatCompactNumber(activeTokenCount),
                  copy: 'Token backend tenant yang masih valid dan siap dipakai.',
                },
              ].map((metric) => (
                <div key={metric.label} className="rounded-[1.6rem] border border-border/70 bg-card/82 p-4 backdrop-blur">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{metric.label}</p>
                  <strong className="mt-3 block text-2xl font-semibold tracking-[-0.05em] text-foreground">{metric.value}</strong>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{metric.copy}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.85rem] border border-border/70 bg-card/82 p-4 shadow-[0_24px_80px_-62px_rgba(15,23,42,0.62)]">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Charge pulse 7 hari</p>
                <strong className="mt-2 block text-2xl font-semibold tracking-[-0.05em] text-foreground">
                  {transactions.length > 0 ? `${transactions.length} transaksi` : 'Belum ada charge'}
                </strong>
              </div>
              <DashboardStatusBadge status={selectedStore?.status ?? 'inactive'} />
            </div>
            <ChartStage className="h-56">
              <AreaChart data={timeline} responsive style={{ width: '100%', height: '100%' }}>
                  <defs>
                    <linearGradient id="overviewVolume" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-chart-2)" stopOpacity={0.42} />
                      <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="overviewPaid" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.55} />
                      <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="color-mix(in oklab, var(--border) 86%, transparent)" vertical={false} />
                  <XAxis axisLine={false} dataKey="label" tickLine={false} />
                  <Tooltip
                    formatter={(value, name) => {
                      if (name === 'volume') {
                        return [formatCurrencyShort(Number(value)), 'volume']
                      }
                      return [value, name]
                    }}
                  />
                  <Area dataKey="volume" fill="url(#overviewVolume)" stroke="var(--color-chart-2)" strokeWidth={2} type="monotone" />
                  <Area dataKey="paidCount" fill="url(#overviewPaid)" stroke="var(--color-chart-1)" strokeWidth={2.25} type="monotone" />
                  <Area dataKey="failureCount" fill="transparent" stroke="var(--color-destructive)" strokeWidth={1.8} type="monotone" />
                </AreaChart>
            </ChartStage>
          </div>
        </CardHeader>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <Card className="rounded-[1.9rem] border-border/70 bg-card/80">
          <CardHeader className="gap-3">
            <Badge variant="outline" className="w-fit">
              Risk & status map
            </Badge>
            <CardTitle className="text-2xl tracking-[-0.05em]">Charge status dan webhook delivery dalam satu grid</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-5 lg:grid-cols-2">
            <div className="grid gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Transaction status</p>
              <ChartStage className="h-52 rounded-[1.5rem] border border-border/70 bg-muted/25 p-3">
                <BarChart data={transactionDistribution} responsive style={{ width: '100%', height: '100%' }}>
                    <CartesianGrid stroke="color-mix(in oklab, var(--border) 86%, transparent)" vertical={false} />
                    <XAxis axisLine={false} dataKey="label" tickLine={false} />
                    <Tooltip />
                    <Bar barSize={36} dataKey="value" radius={[14, 14, 0, 0]}>
                      {transactionDistribution.map((entry) => (
                        <Cell fill={entry.fill} key={entry.label} />
                      ))}
                    </Bar>
                  </BarChart>
              </ChartStage>
            </div>

            <div className="grid gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Webhook delivery</p>
              <ChartStage className="h-52 rounded-[1.5rem] border border-border/70 bg-muted/25 p-3">
                <BarChart data={deliveryDistribution} responsive style={{ width: '100%', height: '100%' }}>
                    <CartesianGrid stroke="color-mix(in oklab, var(--border) 86%, transparent)" vertical={false} />
                    <XAxis axisLine={false} dataKey="label" tickLine={false} />
                    <Tooltip />
                    <Bar barSize={36} dataKey="value" radius={[14, 14, 0, 0]}>
                      {deliveryDistribution.map((entry) => (
                        <Cell fill={entry.fill} key={entry.label} />
                      ))}
                    </Bar>
                  </BarChart>
              </ChartStage>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[1.9rem] border-border/70 bg-card/80">
          <CardHeader className="gap-3">
            <Badge variant="outline" className="w-fit">
              Store identity
            </Badge>
            <CardTitle className="text-2xl tracking-[-0.05em]">Identitas tenant, callback, dan credential posture</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <dl className="dashboard-definition-list">
              <div>
                <dt>Store ID</dt>
                <dd>{selectedStore?.id ?? '—'}</dd>
              </div>
              <div>
                <dt>Slug</dt>
                <dd>{selectedStore?.slug ?? '—'}</dd>
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

            <DashboardCallout
              description={
                <ul className="dashboard-legend">
                  <li>Backend store memakai `Authorization: Bearer sk_live_xxx` atau token store aktif lain.</li>
                  <li>Set `Idempotency-Key` unik untuk setiap charge request.</li>
                  <li>Pastikan callback URL store siap menerima POST JSON dari worker relay.</li>
                </ul>
              }
              title="Checklist integrasi store"
            />

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <Button className="w-full sm:w-auto" disabled={isViewingWebhookSecret} onClick={onRevealWebhookSecret} type="button" variant="secondary">
                {isViewingWebhookSecret ? 'Membuka secret…' : 'Lihat Webhook Secret'}
              </Button>
              <Button className="w-full sm:w-auto" disabled={isRotatingWebhookSecret} onClick={onRotateWebhookSecret} type="button" variant="outline">
                {isRotatingWebhookSecret ? 'Merotasi secret…' : 'Rotasi Webhook Secret'}
              </Button>
            </div>

            {revealedStoreSecret ? (
              <div className="dashboard-reveal-card rounded-[1.6rem]">
                <span className="dashboard-reveal-card__eyebrow">Webhook Secret</span>
                <strong>{revealedStoreSecret.storeName}</strong>
                <div className="dashboard-code-surface dashboard-code-surface--solid">
                  <code className="dashboard-code-line">{revealedStoreSecret.secret}</code>
                </div>
                <Button className="w-full sm:w-auto" onClick={() => onCopySecret(revealedStoreSecret.secret)} size="sm" type="button" variant="secondary">
                  <Copy className="size-4" />
                  Salin secret
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {isStoreSettingsOpen ? (
          <Suspense fallback={<StoreOverviewFormLoader eyebrow="Memuat Form Store" title="Menyiapkan pengaturan store…" />}>
            <StoreSettingsFormPanel
              headerAction={
                <Button onClick={() => setIsStoreSettingsOpen(false)} size="sm" type="button" variant="secondary">
                  Tutup Editor
                </Button>
              }
              isSavingStore={isSavingStore}
              onUpdateStore={onUpdateStore}
              selectedStore={selectedStore}
            />
          </Suspense>
        ) : (
          <StoreOverviewActionCard
            buttonLabel="Buka Editor Store"
            description="Nama, domain, callback bawaan, dan status store baru dimuat saat benar-benar dibutuhkan."
            eyebrow="Store settings"
            onOpen={() => setIsStoreSettingsOpen(true)}
            title="Konfigurasi inti tenant tetap dekat, tapi tidak mengganggu overview"
          />
        )}

        {isPasswordFormOpen ? (
          <Suspense fallback={<StoreOverviewFormLoader eyebrow="Memuat Form Keamanan" title="Menyiapkan penggantian password…" />}>
            <StorePasswordFormPanel
              headerAction={
                <Button onClick={() => setIsPasswordFormOpen(false)} size="sm" type="button" variant="secondary">
                  Tutup Form
                </Button>
              }
              isChangingPassword={isChangingPassword}
              onChangePassword={onChangePassword}
              userEmail={user?.email ?? ''}
            />
          </Suspense>
        ) : (
          <StoreOverviewActionCard
            buttonLabel="Buka Form Password"
            description="Panel keamanan akun tetap dekat dengan overview store karena operator sering berpindah antara identitas tenant dan hygiene akun."
            eyebrow="Account security"
            onOpen={() => setIsPasswordFormOpen(true)}
            title="Password dan store posture bisa dikelola dalam shell yang sama"
          />
        )}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <DashboardCallout
          actions={
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="w-full sm:w-auto" onClick={onDeactivateStore} type="button" variant="destructive">
                Nonaktifkan Store
              </Button>
            </div>
          }
          className="rounded-[1.9rem]"
          description="Nonaktifkan store hanya jika tenant benar-benar harus berhenti menerima charge atau webhook dari platform."
          title="Danger zone"
          tone="danger"
        />

        <ProfileSessionPanel mfa={mfa} onLogout={onLogout} onReloadSession={onReloadProfile} tokens={sessionTokens} user={user} />
      </div>
    </section>
  )
}

function StoreOverviewActionCard({
  buttonLabel,
  description,
  eyebrow,
  onOpen,
  title,
}: {
  buttonLabel: string
  description: string
  eyebrow: string
  onOpen: () => void
  title: string
}) {
  return (
    <Card className="rounded-[1.9rem] border-border/70 bg-card/80">
      <CardHeader className="gap-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="grid gap-2">
            <Badge variant="outline" className="w-fit">
              {eyebrow}
            </Badge>
            <CardTitle className="text-2xl tracking-[-0.05em]">{title}</CardTitle>
            <CardDescription>{description}</CardDescription>
          </div>
          <Button onClick={onOpen} size="sm" type="button" variant="outline">
            {buttonLabel}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <DashboardCallout
          description="Form tetap dimuat terpisah agar overview charge, health lane, dan ringkasan store masih terasa cepat saat dashboard pertama kali dibuka."
          title="Editor dimuat sesuai kebutuhan"
        />
      </CardContent>
    </Card>
  )
}

function StoreOverviewFormLoader({
  eyebrow,
  title,
}: {
  eyebrow: string
  title: string
}) {
  return (
    <Card className="rounded-[1.9rem] border-border/70 bg-card/80">
      <CardContent className="grid gap-3 p-6">
        <span className="dashboard-eyebrow">{eyebrow}</span>
        <strong className="text-lg font-semibold text-foreground">{title}</strong>
        <p className="text-sm leading-6 text-muted-foreground">
          Form dimuat terpisah agar ringkasan operasional store tetap muncul lebih cepat saat workspace dibuka.
        </p>
      </CardContent>
    </Card>
  )
}
