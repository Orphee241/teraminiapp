import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, afterEach, it, vi } from 'vitest'
import InvoiceCenter from './InvoiceCenter'

vi.mock('./PdfViewer', () => ({ default: () => <div data-testid="pdf-viewer" /> }))

type DocumentRecord = { id: number; type_document: string; numero: string; statut: string; montant: number; notes: string }

const documentRow: DocumentRecord = {
  id: 42,
  type_document: 'devis',
  numero: 'DEV-TEST-42',
  statut: 'genere',
  montant: 15000,
  notes: JSON.stringify({ items: [{ designation: 'Prestation de test' }] }),
}

function renderArchive(fetchMock: typeof fetch) {
  vi.stubGlobal('fetch', fetchMock)
  return render(<InvoiceCenter initData="telegram-init-data" onClose={vi.fn()} onCreate={vi.fn()} onEdit={vi.fn()} />)
}

async function openArchive(fetchMock: typeof fetch) {
  const user = userEvent.setup()
  renderArchive(fetchMock)
  await user.click(screen.getByRole('button', { name: /voir mes devis et factures/i }))
  await screen.findByText('DEV-TEST-42')
  return user
}

describe('InvoiceCenter archive performance contract', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('removes a deleted row immediately and does not reload the archive', async () => {
    let resolveDelete!: (response: Response) => void
    const deletePending = new Promise<Response>(resolve => { resolveDelete = resolve })
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).startsWith('/api/documents?')) return Promise.resolve(new Response(JSON.stringify({ documents: [documentRow] }), { status: 200 }))
      if (String(input) === '/api/documents/42' && init?.method === 'DELETE') return deletePending
      throw new Error(`unexpected request: ${String(input)}`)
    }) as unknown as typeof fetch
    const user = await openArchive(fetchMock)

    fireEvent.contextMenu(screen.getByRole('button', { name: /DEV-TEST-42/i }))
    await user.click(await screen.findByRole('button', { name: 'Supprimer' }))
    await user.click(screen.getByRole('button', { name: /oui, supprimer/i }))

    expect(screen.queryByRole('button', { name: /DEV-TEST-42.*15.*FCFA.*genere/i })).not.toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)

    resolveDelete(new Response(JSON.stringify({ success: true }), { status: 200 }))
    await waitFor(() => expect(screen.queryByText('Impossible de supprimer')).not.toBeInTheDocument())
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('restores the row when the authoritative delete fails', async () => {
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).startsWith('/api/documents?')) return Promise.resolve(new Response(JSON.stringify({ documents: [documentRow] }), { status: 200 }))
      if (String(input) === '/api/documents/42' && init?.method === 'DELETE') return Promise.resolve(new Response('{}', { status: 500 }))
      throw new Error(`unexpected request: ${String(input)}`)
    }) as unknown as typeof fetch
    const user = await openArchive(fetchMock)

    fireEvent.contextMenu(screen.getByRole('button', { name: /DEV-TEST-42/i }))
    await user.click(await screen.findByRole('button', { name: 'Supprimer' }))
    await user.click(screen.getByRole('button', { name: /oui, supprimer/i }))

    expect(await screen.findByRole('button', { name: /DEV-TEST-42.*15.*FCFA.*genere/i })).toBeInTheDocument()
    expect(screen.getByText(/impossible de supprimer/i)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
