import { Copy, QrCode, ShieldAlert, ShieldCheck, Smartphone } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import QRCode from 'qrcode'

import { AuthShell } from '@/routes/auth-shell'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useSession, type APIError } from '@/app/use-session'

type MFASetupPayload = {
  issuer: string
  account_name: string
  secret: string
  otpauth_url: string
}

type MFAVerifyPayload = {
  mfa: {
    required: boolean
    enabled: boolean
    verified: boolean
    setup_required: boolean
    can_access_dashboard: boolean
    recovery_codes_regenerated_at?: string | null
  }
  recovery_codes?: string[]
}

function prettyRecoveryCode(code: string) {
  return code.toUpperCase()
}

function formatRecoveryTimestamp(value?: string | null) {
  if (!value) {
    return 'Belum tersedia'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return 'Belum tersedia'
  }

  return `${new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Jakarta',
  }).format(parsed)} WIB`
}

export function MFAPage() {
  const { apiFetch, logout, mfa, reloadSession, user } = useSession()
  const navigate = useNavigate()
  const [setup, setSetup] = useState<MFASetupPayload | null>(null)
  const [qrCodeDataURL, setQRCodeDataURL] = useState<string | null>(null)
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [code, setCode] = useState('')
  const [recoveryRegenerateCode, setRecoveryRegenerateCode] = useState('')
  const [disableCode, setDisableCode] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [infoMessage, setInfoMessage] = useState<string | null>(null)
  const [isLoadingSetup, setIsLoadingSetup] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isRegeneratingRecovery, setIsRegeneratingRecovery] = useState(false)
  const [isDisabling, setIsDisabling] = useState(false)

  const needsSetup = Boolean(mfa && !mfa.enabled)
  const needsVerification = Boolean(mfa?.enabled && !mfa.verified)

  const loadSetup = useCallback(
    async (rotate = false) => {
      setIsLoadingSetup(true)
      setErrorMessage(null)
      setInfoMessage(null)
      setRecoveryCodes([])
      try {
        const data = await apiFetch<MFASetupPayload>(rotate ? '/v1/dashboard/auth/mfa/rotate' : '/v1/dashboard/auth/mfa/setup', {
          method: 'POST',
        })
        setSetup(data)
        setInfoMessage(
          rotate
            ? 'Secret MFA baru sudah dibuat. Scan QR atau copy secret baru, lalu verifikasi untuk menyelesaikan rotasi.'
            : 'Secret MFA baru sudah dibuat. Scan QR atau copy secret, lalu verifikasi 6 digit kodenya.',
        )
      } catch (error) {
        const apiError = error as APIError
        setErrorMessage(apiError.message)
      } finally {
        setIsLoadingSetup(false)
      }
    },
    [apiFetch],
  )

  useEffect(() => {
    if (mfa?.setup_required && !setup && !isLoadingSetup) {
      const timer = window.setTimeout(() => {
        void loadSetup()
      }, 0)
      return () => window.clearTimeout(timer)
    }
    return undefined
  }, [isLoadingSetup, loadSetup, mfa?.setup_required, setup])

  useEffect(() => {
    let active = true

    const buildQRCode = async () => {
      if (!setup?.otpauth_url) {
        setQRCodeDataURL(null)
        return
      }

      try {
        const dataURL = await QRCode.toDataURL(setup.otpauth_url, {
          errorCorrectionLevel: 'M',
          margin: 1,
          width: 256,
        })
        if (active) {
          setQRCodeDataURL(dataURL)
        }
      } catch {
        if (active) {
          setQRCodeDataURL(null)
        }
      }
    }

    void buildQRCode()

    return () => {
      active = false
    }
  }, [setup])

  const handleVerify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setErrorMessage(null)
    setInfoMessage(null)

    try {
      const data = await apiFetch<MFAVerifyPayload>('/v1/dashboard/auth/mfa/verify', {
        method: 'POST',
        body: JSON.stringify({ code }),
      })
      const nextMFA = await reloadSession()
      setCode('')
      setRecoveryCodes(data.recovery_codes ?? [])
      setSetup(null)
      setInfoMessage(
        data.recovery_codes?.length
          ? 'MFA aktif. Simpan recovery codes ini sekarang karena hanya ditampilkan sekali.'
          : 'Kode MFA valid. Sesi dashboard ini sudah terverifikasi.',
      )

      if (nextMFA.can_access_dashboard) {
        navigate('/app', { replace: true })
      }
    } catch (error) {
      const apiError = error as APIError
      setErrorMessage(apiError.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDisable = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsDisabling(true)
    setErrorMessage(null)
    setInfoMessage(null)

    try {
      await apiFetch<{ mfa: unknown }>('/v1/dashboard/auth/mfa/disable', {
        method: 'POST',
        body: JSON.stringify({ code: disableCode }),
      })
      await reloadSession()
      setDisableCode('')
      setSetup(null)
      setQRCodeDataURL(null)
      setRecoveryCodes([])
      setInfoMessage('MFA berhasil dinonaktifkan untuk akun ini.')
    } catch (error) {
      const apiError = error as APIError
      setErrorMessage(apiError.message)
    } finally {
      setIsDisabling(false)
    }
  }

  const handleRegenerateRecoveryCodes = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsRegeneratingRecovery(true)
    setErrorMessage(null)
    setInfoMessage(null)

    try {
      const data = await apiFetch<{ recovery_codes: string[] }>('/v1/dashboard/auth/mfa/recovery/regenerate', {
        method: 'POST',
        body: JSON.stringify({ code: recoveryRegenerateCode }),
      })
      await reloadSession()
      setRecoveryRegenerateCode('')
      setRecoveryCodes(data.recovery_codes ?? [])
      setInfoMessage('Recovery codes baru sudah dibuat. Semua recovery code lama sekarang tidak berlaku.')
    } catch (error) {
      const apiError = error as APIError
      setErrorMessage(apiError.message)
    } finally {
      setIsRegeneratingRecovery(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Multi-Factor Authentication"
      title="Lindungi akses dashboard dengan Google Authenticator."
      body="Session dashboard diverifikasi dengan TOTP. Di production, langkah ini wajib sebelum store, transaksi, audit, dan webhook bisa diakses."
      alternateLabel="Butuh keluar dari sesi ini?"
      alternateHref="/login"
      alternateAction="Kembali ke login"
    >
      <div className="grid gap-2">
        <h2 className="text-2xl font-bold tracking-[-0.04em] text-stone-950 dark:text-stone-50">MFA Security Check</h2>
        <p className="text-sm leading-6 text-stone-600 dark:text-stone-400">
          Akun: <strong>{user?.email}</strong>
        </p>
      </div>

      <div className="grid gap-3 rounded-[1.5rem] border border-stone-200/70 bg-stone-50/80 p-4 dark:border-white/10 dark:bg-white/5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={mfa?.required ? 'warning' : 'secondary'}>
            {mfa?.required ? 'Production: wajib verifikasi' : 'Development: opsional'}
          </Badge>
          <Badge variant={mfa?.enabled ? 'success' : 'secondary'}>
            {mfa?.enabled ? 'Authenticator aktif' : 'Authenticator belum aktif'}
          </Badge>
          <Badge variant={mfa?.verified ? 'success' : 'warning'}>
            {mfa?.verified ? 'Sesi ini terverifikasi' : 'Sesi ini belum terverifikasi'}
          </Badge>
        </div>

        <p className="text-sm leading-6 text-stone-600 dark:text-stone-400">
          {mfa?.required
            ? 'Karena APP_ENV=production, dashboard penuh baru bisa diakses setelah secret TOTP aktif dan kode saat ini valid.'
            : 'Karena APP_ENV=development, dashboard tetap bisa diakses tanpa kode. Halaman ini tetap tersedia untuk uji alur MFA.'}
        </p>

        {mfa?.enabled ? (
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-stone-500 dark:text-stone-400">
            Recovery codes terakhir dibuat: {formatRecoveryTimestamp(mfa.recovery_codes_regenerated_at)}
          </p>
        ) : null}
      </div>

      {errorMessage ? (
        <p className="rounded-2xl border border-red-300/70 bg-red-500/10 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:text-red-300">
          {errorMessage}
        </p>
      ) : null}

      {infoMessage ? (
        <p className="rounded-2xl border border-emerald-300/70 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-500/30 dark:text-emerald-300">
          {infoMessage}
        </p>
      ) : null}

      {setup ? (
        <div className="grid gap-4 rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/8 p-4 dark:border-emerald-400/20 dark:bg-emerald-400/10">
          <div className="grid gap-2">
            <div className="flex items-center gap-2">
              <Smartphone className="size-4 text-emerald-700 dark:text-emerald-300" />
              <strong className="text-sm text-stone-950 dark:text-stone-50">Scan QR dengan Google Authenticator</strong>
            </div>
            <p className="text-sm leading-6 text-stone-600 dark:text-stone-400">
              Anda bisa scan QR ini langsung, atau copy secret manual jika scanner tidak tersedia.
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
            <div className="rounded-3xl border border-stone-200/70 bg-white p-4 dark:border-white/10 dark:bg-stone-950">
              {qrCodeDataURL ? (
                <img alt="MFA QR Code" className="mx-auto h-auto w-full max-w-[180px]" src={qrCodeDataURL} />
              ) : (
                <div className="flex min-h-[180px] items-center justify-center text-stone-400 dark:text-stone-500">
                  <QrCode className="size-10" />
                </div>
              )}
            </div>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500 dark:text-stone-400">
                  Manual Entry Key
                </span>
                <div className="flex flex-col gap-2 rounded-2xl bg-stone-950 p-3 text-stone-100 dark:bg-stone-900 sm:flex-row sm:items-center sm:justify-between">
                  <code className="overflow-x-auto text-xs">{setup.secret}</code>
                  <Button
                    onClick={() => void navigator.clipboard.writeText(setup.secret)}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    <Copy className="size-4" />
                    Copy
                  </Button>
                </div>
              </div>

              <div className="grid gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500 dark:text-stone-400">
                  OTPAuth URI
                </span>
                <div className="flex flex-col gap-2 rounded-2xl border border-stone-200/70 bg-white/70 p-3 dark:border-white/10 dark:bg-black/20">
                  <code className="overflow-x-auto text-xs text-stone-700 dark:text-stone-200">{setup.otpauth_url}</code>
                  <Button
                    className="w-fit"
                    onClick={() => void navigator.clipboard.writeText(setup.otpauth_url)}
                    size="sm"
                    type="button"
                    variant="secondary"
                  >
                    <Copy className="size-4" />
                    Copy URI
                  </Button>
                </div>
              </div>

              <Button disabled={isLoadingSetup} onClick={() => void loadSetup(Boolean(mfa?.enabled))} type="button" variant="outline">
                {isLoadingSetup ? 'Memuat ulang…' : mfa?.enabled ? 'Regenerate secret baru' : 'Regenerate secret'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {(needsVerification || setup) ? (
        <form className="grid gap-5" onSubmit={handleVerify}>
          <div className="grid gap-2">
            <Label htmlFor="mfa-code">Kode TOTP atau recovery code</Label>
            <Input
              autoComplete="one-time-code"
              id="mfa-code"
              name="code"
              onChange={(event) => setCode(event.target.value.toUpperCase())}
              placeholder="123456 atau ABCD-EFGH"
              required
              value={code}
            />
          </div>

          <Button className="h-11 rounded-2xl" disabled={isSubmitting || code.trim().length < 6} type="submit">
            {isSubmitting ? 'Memverifikasi…' : setup ? 'Aktifkan atau selesaikan rotasi MFA' : 'Verifikasi sesi'}
          </Button>
        </form>
      ) : null}

      {recoveryCodes.length > 0 ? (
        <div className="grid gap-4 rounded-[1.5rem] border border-amber-500/20 bg-amber-500/8 p-4 dark:border-amber-400/20 dark:bg-amber-400/10">
          <div className="grid gap-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="size-4 text-amber-700 dark:text-amber-300" />
              <strong className="text-sm text-stone-950 dark:text-stone-50">Recovery Codes</strong>
            </div>
            <p className="text-sm leading-6 text-stone-600 dark:text-stone-400">
              Simpan di password manager atau tempat aman. Setiap code hanya bisa dipakai sekali untuk menggantikan kode TOTP.
            </p>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">
              Terakhir dibuat: {formatRecoveryTimestamp(mfa?.recovery_codes_regenerated_at)}
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            {recoveryCodes.map((recoveryCode) => (
              <code
                className="rounded-2xl border border-stone-200/70 bg-white/80 px-3 py-2 text-sm text-stone-900 dark:border-white/10 dark:bg-black/20 dark:text-stone-100"
                key={recoveryCode}
              >
                {prettyRecoveryCode(recoveryCode)}
              </code>
            ))}
          </div>

          <Button
            className="w-fit"
            onClick={() => void navigator.clipboard.writeText(recoveryCodes.join('\n'))}
            type="button"
            variant="secondary"
          >
            <Copy className="size-4" />
            Copy semua recovery codes
          </Button>
        </div>
      ) : null}

      {mfa?.enabled && mfa.verified ? (
        <div className="grid gap-4 rounded-[1.5rem] border border-emerald-500/20 bg-emerald-500/8 p-4 dark:border-emerald-400/20 dark:bg-emerald-400/10">
          <div className="grid gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-emerald-700 dark:text-emerald-300" />
              <strong className="text-sm text-stone-950 dark:text-stone-50">MFA aktif untuk akun ini</strong>
            </div>
            <p className="text-sm leading-6 text-stone-600 dark:text-stone-400">
              Anda bisa kembali ke dashboard, memutar secret MFA, atau menonaktifkan MFA dengan kode TOTP aktif atau salah satu recovery code.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              className="inline-flex h-10 items-center justify-center rounded-xl bg-stone-950 px-4 text-sm font-semibold text-white dark:bg-white dark:text-stone-950"
              to="/app"
            >
              Buka Dashboard
            </Link>
            <Button disabled={isLoadingSetup} onClick={() => void loadSetup(true)} type="button" variant="outline">
              {isLoadingSetup ? 'Menyiapkan rotasi…' : 'Rotate secret MFA'}
            </Button>
            <Button onClick={() => void logout()} type="button" variant="secondary">
              Logout
            </Button>
          </div>

          <form className="grid gap-4 rounded-[1.25rem] border border-stone-200/70 bg-white/70 p-4 dark:border-white/10 dark:bg-black/20" onSubmit={handleRegenerateRecoveryCodes}>
            <div className="grid gap-2">
              <strong className="text-sm text-stone-950 dark:text-stone-50">Regenerate recovery codes</strong>
              <p className="text-sm leading-6 text-stone-600 dark:text-stone-400">
                Masukkan kode TOTP aktif atau satu recovery code yang belum dipakai. Delapan recovery code baru akan dibuat dan seluruh code lama langsung dicabut.
              </p>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="recovery-regenerate-code">Kode konfirmasi</Label>
              <Input
                id="recovery-regenerate-code"
                name="recovery-regenerate-code"
                onChange={(event) => setRecoveryRegenerateCode(event.target.value.toUpperCase())}
                placeholder="123456 atau ABCD-EFGH"
                required
                value={recoveryRegenerateCode}
              />
            </div>

            <Button
              className="w-fit"
              disabled={isRegeneratingRecovery || recoveryRegenerateCode.trim().length < 6}
              type="submit"
              variant="outline"
            >
              {isRegeneratingRecovery ? 'Membuat ulang…' : 'Generate recovery codes baru'}
            </Button>
          </form>
        </div>
      ) : null}

      {mfa?.enabled ? (
        <form className="grid gap-5 rounded-[1.5rem] border border-red-500/20 bg-red-500/8 p-4 dark:border-red-400/20 dark:bg-red-400/10" onSubmit={handleDisable}>
          <div className="grid gap-2">
            <strong className="text-sm text-stone-950 dark:text-stone-50">Nonaktifkan MFA</strong>
            <p className="text-sm leading-6 text-stone-600 dark:text-stone-400">
              Masukkan kode TOTP aktif atau recovery code yang belum dipakai untuk menonaktifkan MFA.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="disable-mfa-code">Kode konfirmasi</Label>
            <Input
              id="disable-mfa-code"
              name="disable-code"
              onChange={(event) => setDisableCode(event.target.value.toUpperCase())}
              placeholder="123456 atau ABCD-EFGH"
              required
              value={disableCode}
            />
          </div>

          <Button className="w-fit" disabled={isDisabling || disableCode.trim().length < 6} type="submit" variant="destructive">
            {isDisabling ? 'Menonaktifkan…' : 'Disable MFA'}
          </Button>
        </form>
      ) : null}

      {!needsSetup && !needsVerification && !mfa?.enabled ? (
        <div className="grid gap-3 rounded-[1.5rem] border border-stone-200/70 bg-stone-50/80 p-4 dark:border-white/10 dark:bg-white/5">
          <strong className="text-sm text-stone-950 dark:text-stone-50">MFA belum diaktifkan.</strong>
          <p className="text-sm leading-6 text-stone-600 dark:text-stone-400">
            Jika Anda ingin menguji flow Google Authenticator sekarang, generate secret TOTP dari halaman ini.
          </p>
          <Button className="w-fit" disabled={isLoadingSetup} onClick={() => void loadSetup()} type="button" variant="outline">
            {isLoadingSetup ? 'Menyiapkan secret…' : 'Mulai setup MFA'}
          </Button>
        </div>
      ) : null}
    </AuthShell>
  )
}
