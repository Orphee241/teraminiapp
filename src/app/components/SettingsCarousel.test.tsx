import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import SettingsCarousel from './SettingsCarousel'

describe('SettingsCarousel', () => {
  it('shows the company form first and hides preferences until selected', () => {
    render(<SettingsCarousel company={<form><label>Nom de l’entreprise<input /></label></form>} preferences={<><h3>Couleur des documents</h3><label>Langue<select><option>Français</option></select></label></>} />)
    expect(screen.getAllByRole('tab').map(tab => tab.textContent)).toEqual(['Entreprise', 'Préférences'])
    expect(screen.getByLabelText('Nom de l’entreprise')).toBeInTheDocument()
    expect(screen.queryByText('Couleur des documents')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('tab', { name: 'Préférences' }))
    expect(screen.queryByLabelText('Nom de l’entreprise')).not.toBeInTheDocument()
    expect(screen.getByText('Couleur des documents')).toBeInTheDocument()
    expect(screen.getByLabelText('Langue')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Préférences' })).toHaveAttribute('aria-selected', 'true')
  })
})
