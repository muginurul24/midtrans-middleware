import { Suspense, lazy, useState } from 'react'

import type { MfaState, TokenPair, User } from '@/app/use-session'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { DashboardCallout } from '@/features/dashboard/components/dashboard-callout'
import { DashboardPanelCard } from '@/features/dashboard/components/dashboard-panel-card'
import { ProfileSessionPanel } from '@/features/dashboard/components/profile-session-panel'
import type { PasswordForm } from '@/features/dashboard/types'

const StorePasswordFormPanel = lazy(() =>
  import('@/features/dashboard/components/store-overview-forms').then((module) => ({ default: module.StorePasswordFormPanel })),
)

type ProfileWorkspacePanelProps = {
  isChangingPassword: boolean
  mfa: MfaState | null
  onChangePassword: (values: PasswordForm) => Promise<boolean>
  onLogout: () => Promise<void>
  onReloadProfile: () => Promise<void>
  tokens: TokenPair | null
  user: User | null
}

export function ProfileWorkspacePanel({
  isChangingPassword,
  mfa,
  onChangePassword,
  onLogout,
  onReloadProfile,
  tokens,
  user,
}: ProfileWorkspacePanelProps) {
  const [isPasswordFormOpen, setIsPasswordFormOpen] = useState(false)

  return (
    <section className="dashboard-section-grid">
      <ProfileSessionPanel mfa={mfa} onLogout={onLogout} onReloadSession={onReloadProfile} tokens={tokens} user={user} />

      {isPasswordFormOpen ? (
        <Suspense fallback={<ProfileWorkspaceLoader eyebrow="Memuat Form Keamanan" title="Menyiapkan penggantian password…" />}>
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
        <DashboardPanelCard
          description="Password akun dashboard sekarang bisa dikelola dari page profil tanpa harus memilih tenant atau membuka tab store."
          eyebrow="Keamanan"
          headerAction={
            <Button onClick={() => setIsPasswordFormOpen(true)} size="sm" type="button" variant="outline">
              Buka Form Password
            </Button>
          }
          title="Kelola kredensial akun operator"
        >
          <DashboardCallout
            description={
              <ul className="dashboard-legend">
                <li>Gunakan page ini untuk audit masa berlaku sesi, MFA, dan akses operator.</li>
                <li>Perubahan password akun dashboard tidak mengubah token backend store.</li>
                <li>Kelola MFA tetap dilakukan dari halaman khusus `/mfa` agar recovery flow tetap terpisah.</li>
              </ul>
            }
            title="Ruang lingkup page profil"
          />
        </DashboardPanelCard>
      )}
    </section>
  )
}

function ProfileWorkspaceLoader({
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
          Form keamanan akun dipisah dari chunk utama agar page profil tetap cepat dibuka untuk cek sesi, MFA, dan metadata operator.
        </p>
      </CardContent>
    </Card>
  )
}
