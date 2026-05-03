import { useState } from 'react'
import { Link } from 'react-router-dom'
import { LogOut, ShieldCheck } from 'lucide-react'

import type { User } from '@/app/use-session'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { ThemeToggle } from '@/components/theme-toggle'

type DashboardSiteHeaderProps = {
  activeTabLabel: string
  currentStoreName: string
  hasSelectedStore: boolean
  onLogout: () => Promise<void>
  user: User | null
}

function userInitials(user: User | null) {
  const source = user?.name?.trim() || user?.email?.trim() || 'PG'
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}

export function DashboardSiteHeader({
  activeTabLabel,
  currentStoreName,
  hasSelectedStore,
  onLogout,
  user,
}: DashboardSiteHeaderProps) {
  const [isLoggingOut, setIsLoggingOut] = useState(false)

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      await onLogout()
    } finally {
      setIsLoggingOut(false)
    }
  }

  return (
    <header className="shrink-0 border-b border-sidebar-border/70 bg-background/85 backdrop-blur">
      <div className="flex min-h-(--header-height) w-full flex-wrap items-start gap-3 px-4 py-3 lg:px-6">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <div className="flex shrink-0 items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator className="hidden data-[orientation=vertical]:h-4 sm:block" orientation="vertical" />
          </div>

          <div className="grid min-w-0 gap-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-border/70 bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {activeTabLabel}
              </span>
              <Badge className="shrink-0" variant={hasSelectedStore ? 'success' : 'secondary'}>
                {hasSelectedStore ? 'Store aktif' : 'Pilih store'}
              </Badge>
            </div>
            <h1
              className="max-w-[min(22rem,calc(100vw-9rem))] break-words text-sm font-semibold leading-5 text-foreground sm:max-w-[min(32rem,60vw)] sm:text-base"
              title={currentStoreName}
            >
              {currentStoreName}
            </h1>
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <ThemeToggle />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="h-10 gap-3 rounded-full px-2 sm:max-w-[18rem] sm:px-3" variant="outline">
                <Avatar className="size-8 rounded-full">
                  <AvatarFallback className="rounded-full">{userInitials(user)}</AvatarFallback>
                </Avatar>
                <div className="hidden min-w-0 text-left md:grid">
                  <span className="truncate text-sm font-medium text-foreground">
                    {user?.name ?? 'Pengguna Dashboard'}
                  </span>
                  <span className="truncate text-xs text-muted-foreground" title={user?.email ?? undefined}>
                    {user?.email ?? 'Tidak ada sesi aktif'}
                  </span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 max-w-[calc(100vw-2rem)]">
              <DropdownMenuLabel className="grid gap-1">
                <span className="truncate font-medium text-foreground">{user?.name ?? 'Pengguna Dashboard'}</span>
                <span className="truncate text-xs text-muted-foreground" title={user?.email ?? undefined}>
                  {user?.email ?? 'Tidak ada sesi aktif'}
                </span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link className="flex w-full items-center gap-2" to="/mfa">
                  <ShieldCheck className="size-4" />
                  Kelola MFA
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="gap-2"
                disabled={isLoggingOut}
                onClick={() => void handleLogout()}
                variant="destructive"
              >
                <LogOut className="size-4" />
                {isLoggingOut ? 'Keluar…' : 'Logout'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
