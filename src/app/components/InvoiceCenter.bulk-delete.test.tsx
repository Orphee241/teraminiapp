import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
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

describe('InvoiceCenter bulk selection and deletion', () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it('selects one document with long press, supports select all, and deletes selected documents only after confirmation', async () => {
    const rows = [
      documentRow,
      { ...documentRow, id: 43, numero: 'DEV-TEST-43' },
      { ...documentRow, id: 44, numero: 'DEV-TEST-44' },
    ]
    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
      if (String(input).startsWith('/api/documents?')) return Promise.resolve(new Response(JSON.stringify({ documents: rows }), { status: 200 }))
      if (init?.method === 'DELETE') return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }))
      throw new Error(`unexpected request: ${String(input)}`)
    }) as unknown as typeof fetch
    const fetchSpy = fetchMock as unknown as { mock: { calls: Array<[RequestInfo | URL, RequestInit?]> } }
    const user = await openArchive(fetchMock)
    const row = await screen.findByRole('button', { name: /DEV-TEST-42/i })

    fireEvent.pointerDown(row)
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 600)) })
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 600)) })
    expect(screen.getByRole('checkbox', { name: /sélectionner DEV-TEST-42/i })).toBeChecked()

    await user.click(screen.getByRole('checkbox', { name: /sélectionner DEV-TEST-42/i }))
    expect(screen.getByRole('checkbox', { name: /sélectionner DEV-TEST-42/i })).not.toBeChecked()
    await user.click(screen.getByRole('checkbox', { name: /sélectionner DEV-TEST-42/i }))
    await user.click(screen.getByRole('button', { name: /tout sélectionner/i }))
    expect(screen.getByRole('checkbox', { name: /sélectionner DEV-TEST-43/i })).toBeChecked()
    expect(screen.getByText('3 sélectionnés')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /supprimer les 3 sélectionnés/i }))
    expect(screen.getByRole('heading', { name: /supprimer 3 documents/i })).toBeInTheDocument()
    expect(fetchSpy.mock.calls.filter(([, init]) => init?.method === 'DELETE')).toHaveLength(0)

    await user.click(screen.getByRole('button', { name: /^supprimer les 3$/i }))
    await waitFor(() => expect(fetchSpy.mock.calls.filter(([, init]) => init?.method === 'DELETE')).toHaveLength(3))
    expect(screen.queryByRole('checkbox', { name: /sélectionner DEV-TEST-42/i })).not.toBeInTheDocument()
  })

  it('offers selection without long-press delay on the archive toolbar', async () => {
    const user = await openArchive(() => Promise.resolve(new Response(JSON.stringify({ documents: [documentRow] }), { status: 200 })))
    await user.click(screen.getByRole('button', { name: /sélectionner des documents/i }))
    expect(await screen.findByRole('checkbox', { name: /sélectionner DEV-TEST-42/i })).toBeInTheDocument()
  })
})
