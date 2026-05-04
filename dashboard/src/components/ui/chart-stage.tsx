import { useEffect, useState, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

export function ChartStage({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setIsReady(true)
    })

    return () => {
      window.cancelAnimationFrame(frame)
    }
  }, [])

  return (
    <div className={cn('min-w-0', className)}>
      {isReady ? children : <div className="h-full w-full animate-pulse rounded-[inherit] bg-muted/35" />}
    </div>
  )
}
