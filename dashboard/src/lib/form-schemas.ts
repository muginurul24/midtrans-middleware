import { z } from 'zod'

import type { PasswordForm, StoreCreateForm, StoreSettingsForm, TokenCreateFormValues } from '@/features/dashboard/types'

function requiredText(label: string) {
  return z.string().trim().min(1, `${label} wajib diisi.`)
}

function isValidURL(value: string) {
  try {
    new URL(value)
    return true
  } catch {
    return false
  }
}

const optionalDomain = z
  .string()
  .trim()
  .refine(
    (value) => value === '' || (!value.includes('://') && !value.includes('/') && !/\s/.test(value)),
    'Isi domain saja tanpa protocol, path, atau spasi.',
  )

const optionalCallbackURL = z
  .string()
  .trim()
  .refine((value) => value === '' || isValidURL(value), 'Masukkan URL callback yang valid.')

export const storeCreateFormSchema = z.object({
  name: requiredText('Nama store'),
  slug: z
    .string()
    .trim()
    .min(1, 'Slug wajib diisi.')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug hanya boleh huruf kecil, angka, dan tanda hubung.'),
  domain: optionalDomain,
  default_callback_url: optionalCallbackURL,
})

export const storeSettingsFormSchema = z.object({
  name: requiredText('Nama store'),
  domain: optionalDomain,
  default_callback_url: optionalCallbackURL,
  status: z.enum(['active', 'inactive']),
})

export const tokenCreateFormSchema = z.object({
  name: requiredText('Nama token'),
  scopes: z.array(z.string()).min(1, 'Pilih minimal satu scope.'),
})

export const passwordChangeFormSchema = z.object({
  current_password: z.string().min(1, 'Password saat ini wajib diisi.'),
  new_password: z.string().min(8, 'Password baru minimal 8 karakter.'),
})

export const defaultStoreCreateFormValues: StoreCreateForm = {
  name: '',
  slug: '',
  domain: '',
  default_callback_url: '',
}

export const defaultPasswordChangeFormValues: PasswordForm = {
  current_password: '',
  new_password: '',
}

export const defaultTokenCreateFormValues: TokenCreateFormValues = {
  name: '',
  scopes: ['transaction:create', 'transaction:read'],
}

export function buildStoreSettingsFormValues(selectedStore: {
  name?: string | null
  domain?: string | null
  default_callback_url?: string | null
  status?: 'active' | 'inactive' | null
} | null): StoreSettingsForm {
  return {
    name: selectedStore?.name ?? '',
    domain: selectedStore?.domain ?? '',
    default_callback_url: selectedStore?.default_callback_url ?? '',
    status: selectedStore?.status ?? 'active',
  }
}
