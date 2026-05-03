import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'

function isPackageModule(id: string, packageName: string) {
  const normalized = id.replaceAll('\\', '/')
  const pnpmName = packageName.replaceAll('/', '+')

  return normalized.includes(`/node_modules/${packageName}/`) || normalized.includes(`/${pnpmName}@`)
}

function isPackagePrefix(id: string, packagePrefix: string) {
  const normalized = id.replaceAll('\\', '/')
  const pnpmPrefix = packagePrefix.replaceAll('/', '+')

  return normalized.includes(`/node_modules/${packagePrefix}/`) || normalized.includes(`/${pnpmPrefix}+`)
}

// https://vite.dev/config/
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return
          }

          if (id.includes('jsx-runtime') || id.includes('jsx-dev-runtime')) {
            return 'react-vendor'
          }

          if (
            isPackageModule(id, 'react-router-dom') ||
            isPackageModule(id, 'react-router') ||
            isPackageModule(id, '@tanstack/react-query') ||
            isPackageModule(id, '@tanstack/query-core')
          ) {
            return 'router-data-vendor'
          }

          if (isPackageModule(id, 'react') || isPackageModule(id, 'react-dom') || isPackageModule(id, 'scheduler')) {
            return 'react-vendor'
          }

          if (isPackageModule(id, 'radix-ui') || isPackagePrefix(id, '@radix-ui')) {
            return 'ui-vendor'
          }

          if (isPackageModule(id, 'qrcode')) {
            return 'qrcode-vendor'
          }
        },
      },
    },
  },
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
