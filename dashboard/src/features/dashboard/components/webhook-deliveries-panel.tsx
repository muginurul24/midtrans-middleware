import type { FormEvent } from 'react'
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import {
  DashboardMobileSummaryGrid,
  DashboardMobileSummaryItem,
} from '@/features/dashboard/components/dashboard-mobile-summary'
import { DashboardDataTable } from '@/features/dashboard/components/dashboard-data-table'
import { DashboardPanelCard } from '@/features/dashboard/components/dashboard-panel-card'
import { DashboardStatusBadge } from '@/features/dashboard/components/dashboard-status-badge'
import type {
  FilterOption,
  PaginationMeta,
  WebhookDelivery,
  WebhookDeliveryDetail,
} from '@/features/dashboard/types'

type WebhookDeliveriesPanelProps = {
  deliveries: WebhookDelivery[]
  formatDate: (value?: string | null) => string
  isDetailLoading: boolean
  isLoading: boolean
  meta: PaginationMeta
  onLoadDelivery: (deliveryId: string) => void
  onPageChange: (direction: 'prev' | 'next') => void
  onQueryDraftChange: (value: string) => void
  onResetFilters: () => void
  onResendDelivery: (deliveryId: string) => void
  onSearch: (event: FormEvent<HTMLFormElement>) => void
  onStatusChange: (value: string) => void
  prettyJSON: (value: unknown) => string
  queryDraft: string
  selectedDelivery: WebhookDeliveryDetail | null
  statusFilter: string
  statusOptions: readonly FilterOption[]
}

const webhookDeliveryColumnHelper = createColumnHelper<WebhookDelivery>()

function WebhookDeliveryMobileCard({
  delivery,
  formatDate,
  onLoadDelivery,
}: {
  delivery: WebhookDelivery
  formatDate: (value?: string | null) => string
  onLoadDelivery: (deliveryId: string) => void
}) {
  return (
    <Card size="sm">
      <CardContent className="grid gap-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="grid min-w-0 gap-1">
            <strong className="break-all text-sm text-foreground">{delivery.order_id || delivery.id}</strong>
            <p className="text-xs leading-5 text-muted-foreground break-all">{delivery.event_type}</p>
          </div>
          <DashboardStatusBadge status={delivery.status} />
        </div>

        <DashboardMobileSummaryGrid>
          <DashboardMobileSummaryItem label="Percobaan">{delivery.attempt_count}</DashboardMobileSummaryItem>
          <DashboardMobileSummaryItem label="Diperbarui">
            {formatDate(delivery.updated_at)}
          </DashboardMobileSummaryItem>
          <DashboardMobileSummaryItem label="URL Callback" className="sm:col-span-2">
            {delivery.callback_url}
          </DashboardMobileSummaryItem>
        </DashboardMobileSummaryGrid>

        <Button className="w-full sm:w-auto" onClick={() => onLoadDelivery(delivery.id)} type="button" variant="secondary">
          Lihat Detail
        </Button>
      </CardContent>
    </Card>
  )
}

export function WebhookDeliveriesPanel({
  deliveries,
  formatDate,
  isDetailLoading,
  isLoading,
  meta,
  onLoadDelivery,
  onPageChange,
  onQueryDraftChange,
  onResetFilters,
  onResendDelivery,
  onSearch,
  onStatusChange,
  prettyJSON,
  queryDraft,
  selectedDelivery,
  statusFilter,
  statusOptions,
}: WebhookDeliveriesPanelProps) {
  const columns = [
    webhookDeliveryColumnHelper.display({
      id: 'order',
      header: 'Order',
      cell: ({ row }) => (
        <div>
          <strong>{row.original.order_id || row.original.id}</strong>
          <span>{row.original.event_type}</span>
        </div>
      ),
    }),
    webhookDeliveryColumnHelper.display({
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <DashboardStatusBadge status={row.original.status} />,
    }),
    webhookDeliveryColumnHelper.accessor('attempt_count', {
      header: 'Percobaan',
    }),
    webhookDeliveryColumnHelper.accessor('callback_url', {
      header: 'URL Callback',
    }),
    webhookDeliveryColumnHelper.display({
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }) => (
        <Button onClick={() => onLoadDelivery(row.original.id)} size="sm" type="button" variant="secondary">
          Detail
        </Button>
      ),
    }),
  ]

  return (
    <section className="dashboard-section-grid">
      <DashboardPanelCard eyebrow="Delivery Webhook" title="Monitoring callback ke backend store">
        <form className="dashboard-form" onSubmit={onSearch}>
          <div className="grid gap-2">
            <Label htmlFor="delivery-query">Cari delivery</Label>
            <Input
              id="delivery-query"
              value={queryDraft}
              onChange={(event) => onQueryDraftChange(event.target.value)}
              placeholder="INV-2026-0001, callback URL, atau delivery ID"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="delivery-status">Status</Label>
            <NativeSelect id="delivery-status" value={statusFilter} onChange={(event) => onStatusChange(event.target.value)}>
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </div>

          <div className="dashboard-form__actions">
            <Button type="submit" variant="secondary">
              Terapkan Filter
            </Button>
            <Button onClick={onResetFilters} type="button" variant="outline">
              Reset
            </Button>
          </div>
        </form>

        <div className="dashboard-note-card">
          <strong>Ringkasan hasil</strong>
          <p>
            Menampilkan {deliveries.length === 0 ? 0 : meta.offset + 1}-{meta.offset + deliveries.length} dari{' '}
            {meta.total} delivery.
          </p>
          <p>Filter backend saat ini mendukung `status` dan pencarian `order_id`, `callback_url`, atau `delivery_id`.</p>
        </div>

        {isLoading ? <p className="text-sm text-muted-foreground">Memuat delivery webhook…</p> : null}

        <DashboardDataTable
          columnTemplate="1.2fr 0.8fr 0.7fr 1.2fr auto"
          columns={columns as ColumnDef<WebhookDelivery, unknown>[]}
          data={deliveries}
          emptyState="Tidak ada delivery yang cocok."
          getRowId={(delivery) => delivery.id}
          renderMobileCard={(delivery) => (
            <WebhookDeliveryMobileCard
              delivery={delivery}
              formatDate={formatDate}
              onLoadDelivery={onLoadDelivery}
            />
          )}
        />

        <div className="dashboard-form__actions">
          <Button
            disabled={meta.offset === 0 || isLoading}
            onClick={() => onPageChange('prev')}
            type="button"
            variant="outline"
          >
            Sebelumnya
          </Button>
          <Button
            disabled={!meta.has_next || isLoading}
            onClick={() => onPageChange('next')}
            type="button"
            variant="secondary"
          >
            Berikutnya
          </Button>
        </div>
      </DashboardPanelCard>

      <DashboardPanelCard eyebrow="Detail Delivery" title={selectedDelivery?.delivery.id ?? 'Pilih delivery'}>
        {isDetailLoading ? <p className="text-sm text-muted-foreground">Memuat detail delivery…</p> : null}
        {!selectedDelivery && !isDetailLoading ? (
          <p className="text-sm text-muted-foreground">Klik salah satu delivery untuk melihat payload dan attempts.</p>
        ) : null}
        {selectedDelivery ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <DashboardStatusBadge status={selectedDelivery.delivery.status} />
            </div>

            <dl className="dashboard-definition-list">
              <div>
                <dt>Jumlah Percobaan</dt>
                <dd>{selectedDelivery.delivery.attempt_count}</dd>
              </div>
              <div>
                <dt>Terkirim Pada</dt>
                <dd>{formatDate(selectedDelivery.delivery.delivered_at)}</dd>
              </div>
              <div>
                <dt>Gagal Pada</dt>
                <dd>{formatDate(selectedDelivery.delivery.failed_at)}</dd>
              </div>
            </dl>

            {selectedDelivery.delivery.status === 'failed_permanently' ? (
              <Button onClick={() => onResendDelivery(selectedDelivery.delivery.id)} type="button">
                Kirim Ulang Manual
              </Button>
            ) : null}

            <pre className="dashboard-json-block">{prettyJSON(selectedDelivery.delivery.payload)}</pre>

            <div className="dashboard-attempt-list">
              {selectedDelivery.attempts.map((attempt) => (
                <article className="dashboard-attempt-card" key={attempt.id}>
                  <div className="dashboard-attempt-card__header">
                    <strong>Percobaan #{attempt.attempt_number}</strong>
                    <span>{formatDate(attempt.attempted_at)}</span>
                  </div>
                  <p>
                    status: {attempt.response_status ?? '—'} · durasi:{' '}
                    {typeof attempt.duration_ms === 'number' ? `${attempt.duration_ms} ms` : '—'}
                  </p>
                  {attempt.error_message ? <p className="form-message is-error">{attempt.error_message}</p> : null}
                  <pre className="dashboard-json-block">{prettyJSON(attempt.request_headers)}</pre>
                </article>
              ))}
            </div>
          </>
        ) : null}
      </DashboardPanelCard>
    </section>
  )
}
