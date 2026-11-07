import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import DocumentColorSimulator from './DocumentColorSimulator'

describe('DocumentColorSimulator', () => {
  it('renders derived colors in a realistic document preview', () => {
    render(<DocumentColorSimulator color="#FACC15" />)
    expect(screen.getByRole('article', { name: 'Aperçu devis' })).toHaveStyle({ '--sim-primary': '#FACC15' })
    expect(screen.getByText('NET À PAYER')).toBeInTheDocument()
    expect(screen.getByText('DÉSIGNATION')).toBeInTheDocument()
    expect(screen.getByText('DEVIS')).toBeInTheDocument()
  })

  it('switches the simulator between quote and invoice', () => {
    render(<DocumentColorSimulator color="#2563EB" />)
    fireEvent.click(screen.getByRole('tab', { name: 'Facture' }))
    expect(screen.getByRole('article', { name: 'Aperçu facture' })).toBeInTheDocument()
    expect(screen.getByText('FACTURE')).toBeInTheDocument()
  })
})
