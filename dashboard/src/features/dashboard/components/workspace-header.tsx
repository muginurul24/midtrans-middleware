import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button-variants'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { DashboardTab } from '@/features/dashboard/types'
import { cn } from '@/lib/utils'

type WorkspaceHeaderProps = {
  activeTab: DashboardTab
  activeTokensCount: number
  currentStoreName: string
  deliveriesCount: number
  onSelectTab: (tab: DashboardTab) => void
  storesCount: number
  tabOptions: Array<{ value: DashboardTab; label: string }>
  transactionsCount: number
}

function WorkspaceMetricCard({
  description,
  label,
  value,
}: {
  description: string
  label: string
  value: number
}) {
  return (
    <Card className="gap-3 bg-card/70" size="sm">
      <CardHeader className="gap-1">
        <CardDescription className="text-xs font-semibold uppercase tracking-[0.16em]">{label}</CardDescription>
        <CardTitle className="text-2xl font-black tracking-[-0.05em] sm:text-3xl">{value}</CardTitle>
      </CardHeader>
      <CardContent className="pt-0 text-sm text-muted-foreground">{description}</CardContent>
    </Card>
  )
}

export function WorkspaceHeader({
  activeTab,
  activeTokensCount,
  currentStoreName,
  deliveriesCount,
  onSelectTab,
  storesCount,
  tabOptions,
  transactionsCount,
}: WorkspaceHeaderProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="gap-4">
        <div className="grid gap-2">
          <Badge variant="secondary" className="w-fit">
            Ruang Kerja
          </Badge>
          <CardTitle className="break-words text-2xl sm:text-3xl" title={currentStoreName}>
            {currentStoreName}
          </CardTitle>
          <CardDescription>
            Kelola konfigurasi store, token, transaksi, audit, dan webhook relay dari satu tempat.
          </CardDescription>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <WorkspaceMetricCard description="Total tenant milik akun ini." label="Store" value={storesCount} />
          <WorkspaceMetricCard
            description="Token yang masih dapat dipakai oleh backend store."
            label="Token Aktif"
            value={activeTokensCount}
          />
          <WorkspaceMetricCard
            description="Snapshot transaksi terakhir untuk store yang dipilih."
            label="Transaksi"
            value={transactionsCount}
          />
          <WorkspaceMetricCard
            description="Riwayat delivery callback dan retry attempt."
            label="Delivery Webhook"
            value={deliveriesCount}
          />
        </div>

        <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 sm:pb-0">
          {tabOptions.map((item) => (
            <button
              className={cn(
                buttonVariants({ variant: activeTab === item.value ? 'default' : 'secondary', size: 'sm' }),
                'shrink-0 rounded-full',
              )}
              key={item.value}
              onClick={() => onSelectTab(item.value)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </CardHeader>
    </Card>
  )
}
