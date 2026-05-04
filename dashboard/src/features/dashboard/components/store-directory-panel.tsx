import { useDeferredValue, useState } from 'react'
import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { DashboardCallout } from '@/features/dashboard/components/dashboard-callout'
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

export function StoreDirectoryPanel({
  formatDate,
  onOpenStore,
  selectedStoreId,
  stores,
}: StoreDirectoryPanelProps) {
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | Store['status']>('all')
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
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nama, slug, domain, callback, atau store ID"
              value={query}
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="store-directory-status">Status</Label>
            <NativeSelect id="store-directory-status" onChange={(event) => setStatusFilter(event.target.value as 'all' | Store['status'])} value={statusFilter}>
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
              }}
              type="button"
              variant="outline"
            >
              Reset Filter
            </Button>
          </div>
        </form>

        <p className="text-sm text-muted-foreground">
          Menampilkan {filteredStores.length} dari {stores.length} store.
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
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredStores.map((store) => {
              const isActive = store.id === selectedStoreId

              return (
                <DashboardPanelCard
                  description="Ringkasan cepat tenant untuk membantu operator memilih workspace yang benar."
                  eyebrow={store.slug}
                  headerAction={<DashboardStatusBadge status={store.status} />}
                  key={store.id}
                  title={store.name}
                >
                  <DashboardMobileSummaryGrid>
                    <DashboardMobileSummaryItem label="Store ID" className="sm:col-span-2">
                      {store.id}
                    </DashboardMobileSummaryItem>
                    <DashboardMobileSummaryItem label="Domain">{store.domain || '—'}</DashboardMobileSummaryItem>
                    <DashboardMobileSummaryItem label="Callback">{store.default_callback_url || '—'}</DashboardMobileSummaryItem>
                  </DashboardMobileSummaryGrid>

                  <dl className="dashboard-definition-list">
                    <div>
                      <dt>Dibuat</dt>
                      <dd>{formatDate(store.created_at)}</dd>
                    </div>
                    <div>
                      <dt>Diupdate</dt>
                      <dd>{formatDate(store.updated_at)}</dd>
                    </div>
                  </dl>

                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button className="w-full sm:w-auto" onClick={() => onOpenStore(store.id)} type="button">
                      {isActive ? 'Buka Store Aktif' : 'Buka Pengaturan Store'}
                    </Button>
                  </div>
                </DashboardPanelCard>
              )
            })}
          </div>
        )}
      </DashboardPanelCard>
    </section>
  )
}
