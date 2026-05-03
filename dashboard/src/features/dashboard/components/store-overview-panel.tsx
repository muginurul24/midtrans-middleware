import { Copy } from 'lucide-react'
import { Suspense, lazy, useState } from 'react'

import type { MfaState, TokenPair, User } from '@/app/use-session'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DashboardCallout } from '@/features/dashboard/components/dashboard-callout'
import {
  DashboardMobileSummaryGrid,
  DashboardMobileSummaryItem,
} from '@/features/dashboard/components/dashboard-mobile-summary'
import { DashboardPanelCard } from '@/features/dashboard/components/dashboard-panel-card'
import { ProfileSessionPanel } from '@/features/dashboard/components/profile-session-panel'
import type { PasswordForm, Store, StoreSettingsForm } from '@/features/dashboard/types'

const StoreSettingsFormPanel = lazy(() =>
  import('@/features/dashboard/components/store-overview-forms').then((module) => ({ default: module.StoreSettingsFormPanel })),
)
const StorePasswordFormPanel = lazy(() =>
  import('@/features/dashboard/components/store-overview-forms').then((module) => ({ default: module.StorePasswordFormPanel })),
)

type StoreOverviewPanelProps = {
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
  user: User | null
}

export function StoreOverviewPanel({
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
  user,
}: StoreOverviewPanelProps) {
  const [isStoreSettingsOpen, setIsStoreSettingsOpen] = useState(false)
  const [isPasswordFormOpen, setIsPasswordFormOpen] = useState(false)

  return (
    <section className="dashboard-section-grid">
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
          description="Nama, domain, callback bawaan, dan status store hanya dimuat saat Anda benar-benar masuk ke mode edit."
          eyebrow="Pengaturan Store"
          onOpen={() => setIsStoreSettingsOpen(true)}
          title="Editor konfigurasi inti dimuat sesuai kebutuhan"
        />
      )}

      <DashboardPanelCard
        description="Ringkasan identitas store dan credential webhook yang biasanya paling sering dicek saat debugging integrasi."
        eyebrow="Catatan Operasional"
        title="Ringkasan store"
      >
        <DashboardMobileSummaryGrid>
          <DashboardMobileSummaryItem label="Store ID" className="sm:col-span-2">
            {selectedStore?.id ?? '—'}
          </DashboardMobileSummaryItem>
          <DashboardMobileSummaryItem label="Slug">{selectedStore?.slug ?? '—'}</DashboardMobileSummaryItem>
          <DashboardMobileSummaryItem label="Status">{selectedStore?.status ?? '—'}</DashboardMobileSummaryItem>
        </DashboardMobileSummaryGrid>

        <dl className="dashboard-definition-list">
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
              <li>Backend store menggunakan `Authorization: Bearer sk_test_xxx`.</li>
              <li>Set `Idempotency-Key` unik untuk setiap charge request.</li>
              <li>Pastikan callback URL store bisa menerima POST JSON dari worker.</li>
            </ul>
          }
          title="Checklist integrasi"
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
          <div className="dashboard-reveal-card">
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

        <DashboardCallout
          actions={
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button className="w-full sm:w-auto" onClick={onDeactivateStore} type="button" variant="destructive">
                Nonaktifkan Store
              </Button>
            </div>
          }
          description="Nonaktifkan store hanya jika tenant benar-benar tidak boleh lagi menerima charge atau webhook dari platform."
          title="Danger zone"
          tone="danger"
        />
      </DashboardPanelCard>

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
          description="Form ganti password akun dashboard tidak ikut dimuat di tab store sampai Anda memang membutuhkannya."
          eyebrow="Keamanan"
          onOpen={() => setIsPasswordFormOpen(true)}
          title="Form password dimuat saat dibuka"
        />
      )}

      <ProfileSessionPanel mfa={mfa} onLogout={onLogout} onReloadSession={onReloadProfile} tokens={sessionTokens} user={user} />
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
    <DashboardPanelCard
      description={description}
      eyebrow={eyebrow}
      headerAction={
        <Button onClick={onOpen} size="sm" type="button" variant="outline">
          {buttonLabel}
        </Button>
      }
      title={title}
    >
      <DashboardCallout
        description="Ringkasan store dan sesi tetap tampil lebih dulu agar tab default lebih ringan saat dibuka dari perangkat baru atau koneksi lambat."
        title="Editor dimuat terpisah"
      />
    </DashboardPanelCard>
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
    <Card>
      <CardContent className="grid gap-3 p-6">
        <span className="dashboard-eyebrow">{eyebrow}</span>
        <strong className="text-lg font-semibold text-foreground">{title}</strong>
        <p className="text-sm leading-6 text-muted-foreground">
          Form dimuat terpisah agar ringkasan store dan status sesi tetap bisa muncul lebih cepat saat dashboard dibuka.
        </p>
      </CardContent>
    </Card>
  )
}
