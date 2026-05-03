import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LogOut, RefreshCcw } from 'lucide-react'

import type { MfaState, TokenPair, User } from '@/app/use-session'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { DashboardCallout } from '@/features/dashboard/components/dashboard-callout'
import {
  DashboardMobileSummaryGrid,
  DashboardMobileSummaryItem,
} from '@/features/dashboard/components/dashboard-mobile-summary'
import { DashboardPanelCard } from '@/features/dashboard/components/dashboard-panel-card'
import { cn } from '@/lib/utils'

type ProfileSessionPanelProps = {
  user: User | null
  mfa: MfaState | null
  tokens: TokenPair | null
  onLogout: () => Promise<void>
  onReloadSession: () => Promise<void>
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

function mfaBadgeVariant(mfa: MfaState | null): 'success' | 'warning' | 'secondary' {
  if (!mfa) {
    return 'secondary'
  }
  if (mfa.enabled && mfa.verified) {
    return 'success'
  }
  if (mfa.required || mfa.setup_required) {
    return 'warning'
  }
  return 'secondary'
}

function mfaLabel(mfa: MfaState | null) {
  if (!mfa) {
    return 'tidak diketahui'
  }
  if (mfa.enabled && mfa.verified) {
    return 'terverifikasi'
  }
  if (mfa.setup_required) {
    return 'butuh setup'
  }
  if (mfa.required) {
    return 'butuh verifikasi'
  }
  if (mfa.enabled) {
    return 'aktif'
  }
  return 'opsional'
}

export function ProfileSessionPanel({
  user,
  mfa,
  tokens,
  onLogout,
  onReloadSession,
}: ProfileSessionPanelProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await onReloadSession()
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await onLogout()
    } catch {
      // SessionProvider already clears local session in logout finalizer.
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <DashboardPanelCard
      description="Pantau status akun yang sedang aktif, umur token, dan jalur aksi sesi tanpa harus meninggalkan dashboard."
      eyebrow="Profil & Sesi"
      title="Akun yang sedang aktif"
    >
      <DashboardMobileSummaryGrid>
        <DashboardMobileSummaryItem label="Role">
          <Badge className="w-fit" variant="secondary">
            {user?.role ?? 'user'}
          </Badge>
        </DashboardMobileSummaryItem>
        <DashboardMobileSummaryItem label="Status MFA">
          <Badge className="w-fit" variant={mfaBadgeVariant(mfa)}>
            {mfaLabel(mfa)}
          </Badge>
        </DashboardMobileSummaryItem>
        <DashboardMobileSummaryItem className="sm:col-span-2" label="Access Token Berlaku Sampai">
          {formatDate(tokens?.access_expires_at)}
        </DashboardMobileSummaryItem>
      </DashboardMobileSummaryGrid>

      <dl className="dashboard-definition-list">
        <div>
          <dt>Nama</dt>
          <dd>{user?.name ?? '—'}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd title={user?.email ?? undefined}>{user?.email ?? '—'}</dd>
        </div>
        <div>
          <dt>ID User</dt>
          <dd>{user?.id ?? '—'}</dd>
        </div>
        <div>
          <dt>Bergabung</dt>
          <dd>{formatDate(user?.created_at)}</dd>
        </div>
        <div>
          <dt>Update Profil Terakhir</dt>
          <dd>{formatDate(user?.updated_at)}</dd>
        </div>
        <div>
          <dt>Kode Recovery MFA</dt>
          <dd>{formatDate(mfa?.recovery_codes_regenerated_at)}</dd>
        </div>
        <div>
          <dt>Kedaluwarsa Refresh Token</dt>
          <dd>{formatDate(tokens?.refresh_expires_at)}</dd>
        </div>
      </dl>

      <DashboardCallout
        description={
          <ul className="dashboard-legend">
            <li>Refresh session state akan sinkronkan ulang profil dan status MFA dari backend.</li>
            <li>Kelola setup, rotate, disable MFA, dan recovery code dari halaman MFA.</li>
            <li>Logout hanya mencabut sesi aktif di browser ini.</li>
          </ul>
        }
        title="Aksi yang tersedia"
      />

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Button className="w-full sm:w-auto" disabled={isRefreshing} onClick={() => void handleRefresh()} type="button" variant="secondary">
          <RefreshCcw className={cn('size-4', isRefreshing && 'animate-spin')} />
          {isRefreshing ? 'Menyegarkan sesi…' : 'Segarkan Status Sesi'}
        </Button>
        <Link className={cn(buttonVariants({ variant: 'outline' }), 'w-full sm:w-auto')} to="/mfa">
          Kelola MFA
        </Link>
        <Button className="w-full sm:w-auto" disabled={isLoggingOut} onClick={() => void handleLogout()} type="button" variant="destructive">
          <LogOut className="size-4" />
          {isLoggingOut ? 'Keluar…' : 'Keluar dari Sesi'}
        </Button>
      </div>
    </DashboardPanelCard>
  )
}
