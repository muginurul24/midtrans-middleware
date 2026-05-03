import { zodResolver } from '@hookform/resolvers/zod'
import type { ReactNode } from 'react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { DashboardCallout } from '@/features/dashboard/components/dashboard-callout'
import { DashboardPanelCard } from '@/features/dashboard/components/dashboard-panel-card'
import type { PasswordForm, Store, StoreSettingsForm } from '@/features/dashboard/types'
import {
  buildStoreSettingsFormValues,
  defaultPasswordChangeFormValues,
  passwordChangeFormSchema,
  storeSettingsFormSchema,
} from '@/lib/form-schemas'

type StoreSettingsFormPanelProps = {
  headerAction?: ReactNode
  isSavingStore: boolean
  onUpdateStore: (values: StoreSettingsForm) => Promise<boolean>
  selectedStore: Store | null
}

type StorePasswordFormPanelProps = {
  headerAction?: ReactNode
  isChangingPassword: boolean
  onChangePassword: (values: PasswordForm) => Promise<boolean>
  userEmail: string
}

export function StoreSettingsFormPanel({
  headerAction,
  isSavingStore,
  onUpdateStore,
  selectedStore,
}: StoreSettingsFormPanelProps) {
  const {
    formState: { errors: settingsErrors },
    handleSubmit: handleStoreSettingsSubmit,
    register: registerStoreSettings,
    reset: resetStoreSettings,
  } = useForm<StoreSettingsForm>({
    resolver: zodResolver(storeSettingsFormSchema),
    defaultValues: buildStoreSettingsFormValues(selectedStore),
  })

  useEffect(() => {
    resetStoreSettings(buildStoreSettingsFormValues(selectedStore))
  }, [resetStoreSettings, selectedStore])

  const submitStoreSettings = handleStoreSettingsSubmit(async (values) => {
    await onUpdateStore(values)
  })

  return (
    <DashboardPanelCard
      description="Perbarui identitas tenant, domain, callback bawaan, dan status store dari satu form yang sama."
      eyebrow="Pengaturan Store"
      headerAction={headerAction}
      title="Konfigurasi inti store"
    >
      <form className="dashboard-form" noValidate onSubmit={submitStoreSettings}>
        <div className="grid gap-2">
          <Label htmlFor="store-settings-name">Nama</Label>
          <Input aria-invalid={settingsErrors.name ? true : undefined} id="store-settings-name" {...registerStoreSettings('name')} />
          {settingsErrors.name ? <p className="form-message is-error">{settingsErrors.name.message}</p> : null}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="store-settings-domain">Domain</Label>
          <Input
            aria-invalid={settingsErrors.domain ? true : undefined}
            id="store-settings-domain"
            placeholder="contoh.com"
            {...registerStoreSettings('domain')}
          />
          {settingsErrors.domain ? <p className="form-message is-error">{settingsErrors.domain.message}</p> : null}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="store-settings-callback">Default callback URL</Label>
          <Input
            aria-invalid={settingsErrors.default_callback_url ? true : undefined}
            id="store-settings-callback"
            placeholder="https://domain.com/api/callback"
            {...registerStoreSettings('default_callback_url')}
          />
          {settingsErrors.default_callback_url ? <p className="form-message is-error">{settingsErrors.default_callback_url.message}</p> : null}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="store-settings-status">Status</Label>
          <NativeSelect
            aria-invalid={settingsErrors.status ? true : undefined}
            id="store-settings-status"
            {...registerStoreSettings('status')}
          >
            <option value="active">active</option>
            <option value="inactive">inactive</option>
          </NativeSelect>
          {settingsErrors.status ? <p className="form-message is-error">{settingsErrors.status.message}</p> : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button className="w-full rounded-2xl sm:w-auto" disabled={isSavingStore} type="submit">
            {isSavingStore ? 'Menyimpan…' : 'Simpan Perubahan'}
          </Button>
        </div>
      </form>
    </DashboardPanelCard>
  )
}

export function StorePasswordFormPanel({
  headerAction,
  isChangingPassword,
  onChangePassword,
  userEmail,
}: StorePasswordFormPanelProps) {
  const {
    formState: { errors: passwordErrors },
    handleSubmit: handlePasswordSubmit,
    register: registerPassword,
    reset: resetPasswordForm,
  } = useForm<PasswordForm>({
    resolver: zodResolver(passwordChangeFormSchema),
    defaultValues: defaultPasswordChangeFormValues,
  })

  const submitPasswordChange = handlePasswordSubmit(async (values) => {
    const didChange = await onChangePassword(values)
    if (didChange) {
      resetPasswordForm(defaultPasswordChangeFormValues)
    }
  })

  return (
    <DashboardPanelCard
      description="Ubah password akun dashboard tanpa keluar dari workspace saat ini."
      eyebrow="Keamanan"
      headerAction={headerAction}
      title="Ganti password dashboard"
    >
      <form className="dashboard-form" noValidate onSubmit={submitPasswordChange}>
        <input
          aria-hidden="true"
          autoComplete="username"
          className="sr-only"
          name="username"
          readOnly
          tabIndex={-1}
          type="email"
          value={userEmail}
        />
        <div className="grid gap-2">
          <Label htmlFor="change-password-current">Password saat ini</Label>
          <Input
            autoComplete="current-password"
            aria-invalid={passwordErrors.current_password ? true : undefined}
            id="change-password-current"
            type="password"
            {...registerPassword('current_password')}
          />
          {passwordErrors.current_password ? <p className="form-message is-error">{passwordErrors.current_password.message}</p> : null}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="change-password-next">Password baru</Label>
          <Input
            autoComplete="new-password"
            aria-invalid={passwordErrors.new_password ? true : undefined}
            id="change-password-next"
            type="password"
            {...registerPassword('new_password')}
          />
          {passwordErrors.new_password ? <p className="form-message is-error">{passwordErrors.new_password.message}</p> : null}
        </div>

        <DashboardCallout
          description={
            <ul className="dashboard-legend">
              <li>Gunakan password baru minimal 8 karakter.</li>
              <li>Simpan password di password manager, bukan di catatan plain text.</li>
            </ul>
          }
          title="Catatan keamanan"
          tone="warning"
        />

        <Button className="w-full rounded-2xl sm:w-auto" disabled={isChangingPassword} type="submit">
          {isChangingPassword ? 'Mengubah password…' : 'Ganti Password'}
        </Button>
      </form>
    </DashboardPanelCard>
  )
}
