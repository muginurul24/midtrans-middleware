import { createBrowserRouter } from 'react-router-dom'

import {
  DashboardRouteElement,
  LandingRouteElement,
  LoginRouteElement,
  MFARouteElement,
  RegisterRouteElement,
} from '@/app/route-elements'
import { AppRouteErrorBoundary, NotFoundPage } from '@/app/route-error'
import { MFARoute, ProtectedRoute, PublicOnlyRoute, SessionGate } from '@/app/route-guards'

export const router = createBrowserRouter([
  {
    element: <SessionGate />,
    errorElement: <AppRouteErrorBoundary />,
    children: [
      {
        path: '/',
        element: <LandingRouteElement />,
      },
      {
        path: '*',
        element: <NotFoundPage />,
      },
      {
        element: <PublicOnlyRoute />,
        children: [
          {
            path: '/login',
            element: <LoginRouteElement />,
          },
          {
            path: '/register',
            element: <RegisterRouteElement />,
          },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: '/app',
            element: <DashboardRouteElement />,
          },
        ],
      },
      {
        element: <MFARoute />,
        children: [
          {
            path: '/mfa',
            element: <MFARouteElement />,
          },
        ],
      },
    ],
  },
])
