import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import TeraDocCenter from './TeraDocCenter'

const payload = {
  templateId: 'essential', fullName: 'Aline Mba', headline: 'Responsable administrative', email: 'aline@example.com', phone: '+241 06000000', location: 'Libreville', summary: 'Profil professionnel.',
  experience: [{ role: 'Responsable', company: 'Entreprise Test', startDate: '2021-01', description: 'Coordination.' }],
  education: [{ degree: 'Licence', institution: 'Université Test' }], skills: ['Excel'], languages: [], certifications: [],
}

describe('TeraDoc CV draft lifecycle', () => {
  it('loads an existing payload and updates it with PUT', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ document: { id: 'cv-1', payload } }) })
      .mockResolvedValue({ ok: true, headers: new Headers({ 'content-type': 'application/pdf' }), arrayBuffer: async () => new TextEncoder().encode('%PDF-1.7').buffer, json: async () => ({ document: { id: 'cv-1' } }) })
    vi.stubGlobal('fetch', fetchMock)
    render(<TeraDocCenter initData="init-data" onClose={() => undefined} documentId="cv-1" />)
    expect(await screen.findByDisplayValue('Aline Mba')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /étape suivante/i }))
    fireEvent.click(screen.getByRole('button', { name: /étape suivante/i }))
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer le brouillon/i }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/teradoc/cv/cv-1', expect.objectContaining({ method: 'PUT' })))
  })

  it('guides the user through accessible steps and blocks advancement on invalid fields', async () => {
    vi.stubGlobal('fetch', vi.fn())
    render(<TeraDocCenter initData="init-data" onClose={() => undefined} />)

    expect(screen.getByRole('navigation', { name: /étapes du CV/i })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: /informations personnelles/i })).toBeInTheDocument()
    expect(screen.getByLabelText(/Nom complet/)).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /Poste/ })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /étape suivante/i }))
    await waitFor(() => expect(screen.getByLabelText(/Nom complet/)).toHaveFocus())
    expect(screen.getByText(/Renseignez votre nom complet/i)).toBeInTheDocument()

    for (const [label, value] of [['Nom complet', 'Aline Mba'], ['Titre professionnel', 'Responsable'], ['Email', 'aline@example.com'], ['Téléphone', '+241 06000000'], ['Ville / pays', 'Libreville'], ['Résumé', 'Profil professionnel.']]) {
      fireEvent.change(screen.getByLabelText(new RegExp(label)), { target: { value } })
    }
    fireEvent.click(screen.getByRole('button', { name: /étape suivante/i }))
    expect(screen.getByRole('heading', { name: /expérience principale/i })).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: /Nom complet/ })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /étape précédente/i }))
    expect(screen.getByDisplayValue('Aline Mba')).toBeInTheDocument()
  })

  it('creates a new draft with POST when no document id exists', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ document: { id: 'cv-new' } }) })
    vi.stubGlobal('fetch', fetchMock)
    render(<TeraDocCenter initData="init-data" onClose={() => undefined} />)
    for (const [label, value] of [['Nom complet', 'Aline Mba'], ['Titre professionnel', 'Responsable'], ['Email', 'aline@example.com'], ['Téléphone', '+241 06000000'], ['Ville / pays', 'Libreville'], ['Résumé', 'Profil professionnel.'], ['Poste', 'Responsable'], ['Entreprise', 'Entreprise Test'], ['Description', 'Coordination.'], ['Diplôme / formation', 'Licence'], ['Établissement', 'Université Test'], ['Compétences', 'Excel']]) {
      fireEvent.change(screen.getByLabelText(new RegExp(label)), { target: { value } })
    }
    fireEvent.change(screen.getByLabelText(/Date de début/), { target: { value: '2021-01' } })
    fireEvent.click(screen.getByRole('button', { name: /étape suivante/i }))
    fireEvent.click(screen.getByRole('button', { name: /étape suivante/i }))
    fireEvent.click(screen.getByRole('button', { name: /Enregistrer le brouillon/i }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith('/api/teradoc/cv', expect.objectContaining({ method: 'POST' })))
  })
})