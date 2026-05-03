import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { SidebarInput } from '@/components/ui/sidebar'
import type { StoreCreateForm } from '@/features/dashboard/types'
import { defaultStoreCreateFormValues, storeCreateFormSchema } from '@/lib/form-schemas'

type SidebarCreateStoreFormProps = {
  isCreatingStore: boolean
  onCreateStore: (values: StoreCreateForm) => Promise<boolean>
}

export function SidebarCreateStoreForm({ isCreatingStore, onCreateStore }: SidebarCreateStoreFormProps) {
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
    <form className="grid gap-3 px-2" noValidate onSubmit={handleCreateStoreSubmit}>
      <div className="grid gap-1.5">
        <label className="text-xs font-medium text-sidebar-foreground/80" htmlFor="sidebar-create-store-name">
          Nama store
        </label>
        <SidebarInput
          aria-invalid={errors.name ? true : undefined}
          id="sidebar-create-store-name"
          placeholder="Toko Kopi Nusantara"
          {...register('name')}
        />
        {errors.name ? <p className="form-message is-error">{errors.name.message}</p> : null}
      </div>

      <div className="grid gap-1.5">
        <label className="text-xs font-medium text-sidebar-foreground/80" htmlFor="sidebar-create-store-slug">
          Slug
        </label>
        <SidebarInput
          aria-invalid={errors.slug ? true : undefined}
          id="sidebar-create-store-slug"
          placeholder="toko-kopi-nusantara"
          {...register('slug')}
        />
        {errors.slug ? <p className="form-message is-error">{errors.slug.message}</p> : null}
      </div>

      <div className="grid gap-1.5">
        <label className="text-xs font-medium text-sidebar-foreground/80" htmlFor="sidebar-create-store-domain">
          Domain
        </label>
        <SidebarInput
          aria-invalid={errors.domain ? true : undefined}
          id="sidebar-create-store-domain"
          placeholder="tokokopi.com"
          {...register('domain')}
        />
        {errors.domain ? <p className="form-message is-error">{errors.domain.message}</p> : null}
      </div>

      <div className="grid gap-1.5">
        <label className="text-xs font-medium text-sidebar-foreground/80" htmlFor="sidebar-create-store-callback">
          Default callback URL
        </label>
        <SidebarInput
          aria-invalid={errors.default_callback_url ? true : undefined}
          id="sidebar-create-store-callback"
          placeholder="https://tokokopi.com/api/payment/callback"
          {...register('default_callback_url')}
        />
        {errors.default_callback_url ? <p className="form-message is-error">{errors.default_callback_url.message}</p> : null}
      </div>

      <Button className="mt-1 w-full" disabled={isCreatingStore} size="sm" type="submit">
        {isCreatingStore ? 'Membuat store…' : 'Buat Store'}
      </Button>
    </form>
  )
}
