import { createColumnHelper, type ColumnDef } from '@tanstack/react-table'
import { Copy } from 'lucide-react'
import { Suspense, lazy, useState } from 'react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DashboardCallout } from '@/features/dashboard/components/dashboard-callout'
import {
  DashboardMobileSummaryGrid,
  DashboardMobileSummaryItem,
} from '@/features/dashboard/components/dashboard-mobile-summary'
import { DashboardDataTable } from '@/features/dashboard/components/dashboard-data-table'
import { DashboardPanelCard } from '@/features/dashboard/components/dashboard-panel-card'
import { DashboardStatusBadge } from '@/features/dashboard/components/dashboard-status-badge'
import type { StoreToken, TokenCreateFormValues } from '@/features/dashboard/types'

const TokenCreateForm = lazy(() =>
  import('@/features/dashboard/components/token-create-form').then((module) => ({ default: module.TokenCreateForm })),
)

type TokensPanelProps = {
  formatDate: (value?: string | null) => string
  isCreatingToken: boolean
  onCopyToken: (token: string) => void
  onCreateToken: (values: TokenCreateFormValues) => Promise<boolean>
  onRevokeToken: (tokenId: string) => void
  onRotateToken: (tokenId: string) => void
  revealedToken: StoreToken | null
  rotatingTokenId: string | null
  tokens: StoreToken[]
}

const tokenColumnHelper = createColumnHelper<StoreToken>()

function TokenMobileCard({
  formatDate,
  onRevokeToken,
  onRotateToken,
  rotatingTokenId,
  token,
}: {
  formatDate: (value?: string | null) => string
  onRevokeToken: (tokenId: string) => void
  onRotateToken: (tokenId: string) => void
  rotatingTokenId: string | null
  token: StoreToken
}) {
  return (
    <Card size="sm">
      <CardContent className="grid gap-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="grid min-w-0 gap-1">
            <strong className="break-all text-sm text-foreground">{token.name}</strong>
            <code className="text-xs leading-5 text-muted-foreground break-all">{token.token_prefix}</code>
          </div>
          <DashboardStatusBadge status={token.revoked_at ? 'revoked' : 'active'} />
        </div>

        <DashboardMobileSummaryGrid>
          <DashboardMobileSummaryItem label="Scope" className="sm:col-span-2">
            <div className="flex flex-wrap gap-2">
              {token.scopes.map((scope) => (
                <Badge key={scope} variant="outline">
                  {scope}
                </Badge>
              ))}
            </div>
          </DashboardMobileSummaryItem>
          <DashboardMobileSummaryItem label="Terakhir Dipakai" className="sm:col-span-2">
            {formatDate(token.last_used_at)}
          </DashboardMobileSummaryItem>
        </DashboardMobileSummaryGrid>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button
            className="w-full sm:w-auto"
            disabled={Boolean(token.revoked_at) || rotatingTokenId === token.id}
            onClick={() => onRotateToken(token.id)}
            type="button"
            variant="outline"
          >
            {rotatingTokenId === token.id ? 'Merotasi…' : 'Rotasi'}
          </Button>
          <Button
            className="w-full sm:w-auto"
            disabled={Boolean(token.revoked_at)}
            onClick={() => onRevokeToken(token.id)}
            size="sm"
            type="button"
            variant="secondary"
          >
            Cabut
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

export function TokensPanel({
  formatDate,
  isCreatingToken,
  onCopyToken,
  onCreateToken,
  onRevokeToken,
  onRotateToken,
  revealedToken,
  rotatingTokenId,
  tokens,
}: TokensPanelProps) {
  const [isCreateFormOpen, setIsCreateFormOpen] = useState(false)
  const activeTokens = tokens.filter((token) => !token.revoked_at)
  const revokedTokens = tokens.length - activeTokens.length
  const recentlyUsedTokens = tokens.filter((token) => Boolean(token.last_used_at)).length

  const columns = [
    tokenColumnHelper.accessor('name', {
      header: 'Nama',
    }),
    tokenColumnHelper.display({
      id: 'prefix',
      header: 'Prefix',
      cell: ({ row }) => <code>{row.original.token_prefix}</code>,
    }),
    tokenColumnHelper.display({
      id: 'scopes',
      header: 'Scope',
      cell: ({ row }) => row.original.scopes.join(', '),
    }),
    tokenColumnHelper.display({
      id: 'last_used_at',
      header: 'Terakhir Dipakai',
      cell: ({ row }) => formatDate(row.original.last_used_at),
    }),
    tokenColumnHelper.display({
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <DashboardStatusBadge status={row.original.revoked_at ? 'revoked' : 'active'} />,
    }),
    tokenColumnHelper.display({
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }) => (
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            disabled={Boolean(row.original.revoked_at) || rotatingTokenId === row.original.id}
            onClick={() => onRotateToken(row.original.id)}
            size="sm"
            type="button"
            variant="outline"
          >
            {rotatingTokenId === row.original.id ? 'Merotasi…' : 'Rotasi'}
          </Button>
          <Button
            disabled={Boolean(row.original.revoked_at)}
            onClick={() => onRevokeToken(row.original.id)}
            size="sm"
            type="button"
            variant="secondary"
          >
            Cabut
          </Button>
        </div>
      ),
    }),
  ]

  return (
    <section className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            label: 'Token aktif',
            value: activeTokens.length,
            copy: 'Credential backend tenant yang masih siap dipakai.',
          },
          {
            label: 'Sudah dicabut',
            value: revokedTokens,
            copy: 'Token lama yang sudah tidak boleh lagi dipakai.',
          },
          {
            label: 'Punya jejak penggunaan',
            value: recentlyUsedTokens,
            copy: 'Token yang setidaknya pernah mencatat last-used timestamp.',
          },
        ].map((metric) => (
          <Card className="rounded-[1.7rem] border-border/70 bg-card/80 shadow-[0_24px_70px_-56px_rgba(15,23,42,0.48)]" key={metric.label}>
            <CardContent className="grid gap-3 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{metric.label}</p>
              <strong className="text-3xl font-semibold tracking-[-0.06em] text-foreground">{metric.value}</strong>
              <p className="text-sm leading-6 text-muted-foreground">{metric.copy}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="dashboard-section-grid">
      <DashboardPanelCard
        eyebrow="Buat Token"
        headerAction={
          <Button
            aria-expanded={isCreateFormOpen}
            onClick={() => setIsCreateFormOpen((current) => !current)}
            size="sm"
            type="button"
            variant={isCreateFormOpen ? 'secondary' : 'outline'}
          >
            {isCreateFormOpen ? 'Tutup Form' : 'Buka Form'}
          </Button>
        }
        title="Buat secret token baru"
      >
        <DashboardCallout
          description="Gunakan tab ini untuk menjaga hygiene credential tenant: buat token seperlunya, rotasi token yang terlalu lama, dan cabut token yang tidak lagi relevan."
          title="Token store adalah boundary backend, bukan akses frontend"
        />

        {isCreateFormOpen ? (
          <Suspense
            fallback={
              <DashboardCallout
                description="Form pembuatan token dimuat terpisah agar tab token tetap cepat saat hanya dipakai untuk melihat daftar atau rotasi."
                title="Menyiapkan form token…"
              />
            }
          >
            <TokenCreateForm isCreatingToken={isCreatingToken} onCreateToken={onCreateToken} />
          </Suspense>
        ) : (
          <DashboardCallout
            description="Buka form ini hanya saat Anda benar-benar perlu membuat token baru. Daftar token dan aksi rotasi tetap bisa dipakai tanpa memuat validator form."
            title={tokens.length === 0 ? 'Belum ada token aktif untuk store ini.' : 'Form token dimuat sesuai kebutuhan.'}
          />
        )}

        {revealedToken?.token ? (
          <div className="dashboard-reveal-card rounded-[1.6rem]">
            <span className="dashboard-reveal-card__eyebrow">Tampilkan Sekali</span>
            <strong>{revealedToken.name}</strong>
            <div className="dashboard-code-surface dashboard-code-surface--solid">
              <code className="dashboard-code-line">{revealedToken.token}</code>
            </div>
            <Button onClick={() => onCopyToken(revealedToken.token ?? '')} size="sm" type="button" variant="secondary">
              <Copy className="size-4" />
              Salin token
            </Button>
          </div>
        ) : null}
      </DashboardPanelCard>

      <DashboardPanelCard eyebrow="Daftar Token" title="Secret token store">
        <DashboardCallout
          description="List ini tetap fokus ke pembacaan cepat: prefix token, scope, last-used, status, lalu aksi rotasi atau cabut langsung dari tabel."
          title={`${tokens.length} token terekam untuk store ini`}
        />

        <DashboardDataTable
          columnTemplate="1fr 0.8fr 1fr 0.9fr 0.7fr auto"
          columns={columns as ColumnDef<StoreToken, unknown>[]}
          data={tokens}
          emptyState="Belum ada token untuk store ini."
          getRowId={(token) => token.id}
          renderMobileCard={(token) => (
            <TokenMobileCard
              formatDate={formatDate}
              onRevokeToken={onRevokeToken}
              onRotateToken={onRotateToken}
              rotatingTokenId={rotatingTokenId}
              token={token}
            />
          )}
        />
      </DashboardPanelCard>
      </div>
    </section>
  )
}
