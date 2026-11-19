import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import TeraDocWorkspace from './TeraDocWorkspace'

vi.mock('./TeraDocCenter', () => ({ default: ({ onClose, documentId }: { onClose: () => void; documentId?: string }) => <div><span>CV form</span><span>{documentId || 'new'}</span><button onClick={onClose}>Retour au catalogue</button></div> }))

describe('TeraDoc workspace catalogue', () => {
  it('shows the document catalogue without displaying invoice services', () => {
    render(<TeraDocWorkspace initData="init-data" onClose={() => undefined} />)
    expect(screen.getByRole('heading', { name: 'Mes Documents' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /CV professionnel/i })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /page suivante/i }))
    expect(screen.getByRole('button', { name: /Plainte/i })).toBeInTheDocument()
    expect(screen.queryByText(/facture/i)).not.toBeInTheDocument()
  })

  it('opens the CV flow and returns to the catalogue', () => {
    render(<TeraDocWorkspace initData="init-data" onClose={() => undefined} />)
    fireEvent.click(screen.getByRole('button', { name: /CV professionnel/i }))
    expect(screen.getByText('CV form')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retour au catalogue' }))
    expect(screen.getByRole('heading', { name: 'Mes Documents' })).toBeInTheDocument()
  })

  it('keeps unavailable models inside the workspace with a clear status', () => {
    render(<TeraDocWorkspace initData="init-data" onClose={() => undefined} />)
    fireEvent.click(screen.getByRole('button', { name: /page suivante/i }))
    fireEvent.click(screen.getByRole('button', { name: /Plainte/i }))
    expect(screen.getByRole('status')).toHaveTextContent('bientôt disponible')
  })

  it('shows four document template sections per catalogue page and paginates the remaining templates', () => {
    render(<TeraDocWorkspace initData="init-data" onClose={() => undefined} />)

    expect(screen.getByRole('group', { name: /modèles 1 à 4/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /CV professionnel/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Demande de stage/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Plainte/i })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /page suivante/i }))

    expect(screen.getByRole('group', { name: /modèles 5 à 7/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Plainte/i })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /CV professionnel/i })).not.toBeInTheDocument()
  })

  it('loads owner CVs in Mes documents and opens the selected draft', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ documents: [{ id: 'cv-1', title: 'Aline Mba', status: 'DRAFT', updated_at: '2026-01-01T00:00:00.000Z' }] }) }))
    render(<TeraDocWorkspace initData="init-data" onClose={() => undefined} />)
    fireEvent.click(screen.getByRole('button', { name: /Mes documents/i }))
    expect(await screen.findByText('Aline Mba')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Aline Mba/i }))
    expect(screen.getByText('cv-1')).toBeInTheDocument()
  })

  it('removes the create action and groups four documents per archive page', async () => {
    const documents = Array.from({ length: 5 }, (_, index) => ({ id: `cv-${index + 1}`, title: `CV ${index + 1}`, status: 'DRAFT', updated_at: '2026-01-01T00:00:00.000Z' }))
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ documents }) }))
    render(<TeraDocWorkspace initData="init-data" onClose={() => undefined} />)

    expect(screen.queryByRole('button', { name: /Créer un document/i })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Mes documents/i }))
    expect(await screen.findByRole('group', { name: /documents 1 à 4/i })).toBeInTheDocument()
    expect(screen.getByText('CV 1')).toBeInTheDocument()
    expect(screen.getByText('CV 4')).toBeInTheDocument()
    expect(screen.queryByText('CV 5')).not.toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /CV [1-4]/i })).toHaveLength(4)

    fireEvent.click(screen.getByRole('button', { name: /page suivante/i }))
    expect(screen.getByRole('group', { name: /documents 5 à 5/i })).toBeInTheDocument()
    expect(screen.getByText('CV 5')).toBeInTheDocument()
    expect(screen.queryByText('CV 1')).not.toBeInTheDocument()
  })

  it('uses the existing spinner without exposing a loading sentence', async () => {
    let resolveRequest!: (value: unknown) => void
    vi.stubGlobal('fetch', vi.fn(() => new Promise(resolve => { resolveRequest = resolve })))
    render(<TeraDocWorkspace initData="init-data" onClose={() => undefined} />)

    fireEvent.click(screen.getByRole('button', { name: /Mes documents/i }))

    expect(screen.getByRole('status')).toBeInTheDocument()
    expect(screen.getByRole('status').querySelector('.inline-spinner')).toBeInTheDocument()
    expect(screen.queryByText(/Chargement de vos documents/i)).not.toBeInTheDocument()
    resolveRequest({ ok: true, json: async () => ({ documents: [] }) })
    await waitFor(() => expect(screen.getByText('Aucun CV enregistré.')).toBeInTheDocument())
  })

  it('caches documents for this mounted owner and shares one in-flight request', async () => {
    let resolveRequest!: (value: unknown) => void
    const fetchMock = vi.fn(() => new Promise(resolve => { resolveRequest = resolve }))
    vi.stubGlobal('fetch', fetchMock)
    render(<TeraDocWorkspace initData="owner-a" onClose={() => undefined} />)

    const openArchive = screen.getByRole('button', { name: /Mes documents/i })
    fireEvent.click(openArchive)
    fireEvent.click(openArchive)
    expect(fetchMock).toHaveBeenCalledTimes(1)

    resolveRequest({ ok: true, json: async () => ({ documents: [{ id: 'cv-1', title: 'CV cache', status: 'DRAFT', updated_at: '2026-01-01T00:00:00.000Z' }] }) })
    expect(await screen.findByText('CV cache')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Mes documents/i }))

    expect(screen.getByText('CV cache')).toBeInTheDocument()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('keeps the cache owner-scoped when the mounted owner changes', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ documents: [{ id: 'cv-owner', title: 'Owner document', status: 'DRAFT', updated_at: '2026-01-01T00:00:00.000Z' }] }) })
    vi.stubGlobal('fetch', fetchMock)
    const { rerender } = render(<TeraDocWorkspace initData="owner-a" onClose={() => undefined} />)
    fireEvent.click(screen.getByRole('button', { name: /Mes documents/i }))
    expect(await screen.findByText('Owner document')).toBeInTheDocument()

    rerender(<TeraDocWorkspace initData="owner-b" onClose={() => undefined} />)
    fireEvent.click(screen.getByRole('button', { name: /Mes documents/i }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
  })

  it('does not cache a failed archive request', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: false, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ documents: [] }) })
    vi.stubGlobal('fetch', fetchMock)
    render(<TeraDocWorkspace initData="owner-a" onClose={() => undefined} />)
    const openArchive = screen.getByRole('button', { name: /Mes documents/i })

    fireEvent.click(openArchive)
    await waitFor(() => expect(screen.getByText(/Impossible de charger vos CV/i)).toBeInTheDocument())
    fireEvent.click(openArchive)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(screen.getByText('Aucun CV enregistré.')).toBeInTheDocument())
  })
})
