import { startTransition, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useSession, type APIError } from '@/app/use-session'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { type RegisterFormValues, validateRegisterForm } from '@/lib/auth-form-validation'
import { AuthShell } from '@/routes/auth-shell'

export function RegisterPage() {
  const { register: registerAccount } = useSession()
  const navigate = useNavigate()
  const [values, setValues] = useState<RegisterFormValues>({
    name: '',
    email: '',
    password: '',
  })
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof RegisterFormValues, string>>>({})
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const updateField = (field: keyof RegisterFormValues, value: string) => {
    setValues((current) => ({
      ...current,
      [field]: value,
    }))

    setFieldErrors((current) => {
      if (!current[field]) {
        return current
      }

      return {
        ...current,
        [field]: undefined,
      }
    })
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage(null)
    const nextFieldErrors = validateRegisterForm(values)
    setFieldErrors(nextFieldErrors)

    if (Object.keys(nextFieldErrors).length > 0) {
      return
    }

    setIsSubmitting(true)

    try {
      const mfa = await registerAccount(values)
      startTransition(() => {
        navigate(mfa.can_access_dashboard ? '/app' : '/mfa', { replace: true })
      })
    } catch (error) {
      const apiError = error as APIError
      setErrorMessage(apiError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Buat Akun Dashboard"
      title="Buat akun untuk mulai mengelola banyak toko."
      body="Setelah register, Anda langsung bisa membuat store pertama, menghasilkan API token, dan memantau transaksi dari dashboard yang sama."
      alternateLabel="Sudah punya akun?"
      alternateHref="/login"
      alternateAction="Masuk di sini"
      documentTitle="Daftar Dashboard | PayGate"
    >
      <div className="grid gap-2">
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-foreground">Daftar</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Mulai dengan akun dashboard baru. Password minimal 8 karakter.
        </p>
      </div>

      <form className="grid gap-5" noValidate onSubmit={onSubmit}>
        <div className="grid gap-2">
          <Label htmlFor="register-name">Nama</Label>
          <Input
            autoComplete="name"
            aria-invalid={fieldErrors.name ? true : undefined}
            id="register-name"
            onChange={(event) => updateField('name', event.target.value)}
            type="text"
            placeholder="Nama Anda"
            value={values.name}
          />
          {fieldErrors.name ? <p className="form-message is-error">{fieldErrors.name}</p> : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="register-email">Email</Label>
          <Input
            autoComplete="email"
            aria-invalid={fieldErrors.email ? true : undefined}
            id="register-email"
            onChange={(event) => updateField('email', event.target.value)}
            type="email"
            placeholder="anda@perusahaan.com"
            value={values.email}
          />
          {fieldErrors.email ? <p className="form-message is-error">{fieldErrors.email}</p> : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="register-password">Password</Label>
          <Input
            autoComplete="new-password"
            aria-invalid={fieldErrors.password ? true : undefined}
            id="register-password"
            onChange={(event) => updateField('password', event.target.value)}
            type="password"
            placeholder="Minimal 8 karakter"
            value={values.password}
          />
          {fieldErrors.password ? <p className="form-message is-error">{fieldErrors.password}</p> : null}
        </div>

        {errorMessage ? (
          <p className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMessage}
          </p>
        ) : null}

        <Button className="h-11 rounded-2xl" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Membuat akun…' : 'Buat Akun'}
        </Button>
      </form>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Belum yakin soal alurnya?</span>
        <Link className="font-semibold text-foreground hover:text-primary" to="/">
          Kembali ke landing page
        </Link>
      </div>
    </AuthShell>
  )
}
