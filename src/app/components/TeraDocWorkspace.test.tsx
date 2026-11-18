import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import TeraDocWorkspace from './TeraDocWorkspace'

vi.mock('./TeraDocCenter', () => ({ default: ({ onClose }: { onClose: () => void }) => <div><span>CV form</span><button onClick={onClose}>Retour au catalogue</button></div> }))

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
})
