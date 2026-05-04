import { createColumnHelper, type ColumnDef } from '@tanstack/react-table'
import { useDeferredValue, useState } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Card, CardContent } from '@/components/ui/card'
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
    <Card size="sm">
      <CardContent className="grid gap-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="grid min-w-0 gap-1">
            <strong className="break-all text-sm text-foreground">{store.name}</strong>
            <code className="text-xs leading-5 text-muted-foreground break-all">{store.slug}</code>
          </div>
          <DashboardStatusBadge status={store.status} />
        </div>

        <DashboardMobileSummaryGrid>
          <DashboardMobileSummaryItem label="Store ID" className="sm:col-span-2">
            {store.id}
          </DashboardMobileSummaryItem>
          <DashboardMobileSummaryItem label="Domain">{store.domain || '—'}</DashboardMobileSummaryItem>
          <DashboardMobileSummaryItem label="Callback">{store.default_callback_url || '—'}</DashboardMobileSummaryItem>
          <DashboardMobileSummaryItem label="Diupdate">{formatDate(store.updated_at)}</DashboardMobileSummaryItem>
        </DashboardMobileSummaryGrid>

        <Button className="w-full sm:w-auto" onClick={() => onOpenStore(store.id)} type="button" variant="secondary">
          {isActive ? 'Buka Store Aktif' : 'Buka Pengaturan Store'}
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

    const haystack = [
      store.name,
      store.slug,
      store.domain ?? '',
      store.default_callback_url ?? '',
      store.id,
    ]
      .join(' ')
      .toLowerCase()

    return haystack.includes(normalizedQuery)
  })
  const hasFilteredStores = filteredStores.length > 0
  const maxPage = hasFilteredStores ? Math.max(0, Math.ceil(filteredStores.length / storeDirectoryPageSize) - 1) : 0
  const currentPage = Math.min(page, maxPage)
  const paginatedStores = filteredStores.slice(currentPage * storeDirectoryPageSize, (currentPage + 1) * storeDirectoryPageSize)
  const rangeStart = paginatedStores.length === 0 ? 0 : currentPage * storeDirectoryPageSize + 1
  const rangeEnd = currentPage * storeDirectoryPageSize + paginatedStores.length
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
          {row.original.id === selectedStoreId ? 'Buka Store Aktif' : 'Buka Pengaturan Store'}
        </Button>
      ),
    }),
  ]

  return (
    <section className="dashboard-section-grid">
      <DashboardPanelCard
        description="Gunakan page ini untuk melihat semua tenant yang tersedia sebelum masuk ke pengaturan, token, transaksi, audit, atau webhook milik store tertentu."
        eyebrow="Direktori Store"
        headerAction={
          <Link className={cn(buttonVariants({ size: 'sm', variant: 'outline' }))} to="/app/stores/new">
            Buat Store Baru
          </Link>
        }
        title="Daftar tenant yang tersedia"
      >
        <DashboardCallout
          description="Store yang sudah dipilih dari page ini akan dibuka ke page Pengaturan Store agar operator langsung melihat identitas tenant, callback default, dan credential webhook-nya."
          title={`${stores.length} store ditemukan`}
        />

        <form
          className="grid gap-3 rounded-3xl border border-border/70 bg-muted/25 p-4 md:grid-cols-[minmax(0,1fr)_14rem_auto]"
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

        <p className="text-sm text-muted-foreground">
          Menampilkan {rangeStart === 0 ? 0 : `${rangeStart}-${rangeEnd}`} dari {filteredStores.length} store yang cocok.
          Total tenant terdaftar: {stores.length}.
        </p>

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

            <div className="dashboard-form__actions">
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
              </Button>
            </div>
          </>
        )}
      </DashboardPanelCard>
    </section>
  )
}
