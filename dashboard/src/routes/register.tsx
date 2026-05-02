import { startTransition, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import { useSession, type APIError } from '@/app/use-session'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AuthShell } from '@/routes/auth-shell'

export function RegisterPage() {
  const { register } = useSession()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage(null)

    try {
      const mfa = await register({ name, email, password })
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
      eyebrow="Dashboard Register"
      title="Buat akun untuk mulai mengelola banyak toko."
      body="Setelah register, Anda langsung bisa membuat store pertama, menghasilkan API token, dan memantau transaksi dari dashboard yang sama."
      alternateLabel="Sudah punya akun?"
      alternateHref="/login"
      alternateAction="Masuk di sini"
    >
      <div className="grid gap-2">
        <h2 className="text-2xl font-bold tracking-[-0.04em] text-stone-950 dark:text-stone-50">Daftar</h2>
        <p className="text-sm leading-6 text-stone-600 dark:text-stone-400">
          Mulai dengan akun dashboard baru. Password minimal 8 karakter.
        </p>
      </div>

      <form className="grid gap-5" onSubmit={handleSubmit}>
        <div className="grid gap-2">
          <Label htmlFor="register-name">Nama</Label>
          <Input
            autoComplete="name"
            id="register-name"
            name="name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nama Anda"
            required
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="register-email">Email</Label>
          <Input
            autoComplete="email"
            id="register-email"
            name="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="anda@perusahaan.com"
            required
          />
        </div>

        <div className="grid gap-2">
          <Label htmlFor="register-password">Password</Label>
          <Input
            autoComplete="new-password"
            id="register-password"
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
          {isSubmitting ? 'Membuat akun…' : 'Buat Akun'}
        </Button>
      </form>

      <div className="flex items-center justify-between text-sm">
        <span className="text-stone-500 dark:text-stone-400">Belum yakin soal alurnya?</span>
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
