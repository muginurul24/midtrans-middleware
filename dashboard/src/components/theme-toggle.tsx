import { useEffect, useRef, useState } from 'react'

import { useTheme, type ThemeMode } from '@/app/use-theme'
import { CheckIcon, ChevronDownIcon, LaptopIcon, MoonIcon, SunIcon } from '@/components/app-icons'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const themeOptions: Array<{
  label: string
  value: ThemeMode
  icon: typeof SunIcon
}> = [
  { label: 'Terang', value: 'light', icon: SunIcon },
  { label: 'Gelap', value: 'dark', icon: MoonIcon },
  { label: 'Ikuti sistem', value: 'system', icon: LaptopIcon },
]

export function ThemeToggle({ className }: { className?: string }) {
  const { mode, resolvedMode, setMode } = useTheme()
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const ActiveIcon = resolvedMode === 'dark' ? MoonIcon : SunIcon

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen])

  return (
    <div className={cn('relative', className)} ref={containerRef}>
      <Button
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label="Ganti mode tampilan"
        className="rounded-full"
        onClick={() => setIsOpen((current) => !current)}
        title="Ganti mode tampilan"
        size="icon-sm"
        type="button"
        variant="outline"
      >
        <ActiveIcon className="size-4" />
        <ChevronDownIcon className="size-3.5 opacity-60" />
      </Button>

      {isOpen ? (
        <div
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 grid min-w-52 gap-1 rounded-2xl border border-border/70 bg-popover p-2 text-popover-foreground shadow-2xl ring-1 ring-foreground/5"
          role="menu"
        >
          <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
            Tampilan
          </div>

          {themeOptions.map((option) => {
            const Icon = option.icon

            return (
              <button
                className={cn(
                  'flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground',
                  mode === option.value ? 'bg-accent/70 text-accent-foreground' : 'text-foreground',
                )}
                key={option.value}
                onClick={() => {
                  setMode(option.value)
                  setIsOpen(false)
                }}
                role="menuitemradio"
                type="button"
              >
                <span className="flex items-center gap-2">
                  <Icon className="size-4" />
                  {option.label}
                </span>
                {mode === option.value ? <CheckIcon className="size-4 text-primary" /> : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
