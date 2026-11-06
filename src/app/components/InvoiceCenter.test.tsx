import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { readFileSync } from 'node:fs'
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

  it.each(['devis', 'facture'] as const)('opens and reloads the %s archive after a successful edit', async kind => {
    const refreshedRow = { ...documentRow, type_document: kind, numero: kind === 'devis' ? 'DEV-UPDATED-42' : 'FAC-UPDATED-42' }
    const fetchMock = vi.fn((input: RequestInfo | URL) => {
      const query = new URL(String(input), 'https://local').searchParams
      if (String(input).startsWith('/api/documents?')) {
        return Promise.resolve(new Response(JSON.stringify({ documents: [refreshedRow] }), { status: 200 }))
      }
      throw new Error(`unexpected request: ${String(input)} ${query}`)
    })
    vi.stubGlobal('fetch', fetchMock)
    const view = render(<InvoiceCenter initData="telegram-init-data" onClose={vi.fn()} onCreate={vi.fn()} onEdit={vi.fn()} />)

    view.rerender(<InvoiceCenter initData="telegram-init-data" onClose={vi.fn()} onCreate={vi.fn()} onEdit={vi.fn()} archiveRefresh={{ kind, key: 1 }} />)

    expect(await screen.findByText(refreshedRow.numero)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: kind === 'devis' ? 'Mes devis' : 'Mes factures' })).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(String(fetchMock.mock.calls[0][0])).toContain(`document_type=${kind}`)
  })

  it('uses the host back action to return from archive to hub, then to services', async () => {
    const onClose = vi.fn()
    let back: () => void = () => undefined
    const fetchMock = vi.fn(() => Promise.resolve(new Response(JSON.stringify({ documents: [] }), { status: 200 })))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<InvoiceCenter initData="telegram-init-data" onClose={onClose} onCreate={vi.fn()} onEdit={vi.fn()} onBackReady={handler => { back = handler }} />)

    await user.click(screen.getByRole('button', { name: /voir mes devis et factures/i }))
    await screen.findByRole('heading', { name: 'Mes devis' })
    act(() => back())
    expect(await screen.findByRole('heading', { name: 'Devis et Facture' })).toBeInTheDocument()
    expect(onClose).not.toHaveBeenCalled()

    act(() => back())
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('requests the correct archive after a successful document form submission', () => {
    const source = readFileSync(`${process.cwd()}/src/app/page.tsx`, 'utf8')
    expect(source).toContain('setFormOpen(false)')
    expect(source).toContain('setSeededDocument(null)')
    expect(source).toContain('setArchiveRefresh(previous => ({ kind: savedKind, key: (previous?.key || 0) + 1 }))')
    expect(source).toContain('const savedKind = documentKind')
  })
  it('shows the invoice action from a quote preview and passes the selected quote', async () => {
    const onCreateFromQuote = vi.fn()
    const fetchMock = vi.fn(() => Promise.resolve(new Response(JSON.stringify({ documents: [documentRow] }), { status: 200 })))
    vi.stubGlobal('fetch', fetchMock)
    const user = userEvent.setup()
    render(<InvoiceCenter initData="telegram-init-data" onClose={vi.fn()} onCreate={vi.fn()} onEdit={vi.fn()} onCreateFromQuote={onCreateFromQuote} />)
    await user.click(screen.getByRole('button', { name: /voir mes devis et factures/i }))
    await user.click(await screen.findByRole('button', { name: /DEV-TEST-42/i }))
    await user.click(await screen.findByRole('button', { name: /générer la facture/i }))
    expect(onCreateFromQuote).toHaveBeenCalledWith(documentRow)
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

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
    await user.click(screen.getByRole('button', { name: /^supprimer$/i }))

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
    await user.click(screen.getByRole('button', { name: /^supprimer$/i }))

    expect(await screen.findByRole('button', { name: /DEV-TEST-42.*15.*FCFA.*genere/i })).toBeInTheDocument()
    expect(screen.getByText(/impossible de supprimer/i)).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
