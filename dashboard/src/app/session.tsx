import {
  useCallback,
  startTransition,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react'

import { env } from '@/lib/env'
import { SessionContext, type TokenPair, type User, type SessionContextValue, type APIError, type MfaState } from '@/app/use-session'

const storageKey = 'paygate-dashboard-session'

type StoredSession = {
  user: User
  tokens: TokenPair
  mfa: MfaState
}

function readStoredSession(): StoredSession | null {
  if (typeof window === 'undefined') {
    return null
  }

  const raw = window.localStorage.getItem(storageKey)
  if (!raw) {
    return null
  }

  try {
    return JSON.parse(raw) as StoredSession
  } catch {
    window.localStorage.removeItem(storageKey)
    return null
  }
}

function writeStoredSession(session: StoredSession | null) {
  if (typeof window === 'undefined') {
    return
  }

  if (!session) {
    window.localStorage.removeItem(storageKey)
    return
  }

  window.localStorage.setItem(storageKey, JSON.stringify(session))
}

async function parseResponse<T>(response: Response): Promise<T> {
  const payload = (await response.json().catch(() => null)) as
    | { success?: boolean; data?: T; error?: { code?: string; message?: string; request_id?: string } }
    | null

  if (!response.ok || payload?.success === false) {
    const error = new Error(payload?.error?.message ?? `Request failed with status ${response.status}`) as APIError
    error.statusCode = response.status
    error.code = payload?.error?.code
    error.requestId = payload?.error?.request_id
    throw error
  }

  return (payload?.data ?? null) as T
}

export function SessionProvider({ children }: PropsWithChildren) {
  const [initialSession] = useState<StoredSession | null>(() => readStoredSession())
  const [isReady, setIsReady] = useState(false)
  const [user, setUser] = useState<User | null>(() => initialSession?.user ?? null)
  const [mfa, setMfa] = useState<MfaState | null>(() => initialSession?.mfa ?? null)
  const [tokens, setTokens] = useState<TokenPair | null>(() => initialSession?.tokens ?? null)
  const refreshPromiseRef = useRef<Promise<TokenPair> | null>(null)
  const userRef = useRef<User | null>(initialSession?.user ?? null)

  const clearSession = useCallback(() => {
    userRef.current = null
    startTransition(() => {
      setUser(null)
      setMfa(null)
      setTokens(null)
    })
    writeStoredSession(null)
    void import('./query-client').then(({ queryClient }) => {
      queryClient.clear()
    })
  }, [])

  const applySession = useCallback((nextUser: User, nextTokens: TokenPair, nextMFA: MfaState) => {
    const nextSession = {
      user: nextUser,
      tokens: nextTokens,
      mfa: nextMFA,
    }

    userRef.current = nextUser
    startTransition(() => {
      setUser(nextUser)
      setMfa(nextMFA)
      setTokens(nextTokens)
    })
    writeStoredSession(nextSession)
  }, [])

  const refreshTokens = useCallback(async (): Promise<TokenPair> => {
    if (!tokens?.refresh_token) {
      throw new Error('Missing refresh token')
    }

    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current
    }

    const refreshPromise = fetch(new URL('/v1/dashboard/auth/refresh', env.apiBaseURL), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh_token: tokens.refresh_token,
      }),
    })
      .then((response) => parseResponse<{ tokens: TokenPair; mfa: MfaState }>(response))
      .then(({ tokens: nextTokens, mfa: nextMFA }) => {
        const currentUser = userRef.current

        if (!currentUser) {
          throw new Error('Missing current user')
        }

        applySession(currentUser, nextTokens, nextMFA)
        return nextTokens
      })
      .finally(() => {
        refreshPromiseRef.current = null
      })

    refreshPromiseRef.current = refreshPromise
    return refreshPromise
  }, [applySession, tokens])

  const apiFetch = useCallback(async <T,>(path: string, init?: RequestInit & { skipAuth?: boolean }): Promise<T> => {
    const request = async (bearerToken?: string) =>
      fetch(new URL(path, env.apiBaseURL), {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(init?.headers ?? {}),
          ...(bearerToken ? { Authorization: `Bearer ${bearerToken}` } : {}),
        },
      })

    const skipAuth = init?.skipAuth ?? false
    const firstResponse = await request(skipAuth ? undefined : tokens?.access_token)

    if (!skipAuth && firstResponse.status === 401 && tokens?.refresh_token) {
      try {
        const nextTokens = await refreshTokens()
        const retryResponse = await request(nextTokens.access_token)
        return parseResponse<T>(retryResponse)
      } catch (error) {
        clearSession()
        throw error
      }
    }

    return parseResponse<T>(firstResponse)
  }, [clearSession, refreshTokens, tokens])

  const reloadSession = useCallback(async (): Promise<MfaState> => {
    if (!tokens) {
      throw new Error('Missing active session')
    }

    const data = await apiFetch<{ user: User; mfa: MfaState }>('/v1/dashboard/me')
    applySession(data.user, tokens, data.mfa)
    return data.mfa
  }, [apiFetch, applySession, tokens])

  const login = useCallback(async (input: { email: string; password: string }) => {
    const data = await apiFetch<{ user: User; tokens: TokenPair; mfa: MfaState }>('/v1/dashboard/auth/login', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify(input),
    })

    applySession(data.user, data.tokens, data.mfa)
    return data.mfa
  }, [apiFetch, applySession])

  const register = useCallback(async (input: { name: string; email: string; password: string }) => {
    const data = await apiFetch<{ user: User; tokens: TokenPair; mfa: MfaState }>('/v1/dashboard/auth/register', {
      method: 'POST',
      skipAuth: true,
      body: JSON.stringify(input),
    })

    applySession(data.user, data.tokens, data.mfa)
    return data.mfa
  }, [apiFetch, applySession])

  const logout = useCallback(async () => {
    try {
      if (tokens?.access_token) {
        await apiFetch<void>('/v1/dashboard/auth/logout', {
          method: 'POST',
        })
      }
    } finally {
      clearSession()
    }
  }, [apiFetch, clearSession, tokens])

  useEffect(() => {
    let active = true
    const requestSession = async (accessToken: string) =>
      fetch(new URL('/v1/dashboard/me', env.apiBaseURL), {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      })

    const bootstrap = async () => {
      if (!initialSession?.tokens?.access_token) {
        if (active) {
          setIsReady(true)
        }
        return
      }

      try {
        let nextTokens = initialSession.tokens
        let sessionResponse = await requestSession(nextTokens.access_token)

        if (sessionResponse.status === 401 && nextTokens.refresh_token) {
          const refreshPayload = await fetch(new URL('/v1/dashboard/auth/refresh', env.apiBaseURL), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              refresh_token: nextTokens.refresh_token,
            }),
          }).then((response) => parseResponse<{ tokens: TokenPair }>(response))

          nextTokens = refreshPayload.tokens
          sessionResponse = await requestSession(nextTokens.access_token)
        }

        const currentSession = await parseResponse<{ user: User; mfa: MfaState }>(sessionResponse)
        if (!active) {
          return
        }

        applySession(currentSession.user, nextTokens, currentSession.mfa)
      } catch {
        if (active) {
          clearSession()
        }
      } finally {
        if (active) {
          setIsReady(true)
        }
      }
    }

    void bootstrap()

    return () => {
      active = false
    }
  }, [applySession, clearSession, initialSession])

  const value = useMemo<SessionContextValue>(
    () => ({
      isReady,
      isAuthenticated: Boolean(user && tokens),
      user,
      mfa,
      tokens,
      login,
      register,
      logout,
      reloadSession,
      apiFetch,
    }),
    [apiFetch, isReady, login, logout, mfa, register, reloadSession, tokens, user],
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}
