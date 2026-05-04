import type { FormEvent } from 'react'
import { createColumnHelper, type ColumnDef } from '@tanstack/react-table'

import { Badge } from '@/components/ui/badge'
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
import type { AuditLog, AuditLogFilters, FilterOption, PaginationMeta } from '@/features/dashboard/types'

type AuditLogsPanelProps = {
  auditLogs: AuditLog[]
  directionOptions: readonly FilterOption[]
  filters: AuditLogFilters
  formatDate: (value?: string | null) => string
  isLoading: boolean
  meta: PaginationMeta
  onFilterChange: (field: keyof AuditLogFilters, value: string) => void
  onPageChange: (direction: 'prev' | 'next') => void
  onResetFilters: () => void
  onSearch: (event: FormEvent<HTMLFormElement>) => void
  prettyJSON: (value: unknown) => string
  selectedAuditLog: AuditLog | null
  onSelectAuditLog: (auditLog: AuditLog) => void
}

const auditLogColumnHelper = createColumnHelper<AuditLog>()

function AuditLogMobileCard({
  auditLog,
  formatDate,
  onSelectAuditLog,
  selectedAuditLog,
}: {
  auditLog: AuditLog
  formatDate: (value?: string | null) => string
  onSelectAuditLog: (auditLog: AuditLog) => void
  selectedAuditLog: AuditLog | null
}) {
  return (
    <Card size="sm">
      <CardContent className="grid gap-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="grid min-w-0 gap-1">
            <strong className="break-all text-sm text-foreground">{auditLog.request_id}</strong>
            <p className="text-xs leading-5 text-muted-foreground">{auditLog.actor_type}</p>
          </div>
          <Badge variant="secondary">{auditLog.direction}</Badge>
        </div>

        <DashboardMobileSummaryGrid>
          <DashboardMobileSummaryItem label="Metode">{auditLog.method || '—'}</DashboardMobileSummaryItem>
          <DashboardMobileSummaryItem label="Status">
            {typeof auditLog.status_code === 'number' ? auditLog.status_code : '—'}
          </DashboardMobileSummaryItem>
          <DashboardMobileSummaryItem label="Endpoint" className="sm:col-span-2">
            {auditLog.url || '—'}
          </DashboardMobileSummaryItem>
          <DashboardMobileSummaryItem label="Dibuat" className="sm:col-span-2">
            {formatDate(auditLog.created_at)}
          </DashboardMobileSummaryItem>
        </DashboardMobileSummaryGrid>

        <Button
          className="w-full sm:w-auto"
          onClick={() => onSelectAuditLog(auditLog)}
          type="button"
          variant={selectedAuditLog?.id === auditLog.id ? 'secondary' : 'outline'}
        >
          Lihat Detail
        </Button>
      </CardContent>
    </Card>
  )
}

export function AuditLogsPanel({
  auditLogs,
  directionOptions,
  filters,
  formatDate,
  isLoading,
  meta,
  onFilterChange,
  onPageChange,
  onResetFilters,
  onSearch,
  onSelectAuditLog,
  prettyJSON,
  selectedAuditLog,
}: AuditLogsPanelProps) {
  const columns = [
    auditLogColumnHelper.display({
      id: 'request',
      header: 'Request ID',
      cell: ({ row }) => (
        <div>
          <strong>{row.original.request_id}</strong>
          <span>{row.original.actor_type}</span>
        </div>
      ),
    }),
    auditLogColumnHelper.display({
      id: 'direction',
      header: 'Arah',
      cell: ({ row }) => <Badge variant="secondary">{row.original.direction}</Badge>,
    }),
    auditLogColumnHelper.display({
      id: 'endpoint',
      header: 'Endpoint',
      cell: ({ row }) => (
        <div>
          <strong>{row.original.method || '—'}</strong>
          <span>{row.original.url || '—'}</span>
        </div>
      ),
    }),
    auditLogColumnHelper.display({
      id: 'status',
      header: 'Status',
      cell: ({ row }) => (typeof row.original.status_code === 'number' ? row.original.status_code : '—'),
    }),
    auditLogColumnHelper.display({
      id: 'created_at',
      header: 'Dibuat',
      cell: ({ row }) => formatDate(row.original.created_at),
    }),
    auditLogColumnHelper.display({
      id: 'actions',
      header: 'Aksi',
      cell: ({ row }) => (
        <Button
          onClick={() => onSelectAuditLog(row.original)}
          size="sm"
          type="button"
          variant={selectedAuditLog?.id === row.original.id ? 'secondary' : 'outline'}
        >
          Detail
        </Button>
      ),
    }),
  ]

  return (
    <section className="dashboard-section-grid">
      <DashboardPanelCard eyebrow="Audit Log" title="Request, response, webhook, dan delivery trail">
        <form className="dashboard-form" onSubmit={onSearch}>
          <div className="grid gap-2">
            <Label htmlFor="audit-query">Cari audit log</Label>
            <Input
              id="audit-query"
              value={filters.query}
              onChange={(event) => onFilterChange('query', event.target.value)}
              placeholder="kata kunci bebas untuk request, endpoint, actor, atau order"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="audit-direction">Arah</Label>
            <NativeSelect
              id="audit-direction"
              value={filters.direction}
              onChange={(event) => onFilterChange('direction', event.target.value)}
            >
              {directionOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </NativeSelect>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="audit-request-id">Request ID</Label>
            <Input
              id="audit-request-id"
              value={filters.requestId}
              onChange={(event) => onFilterChange('requestId', event.target.value)}
              placeholder="mis. req_20260504_001"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="audit-order-id">Order ID</Label>
            <Input
              id="audit-order-id"
              value={filters.orderId}
              onChange={(event) => onFilterChange('orderId', event.target.value)}
              placeholder="mis. INV-2026-0001"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="audit-endpoint">Endpoint</Label>
            <Input
              id="audit-endpoint"
              value={filters.endpoint}
              onChange={(event) => onFilterChange('endpoint', event.target.value)}
              placeholder="mis. /v1/webhooks/midtrans"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="audit-status-code">HTTP Status</Label>
            <Input
              id="audit-status-code"
              inputMode="numeric"
              max={599}
              min={100}
              onChange={(event) => onFilterChange('statusCode', event.target.value)}
              placeholder="mis. 200 atau 502"
              type="number"
              value={filters.statusCode}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="audit-created-from">Dari tanggal</Label>
            <Input
              id="audit-created-from"
              onChange={(event) => onFilterChange('createdFrom', event.target.value)}
              type="date"
              value={filters.createdFrom}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="audit-created-to">Sampai tanggal</Label>
            <Input
              id="audit-created-to"
              onChange={(event) => onFilterChange('createdTo', event.target.value)}
              type="date"
              value={filters.createdTo}
            />
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
            Menampilkan {auditLogs.length === 0 ? 0 : meta.offset + 1}-{meta.offset + auditLogs.length} dari {meta.total}{' '}
            audit log.
          </p>
          <p>
            Filter tersedia untuk arah traffic, request ID, order ID, endpoint, HTTP status, rentang tanggal, dan
            pencarian bebas.
          </p>
        </div>

        {isLoading ? <p className="text-sm text-muted-foreground">Memuat audit log…</p> : null}

        <DashboardDataTable
          columnTemplate="1.1fr 0.7fr 1fr 0.6fr 0.8fr auto"
          columns={columns as ColumnDef<AuditLog, unknown>[]}
          data={auditLogs}
          emptyState="Tidak ada audit log yang cocok."
          getRowId={(log) => log.id}
          renderMobileCard={(auditLog) => (
            <AuditLogMobileCard
              auditLog={auditLog}
              formatDate={formatDate}
              onSelectAuditLog={onSelectAuditLog}
              selectedAuditLog={selectedAuditLog}
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

      <DashboardPanelCard eyebrow="Audit Detail" title={selectedAuditLog?.request_id ?? 'Pilih audit log'}>
        {!selectedAuditLog && !isLoading ? (
          <p className="text-sm text-muted-foreground">
            Pilih satu audit log untuk melihat request dan response payload secara penuh.
          </p>
        ) : null}

        {selectedAuditLog ? (
          <>
            <dl className="dashboard-definition-list">
              <div>
                <dt>Tipe Aktor</dt>
                <dd>{selectedAuditLog.actor_type}</dd>
              </div>
              <div>
                <dt>Arah</dt>
                <dd>{selectedAuditLog.direction}</dd>
              </div>
              <div>
                <dt>Metode</dt>
                <dd>{selectedAuditLog.method || '—'}</dd>
              </div>
              <div>
                <dt>Endpoint</dt>
                <dd>{selectedAuditLog.url || '—'}</dd>
              </div>
              <div>
                <dt>Kode Status</dt>
                <dd>{typeof selectedAuditLog.status_code === 'number' ? selectedAuditLog.status_code : '—'}</dd>
              </div>
              <div>
                <dt>Durasi</dt>
                <dd>{typeof selectedAuditLog.duration_ms === 'number' ? `${selectedAuditLog.duration_ms} ms` : '—'}</dd>
              </div>
              <div>
                <dt>Dibuat Pada</dt>
                <dd>{formatDate(selectedAuditLog.created_at)}</dd>
              </div>
              <div>
                <dt>Error</dt>
                <dd>{selectedAuditLog.error_message || '—'}</dd>
              </div>
            </dl>

            <div className="grid gap-4">
              <div className="grid gap-2">
                <strong className="text-sm text-foreground">Payload Request</strong>
                <pre className="dashboard-json-block">{prettyJSON(selectedAuditLog.request_body)}</pre>
              </div>
              <div className="grid gap-2">
                <strong className="text-sm text-foreground">Payload Respons</strong>
                <pre className="dashboard-json-block">{prettyJSON(selectedAuditLog.response_body)}</pre>
              </div>
            </div>
          </>
        ) : null}
      </DashboardPanelCard>
    </section>
  )
}
