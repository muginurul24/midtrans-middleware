import {
  BookText,
  Copy,
  KeyRound,
  ReceiptText,
  ScrollText,
  Store,
  Webhook,
} from 'lucide-react'
import { Suspense, lazy, useState } from 'react'
import { Link } from 'react-router-dom'

import type { User } from '@/app/use-session'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar'
import { DashboardCallout } from '@/features/dashboard/components/dashboard-callout'
import { DashboardStatusBadge } from '@/features/dashboard/components/dashboard-status-badge'
import type { DashboardTab, Store as StoreRecord, StoreCreateForm } from '@/features/dashboard/types'

type DashboardAppSidebarProps = {
  activeTab: DashboardTab
  currentStoreName: string
  isCreatingStore: boolean
  isLoadingStores: boolean
  onCopySecret: (secret: string) => void
  onCreateStore: (values: StoreCreateForm) => Promise<boolean>
  onSelectStore: (storeId: string) => void
  onSelectTab: (tab: DashboardTab) => void
  revealedStoreSecret: { storeName: string; secret: string } | null
  selectedStoreId: string | null
  stores: StoreRecord[]
  tabOptions: Array<{ value: DashboardTab; label: string }>
  user: User | null
}

const tabIcons: Record<DashboardTab, typeof Store> = {
  overview: Store,
  tokens: KeyRound,
  transactions: ReceiptText,
  audit: ScrollText,
  webhooks: Webhook,
  docs: BookText,
}

const SidebarCreateStoreForm = lazy(() =>
  import('@/features/dashboard/components/sidebar-create-store-form').then((module) => ({ default: module.SidebarCreateStoreForm })),
)

function userInitials(user: User | null) {
  const source = user?.name?.trim() || user?.email?.trim() || 'PG'
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase()
  }

  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase()
}

export function DashboardAppSidebar({
  activeTab,
  currentStoreName,
  isCreatingStore,
  isLoadingStores,
  onCopySecret,
  onCreateStore,
  onSelectStore,
  onSelectTab,
  revealedStoreSecret,
  selectedStoreId,
  stores,
  tabOptions,
  user,
}: DashboardAppSidebarProps) {
  const [isCreateStoreFormOpen, setIsCreateStoreFormOpen] = useState(false)

  return (
    <Sidebar collapsible="offcanvas" variant="inset">
      <SidebarHeader className="gap-3 border-b border-sidebar-border/70 p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild size="lg">
              <Link to="/">
                <span className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  PG
                </span>
                <span className="grid flex-1 text-left">
                  <span className="font-semibold">PayGate Ops</span>
                  <span className="text-xs text-sidebar-foreground/70">Backoffice middleware</span>
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent className="gap-1 pb-4">
        <SidebarGroup>
          <SidebarGroupLabel>Ruang Kerja</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {tabOptions.map((item) => {
                const Icon = tabIcons[item.value]

                return (
                  <SidebarMenuItem key={item.value}>
                    <SidebarMenuButton
                      isActive={activeTab === item.value}
                      onClick={() => onSelectTab(item.value)}
                      tooltip={item.label}
                    >
                      <Icon />
                      <span>{item.label}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Store Aktif</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="rounded-2xl border border-sidebar-border/70 bg-sidebar-accent/40 px-3.5 py-3.5 text-sm">
              <div className="break-words font-medium text-sidebar-foreground" title={currentStoreName}>
                {currentStoreName}
              </div>
              <p className="mt-1 text-xs leading-5 text-sidebar-foreground/70">
                Pilih tenant dari direktori di bawah untuk membuka token, transaksi, audit, dan webhook miliknya.
              </p>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Direktori Store</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {isLoadingStores ? (
                <>
                  <SidebarMenuSkeleton showIcon />
                  <SidebarMenuSkeleton showIcon />
                  <SidebarMenuSkeleton showIcon />
                </>
              ) : null}

              {!isLoadingStores && stores.length === 0 ? (
                <div className="rounded-xl border border-dashed border-sidebar-border/70 px-3 py-3 text-xs leading-5 text-sidebar-foreground/70">
                  Belum ada store. Buat store pertama dari form di bawah.
                </div>
              ) : null}

              {stores.map((store) => (
                <SidebarMenuItem key={store.id}>
                  <SidebarMenuButton isActive={store.id === selectedStoreId} onClick={() => onSelectStore(store.id)} size="lg">
                    <Store />
                    <div className="grid flex-1 text-left leading-tight">
                      <span className="truncate font-medium" title={store.name}>
                        {store.name}
                      </span>
                      <span className="truncate text-[11px] text-sidebar-foreground/70" title={store.slug}>
                        {store.slug}
                      </span>
                    </div>
                    <DashboardStatusBadge status={store.status} />
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>Buat Store</SidebarGroupLabel>
          <SidebarGroupContent>
            <div className="grid gap-3 px-2">
              <Button
                aria-expanded={isCreateStoreFormOpen}
                className="w-full"
                onClick={() => setIsCreateStoreFormOpen((current) => !current)}
                size="sm"
                type="button"
                variant={isCreateStoreFormOpen ? 'secondary' : 'outline'}
              >
                {isCreateStoreFormOpen ? 'Tutup Form Store' : 'Buka Form Store'}
              </Button>

              {isCreateStoreFormOpen ? (
                <Suspense
                  fallback={
                    <div className="rounded-xl border border-dashed border-sidebar-border/70 px-3 py-3 text-xs leading-5 text-sidebar-foreground/70">
                      Form pembuatan store dimuat terpisah agar shell dashboard muncul lebih cepat.
                    </div>
                  }
                >
                  <SidebarCreateStoreForm isCreatingStore={isCreatingStore} onCreateStore={onCreateStore} />
                </Suspense>
              ) : (
                <DashboardCallout
                  className="border-sidebar-border/70 bg-sidebar-accent/40 text-sidebar-foreground"
                  description="Buka form ini hanya saat Anda benar-benar perlu menambah tenant baru. Direktori store dan tab workspace tetap siap dipakai tanpa memuat validator form."
                  title={stores.length === 0 ? 'Belum ada tenant. Mulai dari form ini saat siap.' : 'Form create-store dimuat sesuai kebutuhan.'}
                />
              )}
            </div>

            {revealedStoreSecret ? (
              <div className="dashboard-reveal-card mx-2 mt-3 gap-2 rounded-xl p-3">
                <Badge variant="success" className="w-fit">
                  Secret Baru
                </Badge>
                <strong className="text-xs text-sidebar-foreground">{revealedStoreSecret.storeName}</strong>
                <code className="overflow-x-auto break-all rounded-lg bg-sidebar px-2 py-2 text-[11px] text-sidebar-foreground">
                  {revealedStoreSecret.secret}
                </code>
                <Button className="w-full" onClick={() => onCopySecret(revealedStoreSecret.secret)} size="sm" type="button" variant="secondary">
                  <Copy className="size-4" />
                  Salin secret
                </Button>
              </div>
            ) : null}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border/70 p-3">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              <Avatar className="size-8 shrink-0 rounded-lg">
                <AvatarFallback className="rounded-lg">{userInitials(user)}</AvatarFallback>
              </Avatar>
              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">{user?.name ?? 'Pengguna Dashboard'}</span>
                <span className="truncate text-xs text-sidebar-foreground/70" title={user?.email ?? undefined}>
                  {user?.email ?? 'Tidak ada sesi aktif'}
                </span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
