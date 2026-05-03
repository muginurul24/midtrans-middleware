import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react'

import {
  ThemeContext,
  applyResolvedTheme,
  getStoredMode,
  resolveMode,
  themeStorageKey,
  type ResolvedTheme,
  type ThemeContextValue,
  type ThemeMode,
} from '@/app/use-theme'

export function ThemeProvider({ children }: PropsWithChildren) {
  const [mode, setModeState] = useState<ThemeMode>(() => getStoredMode())
  const [resolvedMode, setResolvedMode] = useState<ResolvedTheme>(() => resolveMode(getStoredMode()))

  const setMode = useCallback((nextMode: ThemeMode) => {
    setModeState(nextMode)
  }, [])

  useEffect(() => {
    const syncTheme = () => {
      const nextResolvedMode = resolveMode(mode)
      applyResolvedTheme(nextResolvedMode)
      setResolvedMode(nextResolvedMode)
    }

    syncTheme()
    window.localStorage.setItem(themeStorageKey, mode)

    if (mode !== 'system') {
      return undefined
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      const nextResolvedMode = resolveMode('system')
      applyResolvedTheme(nextResolvedMode)
      setResolvedMode(nextResolvedMode)
    }

    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [mode])

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      resolvedMode,
      setMode,
    }),
    [mode, resolvedMode, setMode],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
