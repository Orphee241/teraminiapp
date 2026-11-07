import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { deriveBrandPalette } from '../../lib/document-branding'
import DocumentColorSimulator from './DocumentColorSimulator'

describe('DocumentColorSimulator', () => {
  it('renders derived colors in a realistic document preview', () => {
    render(<DocumentColorSimulator color="#FACC15" />)
    expect(screen.getByRole('article', { name: 'Aperçu devis' })).toHaveStyle({ '--sim-primary': '#FACC15' })
    expect(screen.getByText('Net à payer : 50 000 FCFA')).toBeInTheDocument()
    expect(screen.getByText('DÉSIGNATION')).toBeInTheDocument()
    expect(screen.getByText('DEVIS')).toBeInTheDocument()
  })

  it('renders the real template zones and keeps ordinary document content neutral', () => {
    const palette = deriveBrandPalette('#FACC15')
    render(<DocumentColorSimulator color="#FACC15" />)
    expect(screen.getByLabelText('En-tête coloré').querySelector('.simulator-band-block')).not.toBeInTheDocument()
    expect(screen.getByText('CLIENT')).toBeInTheDocument()
    expect(screen.getByText('OBJET DU DEVIS')).toBeInTheDocument()
    expect(screen.getByText('Total HT : 50 000 FCFA')).toBeInTheDocument()
    expect(screen.getByText('TVA : Non appliquée')).toBeInTheDocument()
    expect(screen.getByText('Signature et cachet Client')).toBeInTheDocument()
    expect(screen.getByRole('article', { name: 'Aperçu devis' })).toHaveStyle({ '--sim-deep': palette.deep, '--sim-pale': palette.pale })
  })

  it('switches the simulator between quote and invoice', () => {
    render(<DocumentColorSimulator color="#2563EB" />)
    fireEvent.click(screen.getByRole('tab', { name: 'Facture' }))
    expect(screen.getByRole('article', { name: 'Aperçu facture' })).toBeInTheDocument()
    expect(screen.getByText('FACTURE')).toBeInTheDocument()
    expect(screen.getByText('OBJET DE LA FACTURE')).toBeInTheDocument()
  })
})
