import { createColumnHelper, type ColumnDef } from '@tanstack/react-table'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { DashboardDataTable } from '@/features/dashboard/components/dashboard-data-table'

type TestRow = {
  id: string
  name: string
}

const columnHelper = createColumnHelper<TestRow>()

describe('DashboardDataTable', () => {
  it('renders both mobile cards and desktop table when a mobile renderer is provided', () => {
    const data: TestRow[] = [{ id: 'row-1', name: 'Alpha Store' }]
    const columns = [
      columnHelper.accessor('name', {
        header: 'Nama',
      }),
    ]

    const { container } = render(
      <DashboardDataTable
        columnTemplate="1fr"
        columns={columns as ColumnDef<TestRow, unknown>[]}
        data={data}
        emptyState="Kosong"
        getRowId={(row) => row.id}
        renderMobileCard={(row) => <div>Mobile {row.name}</div>}
      />,
    )

    expect(screen.getByText('Nama')).toBeInTheDocument()
    expect(screen.getByText('Alpha Store')).toBeInTheDocument()
    expect(screen.getByText('Mobile Alpha Store')).toBeInTheDocument()
    expect(container.querySelector('.dashboard-table')).not.toBeNull()
  })
})
