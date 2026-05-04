import { createColumnHelper, type ColumnDef } from '@tanstack/react-table'
import { useDeferredValue, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Bar, BarChart, CartesianGrid, Cell, Tooltip, XAxis } from 'recharts'
import { ArrowRight, SearchCheck, Store as StoreIcon } from 'lucide-react'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ChartStage } from '@/components/ui/chart-stage'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { DashboardCallout } from '@/features/dashboard/components/dashboard-callout'
import { DashboardDataTable } from '@/features/dashboard/components/dashboard-data-table'
import {
  DashboardMobileSummaryGrid,
  DashboardMobileSummaryItem,
} from '@/features/dashboard/components/dashboard-mobile-summary'
import { DashboardPanelCard } from '@/features/dashboard/components/dashboard-panel-card'
import { DashboardStatusBadge } from '@/features/dashboard/components/dashboard-status-badge'
import { buildStoreStatusDistribution, formatCompactNumber } from '@/features/dashboard/insights'
import type { Store } from '@/features/dashboard/types'
import { cn } from '@/lib/utils'

type StoreDirectoryPanelProps = {
  formatDate: (value?: string | null) => string
  onOpenStore: (storeId: string) => void
  selectedStoreId: string | null
  stores: Store[]
}

const storeColumnHelper = createColumnHelper<Store>()
const storeDirectoryPageSize = 6

function StoreDirectoryMobileCard({
  formatDate,
  onOpenStore,
  selectedStoreId,
  store,
}: {
  formatDate: (value?: string | null) => string
  onOpenStore: (storeId: string) => void
  selectedStoreId: string | null
  store: Store
}) {
  const isActive = store.id === selectedStoreId

  return (
    <Card className="rounded-[1.7rem] border-border/70 bg-card/80" size="sm">
      <CardContent className="grid gap-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="grid min-w-0 gap-1">
            <strong className="break-all text-sm text-foreground">{store.name}</strong>
            <code className="break-all text-xs leading-5 text-muted-foreground">{store.slug}</code>
          </div>
          <DashboardStatusBadge status={store.status} />
        </div>

        <DashboardMobileSummaryGrid>
          <DashboardMobileSummaryItem className="sm:col-span-2" label="Store ID">
            {store.id}
          </DashboardMobileSummaryItem>
          <DashboardMobileSummaryItem label="Domain">{store.domain || '—'}</DashboardMobileSummaryItem>
          <DashboardMobileSummaryItem label="Callback">{store.default_callback_url || '—'}</DashboardMobileSummaryItem>
          <DashboardMobileSummaryItem label="Diupdate">{formatDate(store.updated_at)}</DashboardMobileSummaryItem>
        </DashboardMobileSummaryGrid>

        <Button className="w-full sm:w-auto" onClick={() => onOpenStore(store.id)} type="button" variant="secondary">
          {isActive ? 'Buka Store Aktif' : 'Masuk ke Store'}
        </Button>
      </CardContent>
    </Card>
  )
}

export function StoreDirectoryPanel({
  formatDate,
  onOpenStore,
  selectedStoreId,
  stores,
}: StoreDirectoryPanelProps) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | Store['status']>('all')
  const [page, setPage] = useState(0)
  const deferredQuery = useDeferredValue(query)
  const normalizedQuery = deferredQuery.trim().toLowerCase()

  const filteredStores = stores.filter((store) => {
    if (statusFilter !== 'all' && store.status !== statusFilter) {
      return false
    }

    if (!normalizedQuery) {
      return true
    }

    const haystack = [store.name, store.slug, store.domain ?? '', store.default_callback_url ?? '', store.id].join(' ').toLowerCase()
    return haystack.includes(normalizedQuery)
  })
  const hasFilteredStores = filteredStores.length > 0
  const maxPage = hasFilteredStores ? Math.max(0, Math.ceil(filteredStores.length / storeDirectoryPageSize) - 1) : 0
  const currentPage = Math.min(page, maxPage)
  const paginatedStores = filteredStores.slice(currentPage * storeDirectoryPageSize, (currentPage + 1) * storeDirectoryPageSize)
  const rangeStart = paginatedStores.length === 0 ? 0 : currentPage * storeDirectoryPageSize + 1
  const rangeEnd = currentPage * storeDirectoryPageSize + paginatedStores.length
  const statusDistribution = useMemo(() => buildStoreStatusDistribution(stores), [stores])
  const columns = [
    storeColumnHelper.display({
      id: 'name',
      header: 'Store',
      cell: ({ row }) => (
        <div>
          <strong>{row.original.name}</strong>
          <span>{row.original.slug}</span>
        </div>
      ),
    }),
    storeColumnHelper.display({
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <DashboardStatusBadge status={row.original.status} />,
    }),
    storeColumnHelper.display({
      id: 'domain',
      header: 'Domain',
      cell: ({ row }) => row.original.domain || '—',
    }),
    storeColumnHelper.display({
      id: 'callback',
      header: 'Callback Default',
      cell: ({ row }) => row.original.default_callback_url || '—',
    }),
    storeColumnHelper.display({
      id: 'updated_at',
      header: 'Diupdate',
      cell: ({ row }) => formatDate(row.original.updated_at),
    }),
    storeColumnHelper.display({
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }) => (
        <Button onClick={() => onOpenStore(row.original.id)} size="sm" type="button" variant="secondary">
          {row.original.id === selectedStoreId ? 'Buka Store Aktif' : 'Masuk ke Store'}
        </Button>
      ),
    }),
  ]

  return (
    <section className="grid gap-6">
      <Card className="overflow-hidden rounded-[2.1rem] border-border/70 bg-[linear-gradient(180deg,color-mix(in_oklab,var(--chart-2)_8%,transparent),transparent)] shadow-[0_24px_70px_-56px_rgba(15,23,42,0.56)]">
        <CardHeader className="grid gap-6 p-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-end">
          <div className="grid gap-5">
            <Badge className="w-fit rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-primary">
              Store directory
            </Badge>
            <div className="grid gap-3">
              <CardTitle className="text-4xl font-semibold tracking-[-0.08em] text-foreground">Masuk ke tenant yang tepat lebih cepat</CardTitle>
              <CardDescription className="max-w-2xl text-base leading-8">
                Direktori store sekarang berfungsi seperti pintu masuk operasional: terlihat jelas tenant mana yang aktif,
                mana yang butuh perhatian, dan mana yang siap Anda buka untuk charge, audit, atau webhook.
              </CardDescription>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  label: 'Total tenant',
                  value: formatCompactNumber(stores.length),
                  copy: 'Jumlah store yang saat ini tercatat untuk akun ini.',
                },
                {
                  label: 'Aktif',
                  value: formatCompactNumber(stores.filter((store) => store.status === 'active').length),
                  copy: 'Tenant yang siap menerima charge dan webhook.',
                },
                {
                  label: 'Sesuai filter',
                  value: formatCompactNumber(filteredStores.length),
                  copy: 'Hasil saat ini setelah query dan status filter diterapkan.',
                },
              ].map((metric) => (
                <div key={metric.label} className="rounded-[1.55rem] border border-border/70 bg-card/82 p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{metric.label}</p>
                  <strong className="mt-3 block text-2xl font-semibold tracking-[-0.05em] text-foreground">{metric.value}</strong>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{metric.copy}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-border/70 bg-card/82 p-4">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Store posture</p>
                <strong className="mt-2 block text-2xl font-semibold tracking-[-0.05em] text-foreground">
                  {stores.length > 0 ? `${stores.filter((store) => store.status === 'active').length} tenant aktif` : 'Belum ada tenant'}
                </strong>
              </div>
              <StoreIcon className="size-5 text-primary" />
            </div>
            <ChartStage className="h-56">
              <BarChart data={statusDistribution} responsive style={{ width: '100%', height: '100%' }}>
                  <CartesianGrid stroke="color-mix(in oklab, var(--border) 86%, transparent)" vertical={false} />
                  <XAxis axisLine={false} dataKey="label" tickLine={false} />
                  <Tooltip />
                  <Bar barSize={48} dataKey="value" radius={[16, 16, 0, 0]}>
                    {statusDistribution.map((entry) => (
                      <Cell fill={entry.fill} key={entry.label} />
                    ))}
                  </Bar>
                </BarChart>
            </ChartStage>
          </div>
        </CardHeader>
      </Card>

      <DashboardPanelCard
        description="Cari tenant dengan cepat lalu masuk langsung ke page store settings sebagai titik awal workspace."
        eyebrow="Directory browser"
        headerAction={
          <Link className={cn(buttonVariants({ size: 'sm', variant: 'outline' }), 'rounded-full')} to="/app/stores/new">
            Buat Store Baru
          </Link>
        }
        title="Daftar tenant yang bisa Anda buka sekarang"
      >
        <DashboardCallout
          description="Pencarian ini dirancang untuk operator: nama store, slug, domain, callback, dan ID semuanya bisa dipakai sebagai entry point."
          title="Cari lalu lompat ke workspace store"
        />

        <form
          className="grid gap-3 rounded-[1.8rem] border border-border/70 bg-muted/25 p-4 md:grid-cols-[minmax(0,1fr)_14rem_auto]"
          onSubmit={(event) => event.preventDefault()}
        >
          <div className="grid gap-2">
            <Label htmlFor="store-directory-query">Cari store</Label>
            <Input
              id="store-directory-query"
              onChange={(event) => {
                setQuery(event.target.value)
                setPage(0)
              }}
              placeholder="Cari nama, slug, domain, callback, atau store ID"
              value={query}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="store-directory-status">Status</Label>
            <NativeSelect
              id="store-directory-status"
              onChange={(event) => {
                setStatusFilter(event.target.value as 'all' | Store['status'])
                setPage(0)
              }}
              value={statusFilter}
            >
              <NativeSelectOption value="all">Semua status</NativeSelectOption>
              <NativeSelectOption value="active">active</NativeSelectOption>
              <NativeSelectOption value="inactive">inactive</NativeSelectOption>
            </NativeSelect>
          </div>

          <div className="flex items-end">
            <Button
              className="w-full md:w-auto"
              onClick={() => {
                setQuery('')
                setStatusFilter('all')
                setPage(0)
              }}
              type="button"
              variant="outline"
            >
              Reset Filter
            </Button>
          </div>
        </form>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.4rem] border border-border/70 bg-card/72 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            Menampilkan {rangeStart === 0 ? 0 : `${rangeStart}-${rangeEnd}`} dari {filteredStores.length} store yang cocok.
            Total tenant terdaftar: {stores.length}.
          </p>
          <Badge variant="secondary" className="gap-2">
            <SearchCheck className="size-3.5" />
            Filter siap dipakai
          </Badge>
        </div>

        {stores.length === 0 ? (
          <DashboardCallout
            description="Belum ada tenant yang bisa dibuka. Lanjutkan ke page Buat Store untuk menyiapkan tenant pertama."
            title="Direktori masih kosong"
            tone="warning"
          />
        ) : filteredStores.length === 0 ? (
          <DashboardCallout
            description="Coba ubah kata kunci atau reset filter status untuk melihat tenant lain."
            title="Tidak ada store yang cocok dengan filter saat ini"
            tone="warning"
          />
        ) : (
          <>
            <DashboardDataTable
              columnTemplate="1.2fr 0.75fr 0.9fr 1.2fr 0.85fr auto"
              columns={columns as ColumnDef<Store, unknown>[]}
              data={paginatedStores}
              emptyState="Tidak ada store yang cocok."
              getRowId={(store) => store.id}
              renderMobileCard={(store) => (
                <StoreDirectoryMobileCard
                  formatDate={formatDate}
                  onOpenStore={onOpenStore}
                  selectedStoreId={selectedStoreId}
                  store={store}
                />
              )}
            />

            <div className="dashboard-form__actions justify-between">
              <p className="text-sm text-muted-foreground">
                Gunakan direktori ini sebagai titik masuk tercepat ke workspace store tertentu.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  disabled={currentPage === 0}
                  onClick={() => setPage((activePage) => Math.max(0, Math.min(activePage, maxPage) - 1))}
                  type="button"
                  variant="outline"
                >
                  Sebelumnya
                </Button>
                <Button
                  disabled={currentPage >= maxPage}
                  onClick={() => setPage((activePage) => Math.min(maxPage, Math.min(activePage, maxPage) + 1))}
                  type="button"
                  variant="secondary"
                >
                  Berikutnya
                  <ArrowRight className="size-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </DashboardPanelCard>
    </section>
  )
}
