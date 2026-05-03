import { lazy, Suspense, type ReactNode } from 'react'

import { RouteLoader } from '@/app/route-loader'

const DashboardPage = lazy(() => import('@/routes/dashboard').then((module) => ({ default: module.DashboardPage })))
const LandingPage = lazy(() => import('@/routes/landing').then((module) => ({ default: module.LandingPage })))
const LoginPage = lazy(() => import('@/routes/login').then((module) => ({ default: module.LoginPage })))
const MFAPage = lazy(() => import('@/routes/mfa').then((module) => ({ default: module.MFAPage })))
const RegisterPage = lazy(() => import('@/routes/register').then((module) => ({ default: module.RegisterPage })))

function RouteSuspense({ children }: { children: ReactNode }) {
  return <Suspense fallback={<RouteLoader />}>{children}</Suspense>
}

export function LandingRouteElement() {
  return (
    <RouteSuspense>
      <LandingPage />
    </RouteSuspense>
  )
}

export function LoginRouteElement() {
  return (
    <RouteSuspense>
      <LoginPage />
    </RouteSuspense>
  )
}

export function RegisterRouteElement() {
  return (
    <RouteSuspense>
      <RegisterPage />
    </RouteSuspense>
  )
}

export function DashboardRouteElement() {
  return (
    <RouteSuspense>
      <DashboardPage />
    </RouteSuspense>
  )
}

export function MFARouteElement() {
  return (
    <RouteSuspense>
      <MFAPage />
    </RouteSuspense>
  )
}
