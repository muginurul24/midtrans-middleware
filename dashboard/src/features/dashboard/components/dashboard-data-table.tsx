import type { CSSProperties, ReactNode } from 'react'

import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from '@tanstack/react-table'

import { cn } from '@/lib/utils'

type DashboardDataTableProps<TData> = {
  columnTemplate: string
  columns: ColumnDef<TData, unknown>[]
  data: TData[]
  emptyState: ReactNode
  getRowId?: (row: TData, index: number) => string
  renderMobileCard?: (row: TData) => ReactNode
}

export function DashboardDataTable<TData>({
  columnTemplate,
  columns,
  data,
  emptyState,
  getRowId,
  renderMobileCard,
}: DashboardDataTableProps<TData>) {
  // TanStack Table returns imperative helpers that the React Compiler cannot memoize safely.
  // Keep the opt-out local to this wrapper instead of pushing the warning into every table panel.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getRowId: getRowId ? (row, index) => getRowId(row, index) : undefined,
  })

  const style = {
    '--dashboard-table-columns': columnTemplate,
  } as CSSProperties
  const rows = table.getRowModel().rows

  return (
    <>
      {renderMobileCard ? (
        <div className="grid gap-3 md:hidden">
          {rows.length === 0 ? (
            <div className="rounded-[1.25rem] border border-border/70 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
              {emptyState}
            </div>
          ) : (
            rows.map((row) => (
              <div className="min-w-0" key={row.id}>
                {renderMobileCard(row.original)}
              </div>
            ))
          )}
        </div>
      ) : null}

      <div className={cn('min-w-0', renderMobileCard ? 'hidden md:block' : undefined)}>
        <div className="dashboard-table" style={style}>
          {table.getHeaderGroups().map((headerGroup) => (
            <div className="dashboard-table__head" key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <div className="dashboard-table__cell" key={header.id}>
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </div>
              ))}
            </div>
          ))}

          {rows.length === 0 ? (
            <div className="dashboard-table__row dashboard-table__row--empty">
              <div className="dashboard-table__cell dashboard-table__cell--empty">{emptyState}</div>
            </div>
          ) : (
            rows.map((row) => (
              <div className="dashboard-table__row" key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <div className="dashboard-table__cell" key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </div>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}
