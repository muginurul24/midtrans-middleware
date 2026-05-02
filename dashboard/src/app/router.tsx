import { createBrowserRouter } from 'react-router-dom'

import { MFARoute, ProtectedRoute, PublicOnlyRoute, SessionGate } from '@/app/route-guards'
import { DashboardPage } from '@/routes/dashboard'
import { LandingPage } from '@/routes/landing'
import { LoginPage } from '@/routes/login'
import { MFAPage } from '@/routes/mfa'
import { RegisterPage } from '@/routes/register'

export const router = createBrowserRouter([
  {
    element: <SessionGate />,
    children: [
      {
        path: '/',
        element: <LandingPage />,
      },
      {
        element: <PublicOnlyRoute />,
        children: [
          {
            path: '/login',
            element: <LoginPage />,
          },
          {
            path: '/register',
            element: <RegisterPage />,
          },
        ],
      },
      {
        element: <ProtectedRoute />,
        children: [
          {
            path: '/app',
            element: <DashboardPage />,
          },
        ],
      },
      {
        element: <MFARoute />,
        children: [
          {
            path: '/mfa',
            element: <MFAPage />,
          },
        ],
      },
    ],
  },
])
