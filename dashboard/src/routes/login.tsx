import { startTransition, useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { AuthShell } from '@/routes/auth-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSession, type APIError } from '@/app/use-session'

export function LoginPage() {
  const { login } = useSession()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const redirectTarget = searchParams.get('redirect') || '/app'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const mfa = await login({ email, password })
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
      eyebrow="Dashboard Login"
      title="Masuk ke kontrol panel pembayaran Anda."
      body="Lanjutkan ke workspace store, token, transaksi, audit trail, dan webhook delivery yang sudah terhubung ke backend platform."
      alternateLabel="Belum punya akun?"
      alternateHref="/register"
      alternateAction="Daftar sekarang"
    >
      <div className="grid gap-2">
        <h2 className="text-2xl font-bold tracking-[-0.04em] text-stone-950 dark:text-stone-50">Masuk</h2>
        <p className="text-sm leading-6 text-stone-600 dark:text-stone-400">
          Gunakan email dan password dashboard yang sudah terdaftar.
        </p>
      </div>

      <form className="grid gap-5" onSubmit={handleSubmit}>
        <div className="grid gap-2">
          <Label htmlFor="login-email">Email</Label>
          <Input
            autoComplete="email"
            id="login-email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="anda@perusahaan.com"
            required
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="login-password">Password</Label>
          <Input
            autoComplete="current-password"
            id="login-password"
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Minimal 8 karakter"
            required
          />
        </div>

        {errorMessage ? (
          <p className="rounded-2xl border border-red-300/70 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:text-red-300">
            {errorMessage}
          </p>
        ) : null}

        <Button className="h-11 rounded-2xl" disabled={isSubmitting} type="submit">
          {isSubmitting ? 'Memproses…' : 'Masuk ke Dashboard'}
        </Button>
      </form>

      <div className="flex items-center justify-between text-sm">
        <span className="text-stone-500 dark:text-stone-400">Butuh konteks produk?</span>
        <Link
          className="font-semibold text-stone-700 hover:text-stone-950 dark:text-stone-300 dark:hover:text-stone-50"
          to="/"
        >
          Kembali ke landing page
        </Link>
      </div>
    </AuthShell>
  )
}
