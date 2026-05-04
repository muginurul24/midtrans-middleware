import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DashboardCallout } from '@/features/dashboard/components/dashboard-callout'
import { DashboardPanelCard } from '@/features/dashboard/components/dashboard-panel-card'
import type { StoreCreateForm } from '@/features/dashboard/types'
import { defaultStoreCreateFormValues, storeCreateFormSchema } from '@/lib/form-schemas'

type CreateStoreWorkspacePanelProps = {
  isCreatingStore: boolean
  onCreateStore: (values: StoreCreateForm) => Promise<boolean>
}

export function CreateStoreWorkspacePanel({
  isCreatingStore,
  onCreateStore,
}: CreateStoreWorkspacePanelProps) {
  const {
    formState: { errors },
    handleSubmit,
    register,
    reset,
  } = useForm<StoreCreateForm>({
    resolver: zodResolver(storeCreateFormSchema),
    defaultValues: defaultStoreCreateFormValues,
  })

  const handleCreateStoreSubmit = handleSubmit(async (values) => {
    const didCreate = await onCreateStore(values)
    if (didCreate) {
      reset(defaultStoreCreateFormValues)
    }
  })

  return (
    <section className="dashboard-section-grid">
      <DashboardPanelCard
        description="Siapkan tenant baru dengan identitas yang jelas, slug stabil, dan callback default yang memang siap menerima relay dari worker."
        eyebrow="Buat Store"
        title="Daftarkan tenant baru"
      >
        <DashboardCallout
          description={
            <ul className="dashboard-legend">
              <li>Gunakan nama store yang akan dikenali operator saat memilih tenant dari direktori.</li>
              <li>Isi domain tanpa protocol atau path agar metadata store tetap bersih.</li>
              <li>Masukkan callback default hanya jika backend store memang siap menerima POST JSON dari worker.</li>
            </ul>
          }
          title="Checklist sebelum membuat store"
        />

        <form className="dashboard-form" noValidate onSubmit={handleCreateStoreSubmit}>
          <div className="grid gap-2">
            <Label htmlFor="create-store-name">Nama store</Label>
            <Input aria-invalid={errors.name ? true : undefined} id="create-store-name" placeholder="Toko Kopi Nusantara" {...register('name')} />
            {errors.name ? <p className="form-message is-error">{errors.name.message}</p> : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="create-store-slug">Slug</Label>
            <Input
              aria-invalid={errors.slug ? true : undefined}
              id="create-store-slug"
              placeholder="toko-kopi-nusantara"
              {...register('slug')}
            />
            {errors.slug ? <p className="form-message is-error">{errors.slug.message}</p> : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="create-store-domain">Domain</Label>
            <Input aria-invalid={errors.domain ? true : undefined} id="create-store-domain" placeholder="tokokopi.com" {...register('domain')} />
            {errors.domain ? <p className="form-message is-error">{errors.domain.message}</p> : null}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="create-store-callback">Default callback URL</Label>
            <Input
              aria-invalid={errors.default_callback_url ? true : undefined}
              id="create-store-callback"
              placeholder="https://tokokopi.com/api/payment/callback"
              {...register('default_callback_url')}
            />
            {errors.default_callback_url ? <p className="form-message is-error">{errors.default_callback_url.message}</p> : null}
          </div>

          <Button className="w-full rounded-2xl sm:w-auto" disabled={isCreatingStore} type="submit">
            {isCreatingStore ? 'Membuat store…' : 'Buat Store'}
          </Button>
        </form>
      </DashboardPanelCard>
    </section>
  )
}
