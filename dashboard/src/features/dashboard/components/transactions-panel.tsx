import type { FormEvent } from 'react'
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect } from '@/components/ui/native-select'
import { DashboardCallout } from '@/features/dashboard/components/dashboard-callout'
import {
  DashboardMobileSummaryGrid,
  DashboardMobileSummaryItem,
} from '@/features/dashboard/components/dashboard-mobile-summary'
import { DashboardDataTable } from '@/features/dashboard/components/dashboard-data-table'
import { DashboardPanelCard } from '@/features/dashboard/components/dashboard-panel-card'
import { DashboardStatusBadge } from '@/features/dashboard/components/dashboard-status-badge'
import type { DashboardTransaction, FilterOption, PaginationMeta } from '@/features/dashboard/types'

type TransactionsPanelProps = {
  onClearTransaction: () => void
  isDetailLoading: boolean
  isLoading: boolean
  meta: PaginationMeta
  onLoadTransaction: (transactionId: string) => void
  onPageChange: (direction: 'prev' | 'next') => void
  onQueryDraftChange: (value: string) => void
  onResetFilters: () => void
  onSearch: (event: FormEvent<HTMLFormElement>) => void
  onStatusChange: (value: string) => void
  prettyJSON: (value: unknown) => string
  queryDraft: string
  selectedTransaction: DashboardTransaction | null
  statusFilter: string
  statusOptions: readonly FilterOption[]
  transactions: DashboardTransaction[]
  formatCurrency: (amount: number, currency: string) => string
  formatDate: (value?: string | null) => string
}

const transactionColumnHelper = createColumnHelper<DashboardTransaction>()

function TransactionMobileCard({
  formatCurrency,
  formatDate,
  onLoadTransaction,
  transaction,
}: {
  formatCurrency: (amount: number, currency: string) => string
  formatDate: (value?: string | null) => string
  onLoadTransaction: (transactionId: string) => void
  transaction: DashboardTransaction
}) {
  return (
    <Card size="sm">
      <CardContent className="grid gap-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="grid min-w-0 gap-1">
            <strong className="break-all text-sm text-foreground">{transaction.order_id}</strong>
            <p className="text-xs leading-5 text-muted-foreground break-all">{transaction.platform_order_id}</p>
          </div>
          <DashboardStatusBadge status={transaction.status} />
        </div>

        <DashboardMobileSummaryGrid>
          <DashboardMobileSummaryItem label="Jumlah">
            {formatCurrency(transaction.gross_amount, transaction.currency)}
          </DashboardMobileSummaryItem>
          <DashboardMobileSummaryItem label="Metode Bayar">{transaction.payment_type}</DashboardMobileSummaryItem>
          <DashboardMobileSummaryItem label="Diperbarui" className="sm:col-span-2">
            {formatDate(transaction.updated_at)}
          </DashboardMobileSummaryItem>
        </DashboardMobileSummaryGrid>

        <Button className="w-full sm:w-auto" onClick={() => onLoadTransaction(transaction.id)} type="button" variant="secondary">
          Lihat Detail
        </Button>
      </CardContent>
    </Card>
  )
}

export function TransactionsPanel({
  formatCurrency,
  formatDate,
  isDetailLoading,
  isLoading,
  meta,
  onClearTransaction,
  onLoadTransaction,
  onPageChange,
  onQueryDraftChange,
  onResetFilters,
  onSearch,
  onStatusChange,
  prettyJSON,
  queryDraft,
  selectedTransaction,
  statusFilter,
  statusOptions,
  transactions,
}: TransactionsPanelProps) {
  const paidTransactions = transactions.filter((transaction) => transaction.status === 'paid' || transaction.status === 'settlement')
  const pendingTransactions = transactions.filter((transaction) => transaction.status === 'pending' || transaction.status === 'challenge')
  const grossVolume = transactions.reduce((total, transaction) => total + transaction.gross_amount, 0)
  const columns = [
    transactionColumnHelper.display({
      id: 'order',
      header: 'Order',
      cell: ({ row }) => (
        <div>
          <strong>{row.original.order_id}</strong>
          <span>{row.original.platform_order_id}</span>
        </div>
      ),
    }),
    transactionColumnHelper.display({
      id: 'status',
      header: 'Status',
      cell: ({ row }) => <DashboardStatusBadge status={row.original.status} />,
    }),
    transactionColumnHelper.display({
      id: 'amount',
      header: 'Jumlah',
      cell: ({ row }) => formatCurrency(row.original.gross_amount, row.original.currency),
    }),
    transactionColumnHelper.accessor('payment_type', {
      header: 'Metode Bayar',
    }),
    transactionColumnHelper.display({
      id: 'updated_at',
      header: 'Diperbarui',
      cell: ({ row }) => formatDate(row.original.updated_at),
    }),
    transactionColumnHelper.display({
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }) => (
        <Button onClick={() => onLoadTransaction(row.original.id)} size="sm" type="button" variant="secondary">
          Detail
        </Button>
      ),
    }),
  ]

  return (
    <section className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-3">
        {[
          {
            label: 'Snapshot volume',
            value: formatCurrency(grossVolume, 'IDR'),
            copy: 'Total gross amount dari transaksi pada hasil filter saat ini.',
          },
          {
            label: 'Paid / settlement',
            value: String(paidTransactions.length),
            copy: 'Charge yang sudah selesai masuk ke lane berhasil.',
          },
          {
            label: 'Pending / challenge',
            value: String(pendingTransactions.length),
            copy: 'Charge yang masih menunggu customer atau status lanjutan.',
          },
        ].map((metric) => (
          <Card className="rounded-[1.7rem] border-border/70 bg-card/80 shadow-[0_24px_70px_-56px_rgba(15,23,42,0.48)]" key={metric.label}>
            <CardContent className="grid gap-3 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">{metric.label}</p>
              <strong className="text-3xl font-semibold tracking-[-0.06em] text-foreground">{metric.value}</strong>
              <p className="text-sm leading-6 text-muted-foreground">{metric.copy}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="dashboard-section-grid">
      <DashboardPanelCard eyebrow="Transaksi" title="Daftar transaksi store">
        <DashboardCallout
          description="Tab ini dipakai untuk membaca queue transaksi store secara cepat: volume, status, metode bayar, dan detail Midtrans tetap bisa dibuka tanpa meninggalkan workspace."
          title="Charge lane store aktif"
        />

        <form className="dashboard-form" onSubmit={onSearch}>
          <div className="grid gap-2">
            <Label htmlFor="transactions-query">Cari order</Label>
            <Input
              id="transactions-query"
              value={queryDraft}
              onChange={(event) => onQueryDraftChange(event.target.value)}
              placeholder="INV-2026-0001 atau store123_INV-2026-0001"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="transactions-status">Status</Label>
            <NativeSelect id="transactions-status" value={statusFilter} onChange={(event) => onStatusChange(event.target.value)}>
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
            Menampilkan {transactions.length === 0 ? 0 : meta.offset + 1}-{meta.offset + transactions.length} dari{' '}
            {meta.total} transaksi.
          </p>
          <p>Filter backend saat ini mendukung `status` dan pencarian `order_id` atau `platform_order_id`.</p>
        </div>

        {isLoading ? <p className="text-sm text-muted-foreground">Memuat transaksi…</p> : null}

        <DashboardDataTable
          columnTemplate="1.2fr 0.7fr 0.8fr 0.9fr 0.9fr auto"
          columns={columns as ColumnDef<DashboardTransaction, unknown>[]}
          data={transactions}
          emptyState="Tidak ada transaksi yang cocok."
          getRowId={(transaction) => transaction.id}
          renderMobileCard={(transaction) => (
            <TransactionMobileCard
              formatCurrency={formatCurrency}
              formatDate={formatDate}
              onLoadTransaction={onLoadTransaction}
              transaction={transaction}
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

      <DashboardPanelCard
        eyebrow="Detail Transaksi"
        title={selectedTransaction ? selectedTransaction.order_id : 'Pilih transaksi'}
      >
        {selectedTransaction ? (
          <div className="flex flex-wrap items-center gap-3">
            <DashboardStatusBadge status={selectedTransaction.status} />
            <Badge variant="outline">{selectedTransaction.payment_type}</Badge>
            <Badge variant="secondary">{formatCurrency(selectedTransaction.gross_amount, selectedTransaction.currency)}</Badge>
          </div>
        ) : null}

        {isDetailLoading ? <p className="text-sm text-muted-foreground">Memuat detail transaksi…</p> : null}
        {!selectedTransaction && !isDetailLoading ? (
          <p className="text-sm text-muted-foreground">Klik salah satu transaksi untuk melihat detailnya.</p>
        ) : null}
        {selectedTransaction ? (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <DashboardStatusBadge status={selectedTransaction.status} />
              <Button onClick={onClearTransaction} size="sm" type="button" variant="outline">
                Tutup Detail
              </Button>
            </div>

            <dl className="dashboard-definition-list">
              <div>
                <dt>ID Transaksi Midtrans</dt>
                <dd>{selectedTransaction.midtrans_transaction_id || '—'}</dd>
              </div>
              <div>
                <dt>Status Fraud</dt>
                <dd>{selectedTransaction.fraud_status || '—'}</dd>
              </div>
              <div>
                <dt>URL Callback</dt>
                <dd>{selectedTransaction.callback_url || '—'}</dd>
              </div>
              <div>
                <dt>Dibayar Pada</dt>
                <dd>{formatDate(selectedTransaction.paid_at)}</dd>
              </div>
            </dl>

            <div className="grid gap-2">
              <strong className="text-sm text-foreground">Metadata transaksi</strong>
              <pre className="dashboard-json-block">{prettyJSON(selectedTransaction.metadata)}</pre>
            </div>
          </>
        ) : null}
      </DashboardPanelCard>
      </div>
    </section>
  )
}
