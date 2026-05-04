import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { StoreDirectoryPanel } from '@/features/dashboard/components/store-directory-panel'
import type { Store } from '@/features/dashboard/types'

function makeStore(index: number, status: Store['status'] = 'active'): Store {
  const timestamp = `2026-05-04T0${index}:00:00Z`

  return {
    id: `store-${index}`,
    user_id: 'user-1',
    name: `Store ${index}`,
    slug: `store-${index}`,
    domain: `store${index}.example.com`,
    default_callback_url: `https://store${index}.example.com/callback`,
    status,
    created_at: timestamp,
    updated_at: timestamp,
  }
}

describe('StoreDirectoryPanel', () => {
  it('filters the directory by query and status, then resets back to the full list', async () => {
    const user = userEvent.setup()
    const stores: Store[] = [makeStore(1), makeStore(7, 'inactive')]

    render(
      <MemoryRouter>
        <StoreDirectoryPanel
          formatDate={() => '4 Mei 2026, 09.26'}
          onOpenStore={vi.fn()}
          selectedStoreId={null}
          stores={stores}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Menampilkan 1-2 dari 2 store yang cocok. Total tenant terdaftar: 2.')).toBeInTheDocument()

    await user.type(screen.getByLabelText('Cari store'), '7')
    await user.selectOptions(screen.getByLabelText('Status'), 'inactive')

    await waitFor(() => {
      expect(screen.getByText('Menampilkan 1-1 dari 1 store yang cocok. Total tenant terdaftar: 2.')).toBeInTheDocument()
    })

    expect(screen.queryByText('Store 1')).not.toBeInTheDocument()
    expect(screen.getAllByText('Store 7').length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: 'Reset Filter' }))

    await waitFor(() => {
      expect(screen.getByText('Menampilkan 1-2 dari 2 store yang cocok. Total tenant terdaftar: 2.')).toBeInTheDocument()
    })
  })

  it('paginates the desktop table after six visible stores', async () => {
    const user = userEvent.setup()
    const stores = Array.from({ length: 7 }, (_, index) => makeStore(index + 1))

    render(
      <MemoryRouter>
        <StoreDirectoryPanel
          formatDate={() => '4 Mei 2026, 09.26'}
          onOpenStore={vi.fn()}
          selectedStoreId={null}
          stores={stores}
        />
      </MemoryRouter>,
    )

    expect(screen.getByText('Menampilkan 1-6 dari 7 store yang cocok. Total tenant terdaftar: 7.')).toBeInTheDocument()

    const nextButtons = screen.getAllByRole('button', { name: 'Berikutnya' })
    await user.click(nextButtons[nextButtons.length - 1])

    await waitFor(() => {
      expect(screen.getByText('Menampilkan 7-7 dari 7 store yang cocok. Total tenant terdaftar: 7.')).toBeInTheDocument()
    })
  })
})
