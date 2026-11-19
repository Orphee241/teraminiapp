import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import TeraDocWorkspace from './TeraDocWorkspace'

vi.mock('./TeraDocCenter', () => ({ default: ({ onClose, documentId }: { onClose: () => void; documentId?: string }) => <div><span>CV form</span><span>{documentId || 'new'}</span><button onClick={onClose}>Retour au catalogue</button></div> }))

describe('TeraDoc workspace catalogue', () => {
  it('shows the document catalogue without displaying invoice services', () => {
    render(<TeraDocWorkspace initData="init-data" onClose={() => undefined} />)
    expect(screen.getByRole('heading', { name: 'Vos documents' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /CV professionnel/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Plainte/i })).toBeInTheDocument()
    expect(screen.queryByText(/facture/i)).not.toBeInTheDocument()
  })

  it('opens the CV flow and returns to the catalogue', () => {
    render(<TeraDocWorkspace initData="init-data" onClose={() => undefined} />)
    fireEvent.click(screen.getByRole('button', { name: /CV professionnel/i }))
    expect(screen.getByText('CV form')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retour au catalogue' }))
    expect(screen.getByRole('heading', { name: 'Vos documents' })).toBeInTheDocument()
  })

  it('keeps unavailable models inside the workspace with a clear status', () => {
    render(<TeraDocWorkspace initData="init-data" onClose={() => undefined} />)
    fireEvent.click(screen.getByRole('button', { name: /Plainte/i }))
    expect(screen.getByRole('status')).toHaveTextContent('bientôt disponible')
  })

  it('loads owner CVs in Mes documents and opens the selected draft', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, json: async () => ({ documents: [{ id: 'cv-1', title: 'Aline Mba', status: 'DRAFT', updated_at: '2026-01-01T00:00:00.000Z' }] }) }))
    render(<TeraDocWorkspace initData="init-data" onClose={() => undefined} />)
    fireEvent.click(screen.getByRole('button', { name: /Mes documents/i }))
    expect(await screen.findByText('Aline Mba')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Aline Mba/i }))
    expect(screen.getByText('cv-1')).toBeInTheDocument()
  })
})
