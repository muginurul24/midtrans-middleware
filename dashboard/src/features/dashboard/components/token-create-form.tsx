import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useWatch } from 'react-hook-form'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { TokenCreateFormValues } from '@/features/dashboard/types'
import { defaultTokenCreateFormValues, tokenCreateFormSchema } from '@/lib/form-schemas'

type TokenCreateFormProps = {
  isCreatingToken: boolean
  onCreateToken: (values: TokenCreateFormValues) => Promise<boolean>
}

const availableScopes = ['transaction:create', 'transaction:read']

export function TokenCreateForm({ isCreatingToken, onCreateToken }: TokenCreateFormProps) {
  const {
    formState: { errors },
    handleSubmit,
    control,
    register,
    reset,
    setValue,
  } = useForm<TokenCreateFormValues>({
    resolver: zodResolver(tokenCreateFormSchema),
    defaultValues: defaultTokenCreateFormValues,
  })
  const tokenScopes = useWatch({
    control,
    name: 'scopes',
  })

  const handleCreateTokenSubmit = handleSubmit(async (values) => {
    const didCreate = await onCreateToken(values)
    if (didCreate) {
      reset(defaultTokenCreateFormValues)
    }
  })

  const handleScopeChange = (scope: string, checked: boolean) => {
    const nextScopes = checked
      ? Array.from(new Set([...(tokenScopes ?? []), scope]))
      : (tokenScopes ?? []).filter((item) => item !== scope)

    setValue('scopes', nextScopes, {
      shouldDirty: true,
      shouldValidate: true,
    })
  }

  return (
    <form className="dashboard-form" noValidate onSubmit={handleCreateTokenSubmit}>
      <div className="grid gap-2">
        <Label htmlFor="token-name">Nama token</Label>
        <Input aria-invalid={errors.name ? true : undefined} id="token-name" placeholder="production-backend" {...register('name')} />
      </div>
      {errors.name ? <p className="form-message is-error">{errors.name.message}</p> : null}

      <fieldset className="dashboard-checkbox-group">
        <legend>Scope</legend>
        {availableScopes.map((scope) => {
          const checked = (tokenScopes ?? []).includes(scope)
          return (
            <label key={scope}>
              <input checked={checked} onChange={(event) => handleScopeChange(scope, event.target.checked)} type="checkbox" />
              <span>{scope}</span>
            </label>
          )
        })}
      </fieldset>
      {errors.scopes ? <p className="form-message is-error">{errors.scopes.message}</p> : null}

      <Button className="rounded-2xl" disabled={isCreatingToken} type="submit">
        {isCreatingToken ? 'Membuat token…' : 'Buat Token'}
      </Button>
    </form>
  )
}
