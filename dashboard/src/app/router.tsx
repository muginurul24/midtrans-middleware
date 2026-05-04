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
          {
            path: '/app/profile',
            element: <DashboardRouteElement />,
          },
          {
            path: '/app/stores/:storeId',
            element: <DashboardRouteElement />,
          },
          {
            path: '/app/stores/:storeId/tokens',
            element: <DashboardRouteElement />,
          },
          {
            path: '/app/stores/:storeId/transactions',
            element: <DashboardRouteElement />,
          },
          {
            path: '/app/stores/:storeId/transactions/:transactionId',
            element: <DashboardRouteElement />,
          },
          {
            path: '/app/stores/:storeId/audit',
            element: <DashboardRouteElement />,
          },
          {
            path: '/app/stores/:storeId/webhooks',
            element: <DashboardRouteElement />,
          },
          {
            path: '/app/stores/:storeId/webhooks/:deliveryId',
            element: <DashboardRouteElement />,
          },
          {
            path: '/app/stores/:storeId/docs',
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
