import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import BrandColorPicker from './BrandColorPicker'

describe('BrandColorPicker', () => {
  it('changes the selected palette through the preset buttons', async () => {
    const onChange = vi.fn()
    render(<BrandColorPicker value="#D71920" onChange={onChange} />)
    await screen.getByRole('button', { name: 'Choisir la palette Bleu' }).click()
    expect(onChange).toHaveBeenCalledWith('#2563EB')
  })

  it('exposes a native color picker and previews derived colors', () => {
    const onChange = vi.fn()
    render(<BrandColorPicker value="#2563EB" onChange={onChange} />)
    const picker = screen.getByLabelText('Couleur personnalisée')
    fireEvent.change(picker, { target: { value: '#00aa77' } })
    expect(onChange).toHaveBeenCalledWith('#00AA77')
    expect(screen.getByLabelText('Aperçu de la palette')).toBeInTheDocument()
    expect(screen.getByText('NET À PAYER')).toHaveStyle({ color: '#FFFFFF' })
  })
})
