import { StrictMode, startTransition } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'

import { router } from '@/app/router'
import { SessionProvider } from '@/app/session'
import '@/styles/index.css'

const rootElement = document.getElementById('root')

if (rootElement) {
  startTransition(() => {
    createRoot(rootElement).render(
      <StrictMode>
        <SessionProvider>
          <RouterProvider router={router} />
        </SessionProvider>
      </StrictMode>,
    )
  })
}
