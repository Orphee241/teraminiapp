import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import BrandColorPicker from './BrandColorPicker'

describe('BrandColorPicker', () => {
  it('offers only a color picker and reports the normalized selected color', () => {
    const onChange = vi.fn()
    render(<BrandColorPicker value="#2563EB" onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('Choisir une couleur'), { target: { value: '#00aa77' } })
    expect(onChange).toHaveBeenCalledWith('#00AA77')
    expect(screen.getByLabelText('Couleur sélectionnée')).toHaveTextContent('#2563EB')
    expect(screen.queryByRole('group', { name: 'Palettes prédéfinies' })).not.toBeInTheDocument()
    expect(screen.queryByText('Rouge Terainterface')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Aperçu de la palette')).not.toBeInTheDocument()
  })
})
