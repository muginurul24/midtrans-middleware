import { Link } from 'react-router-dom'

import { Button } from '@/components/ui/button'
import { buttonVariants } from '@/components/ui/button-variants'
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

        {stores.length === 0 ? (
          <DashboardCallout
            description="Belum ada tenant yang bisa dibuka. Lanjutkan ke page Buat Store untuk menyiapkan tenant pertama."
            title="Direktori masih kosong"
            tone="warning"
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {stores.map((store) => {
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
