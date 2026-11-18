import { describe, expect, it } from 'vitest'
import { validateTeraDocForm } from '../../lib/teradoc-form-validation'

describe('TeraDoc form validation', () => {
  it('reports each required field with a French message', () => {
    const errors = validateTeraDocForm({ fullName: '', headline: '', email: 'bad', phone: '', location: '', summary: '', role: '', company: '', startDate: '', description: '', degree: '', institution: '', skills: '' })
    expect(errors.fullName).toBe('Renseignez votre nom complet.')
    expect(errors.email).toBe('Renseignez une adresse email valide.')
    expect(errors.skills).toBe('Ajoutez au moins une compétence.')
    expect(Object.keys(errors).length).toBeGreaterThan(8)
  })

  it('accepts a complete form and ignores optional values', () => {
    expect(validateTeraDocForm({ fullName: 'Aline Mba', headline: 'Responsable', email: 'aline@example.com', phone: '+241 06000000', location: 'Libreville', summary: 'Profil', role: 'Responsable', company: 'Entreprise', startDate: '2021-01', description: 'Coordination', degree: 'Licence', institution: 'Université', skills: 'Organisation, Excel' })).toEqual({})
  })
})
