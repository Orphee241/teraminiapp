import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SettingsCarousel from './SettingsCarousel'

describe('SettingsCarousel', () => {
  it('groups company details and preferences in two navigable panels', () => {
    render(<SettingsCarousel company={<form><label>Nom de l’entreprise<input /></label></form>} preferences={<><h3>Couleur des documents</h3><label>Langue<select><option>Français</option></select></label></>} />)

    expect(screen.getByLabelText('Paramètres de l’entreprise')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Entreprise' })).toContainElement(screen.getByLabelText('Nom de l’entreprise'))
    expect(screen.getByRole('region', { name: 'Préférences' })).toContainElement(screen.getByText('Couleur des documents'))
    expect(screen.getByRole('region', { name: 'Préférences' })).toContainElement(screen.getByLabelText('Langue'))
    expect(screen.getByRole('button', { name: 'Entreprise' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('navigates to a selected slide and updates the active control', () => {
    const scrollIntoView = vi.fn()
    Element.prototype.scrollIntoView = scrollIntoView
    render(<SettingsCarousel company={<p>Coordonnées</p>} preferences={<p>Couleurs et langue</p>} />)

    fireEvent.click(screen.getByRole('button', { name: 'Préférences' }))
    expect(screen.getByRole('button', { name: 'Préférences' })).toHaveAttribute('aria-pressed', 'true')
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'nearest', inline: 'start' })
  })
})
