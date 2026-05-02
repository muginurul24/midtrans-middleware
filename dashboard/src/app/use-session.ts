import { createContext, useContext } from 'react'

type User = {
  id: string
  name: string
  email: string
  role: string
  created_at: string
  updated_at: string
}

type MfaState = {
  required: boolean
  enabled: boolean
  verified: boolean
  setup_required: boolean
  can_access_dashboard: boolean
  recovery_codes_regenerated_at?: string | null
}

type TokenPair = {
  access_token: string
  refresh_token: string
  token_type: string
  access_expires_at: string
  refresh_expires_at: string
}

type APIError = Error & {
  statusCode?: number
  code?: string
  requestId?: string
}

type SessionContextValue = {
  isReady: boolean
  isAuthenticated: boolean
  user: User | null
  mfa: MfaState | null
  tokens: TokenPair | null
  login: (input: { email: string; password: string }) => Promise<MfaState>
  register: (input: { name: string; email: string; password: string }) => Promise<MfaState>
  logout: () => Promise<void>
  reloadSession: () => Promise<MfaState>
  apiFetch: <T>(path: string, init?: RequestInit & { skipAuth?: boolean }) => Promise<T>
}

const SessionContext = createContext<SessionContextValue | null>(null)

export function useSession() {
  const value = useContext(SessionContext)
  if (!value) {
    throw new Error('useSession must be used inside SessionProvider')
  }

  return value
}

export { SessionContext }
export type { APIError, MfaState, SessionContextValue, TokenPair, User }
