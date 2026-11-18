export type TeraDocFormValues = { fullName: string; headline: string; email: string; phone: string; location: string; summary: string; role: string; company: string; startDate: string; description: string; degree: string; institution: string; skills: string }
export type TeraDocFormErrors = Partial<Record<keyof TeraDocFormValues, string>>

const required = (value: string, message: string, errors: TeraDocFormErrors, key: keyof TeraDocFormValues) => { if (!value.trim()) errors[key] = message }

export function validateTeraDocForm(values: TeraDocFormValues): TeraDocFormErrors {
  const errors: TeraDocFormErrors = {}
  required(values.fullName, 'Renseignez votre nom complet.', errors, 'fullName')
  required(values.headline, 'Renseignez votre titre professionnel.', errors, 'headline')
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) errors.email = 'Renseignez une adresse email valide.'
  required(values.phone, 'Renseignez votre numéro de téléphone.', errors, 'phone')
  required(values.location, 'Renseignez votre ville ou votre pays.', errors, 'location')
  required(values.summary, 'Présentez votre profil en quelques lignes.', errors, 'summary')
  required(values.role, 'Renseignez le poste occupé.', errors, 'role')
  required(values.company, 'Renseignez l’entreprise.', errors, 'company')
  required(values.startDate, 'Indiquez la date de début.', errors, 'startDate')
  required(values.description, 'Décrivez vos principales responsabilités.', errors, 'description')
  required(values.degree, 'Renseignez votre formation.', errors, 'degree')
  required(values.institution, 'Renseignez l’établissement.', errors, 'institution')
  if (!values.skills.split(',').map(value => value.trim()).filter(Boolean).length) errors.skills = 'Ajoutez au moins une compétence.'
  return errors
}
