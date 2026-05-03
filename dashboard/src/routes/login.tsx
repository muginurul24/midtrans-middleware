import { startTransition, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { AuthShell } from '@/routes/auth-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSession, type APIError } from '@/app/use-session'
import { type LoginFormValues, validateLoginForm } from '@/lib/auth-form-validation'

export function LoginPage() {
  const { login } = useSession()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [values, setValues] = useState<LoginFormValues>({
    email: '',
    password: '',
  })
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof LoginFormValues, string>>>({})
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const redirectTarget = searchParams.get('redirect') || '/app'

  const updateField = (field: keyof LoginFormValues, value: string) => {
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
    const nextFieldErrors = validateLoginForm(values)
    setFieldErrors(nextFieldErrors)

    if (Object.keys(nextFieldErrors).length > 0) {
      return
    }

    setIsSubmitting(true)

    try {
      const mfa = await login(values)
      startTransition(() => {
        navigate(mfa.can_access_dashboard ? redirectTarget : '/mfa', { replace: true })
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
      eyebrow="Akses Dashboard"
      title="Masuk ke kontrol panel pembayaran Anda."
      body="Lanjutkan ke workspace store, token, transaksi, audit trail, dan webhook delivery yang sudah terhubung ke backend platform."
      alternateLabel="Belum punya akun?"
      alternateHref="/register"
      alternateAction="Daftar sekarang"
      documentTitle="Masuk Dashboard | PayGate"
    >
      <div className="grid gap-2">
        <h2 className="text-2xl font-semibold tracking-[-0.04em] text-foreground">Masuk</h2>
        <p className="text-sm leading-6 text-muted-foreground">
          Gunakan email dan password dashboard yang sudah terdaftar.
        </p>
      </div>

      <form className="grid gap-5" noValidate onSubmit={onSubmit}>
        <div className="grid gap-2">
          <Label htmlFor="login-email">Email</Label>
          <Input
            autoComplete="email"
            aria-invalid={fieldErrors.email ? true : undefined}
            id="login-email"
            onChange={(event) => updateField('email', event.target.value)}
            type="email"
            placeholder="anda@perusahaan.com"
            value={values.email}
          />
          {fieldErrors.email ? <p className="form-message is-error">{fieldErrors.email}</p> : null}
        </div>

        <div className="grid gap-2">
          <Label htmlFor="login-password">Password</Label>
          <Input
            autoComplete="current-password"
            aria-invalid={fieldErrors.password ? true : undefined}
            id="login-password"
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
          {isSubmitting ? 'Memproses…' : 'Masuk ke Dashboard'}
        </Button>
      </form>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Butuh konteks produk?</span>
        <Link className="font-semibold text-foreground hover:text-primary" to="/">
          Kembali ke landing page
        </Link>
      </div>
    </AuthShell>
  )
}
