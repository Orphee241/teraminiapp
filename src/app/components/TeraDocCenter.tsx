'use client'

import { useMemo, useState } from 'react'
import { ArrowLeft, Check, FileText, LayoutTemplate, Save } from 'lucide-react'
import { TERADOC_TEMPLATES, type TeraDocTemplateId } from '../../modules/teradoc/templates'

type Props = { initData: string; onClose: () => void }

type CvDraft = {
  templateId: TeraDocTemplateId; fullName: string; headline: string; email: string; phone: string; location: string; summary: string
  experience: { role: string; company: string; startDate: string; description: string }[]
  education: { degree: string; institution: string }[]; skills: string[]; languages: { language: string; level: string }[]; certifications: string[]
}

const emptyDraft: CvDraft = { templateId: 'essential', fullName: '', headline: '', email: '', phone: '', location: '', summary: '', experience: [{ role: '', company: '', startDate: '', description: '' }], education: [{ degree: '', institution: '' }], skills: [], languages: [], certifications: [] }

export default function TeraDocCenter({ initData, onClose }: Props) {
  const [draft, setDraft] = useState<CvDraft>(emptyDraft)
  const [skillsText, setSkillsText] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [savedId, setSavedId] = useState('')
  const selected = useMemo(() => TERADOC_TEMPLATES.find(item => item.id === draft.templateId) || TERADOC_TEMPLATES[0], [draft.templateId])
  const update = (key: keyof CvDraft, value: string) => setDraft(previous => ({ ...previous, [key]: value }))
  const updateExperience = (key: string, value: string) => setDraft(previous => ({ ...previous, experience: [{ ...previous.experience[0], [key]: value }] }))
  const updateEducation = (key: string, value: string) => setDraft(previous => ({ ...previous, education: [{ ...previous.education[0], [key]: value }] }))
  async function saveDraft() {
    setBusy(true); setMessage('')
    const payload = { ...draft, skills: skillsText.split(',').map(value => value.trim()).filter(Boolean) }
    try {
      const response = await fetch('/api/teradoc/cv', { method: 'POST', headers: { 'content-type': 'application/json', 'x-telegram-init-data': initData }, body: JSON.stringify(payload) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(String(data.error || 'Impossible de sauvegarder le CV.'))
      setSavedId(String(data.document?.id || ''))
      setMessage('Brouillon enregistré. Vous pouvez maintenant télécharger votre CV PDF.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Impossible de sauvegarder le CV.') } finally { setBusy(false) }
  }
  async function downloadPdf() {
    if (!savedId) return
    try {
      const response = await fetch(`/api/teradoc/cv/${savedId}/pdf`, { headers: { 'x-telegram-init-data': initData }, cache: 'no-store' })
      if (!response.ok) throw new Error('Impossible de générer le PDF.')
      const blob = await response.blob(); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `teradoc-${savedId}.pdf`; link.click(); URL.revokeObjectURL(url)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Impossible de générer le PDF.') }
  }
  return <section className="teradoc-center" aria-label="TeraDoc">
    <button type="button" className="back-link" onClick={onClose}><ArrowLeft size={17} /> Retour aux services</button>
    <div className="teradoc-heading"><div><p className="eyebrow accent">TERADOC</p><h2 className="section-title">Créer un CV</h2><p className="lead compact">Un CV propre, lisible et adapté à votre parcours.</p></div><span className="teradoc-mark"><FileText size={22} /></span></div>
    <div className="teradoc-template-grid" aria-label="Choisir un modèle">{TERADOC_TEMPLATES.map(template => <button type="button" key={template.id} className={`teradoc-template ${draft.templateId === template.id ? 'is-selected' : ''}`} onClick={() => setDraft(previous => ({ ...previous, templateId: template.id }))}><span className="teradoc-template-preview" style={{ borderTopColor: template.accent }}><LayoutTemplate size={18} /><strong>{template.name}</strong><small>{template.columns === 1 ? 'Une colonne' : 'Deux colonnes'}</small></span><span className="teradoc-template-copy"><strong>{template.description}</strong><small>{template.atsLevel === 'high' ? 'Lecture ATS prioritaire' : 'Style créatif — vérifiez la compatibilité ATS'}</small>{draft.templateId === template.id && <Check size={16} aria-label="Sélectionné" />}</span></button>)}</div>
    <div className="teradoc-form-card"><div className="teradoc-section-title"><strong>Informations personnelles</strong><small>Les champs essentiels apparaîtront en tête du CV.</small></div><div className="teradoc-form-grid"><label>Nom complet<input value={draft.fullName} onChange={event => update('fullName', event.target.value)} placeholder="Ex. Aline Mba" /></label><label>Titre professionnel<input value={draft.headline} onChange={event => update('headline', event.target.value)} placeholder="Ex. Responsable administrative" /></label><label>Email<input type="email" value={draft.email} onChange={event => update('email', event.target.value)} /></label><label>Téléphone<input value={draft.phone} onChange={event => update('phone', event.target.value)} /></label><label>Ville / pays<input value={draft.location} onChange={event => update('location', event.target.value)} /></label></div><label>Résumé professionnel<textarea value={draft.summary} onChange={event => update('summary', event.target.value)} rows={4} placeholder="Présentez votre profil en quelques lignes." /></label></div>
    <div className="teradoc-form-card"><div className="teradoc-section-title"><strong>Expérience principale</strong><small>Vous pourrez ajouter les autres expériences dans l’étape suivante.</small></div><div className="teradoc-form-grid"><label>Poste<input value={draft.experience[0].role} onChange={event => updateExperience('role', event.target.value)} /></label><label>Entreprise<input value={draft.experience[0].company} onChange={event => updateExperience('company', event.target.value)} /></label><label>Date de début<input type="month" value={draft.experience[0].startDate} onChange={event => updateExperience('startDate', event.target.value)} /></label></div><label>Description<textarea value={draft.experience[0].description} onChange={event => updateExperience('description', event.target.value)} rows={4} /></label></div>
    <div className="teradoc-form-card"><div className="teradoc-section-title"><strong>Formation et compétences</strong><small>Séparez les compétences par des virgules.</small></div><div className="teradoc-form-grid"><label>Diplôme / formation<input value={draft.education[0].degree} onChange={event => updateEducation('degree', event.target.value)} /></label><label>Établissement<input value={draft.education[0].institution} onChange={event => updateEducation('institution', event.target.value)} /></label></div><label>Compétences<input value={skillsText} onChange={event => setSkillsText(event.target.value)} placeholder="Organisation, Excel, Gestion de projet" /></label></div>
    <div className="teradoc-actions"><button className="primary-button" type="button" disabled={busy} onClick={saveDraft}><Save size={17} />{busy ? 'Enregistrement…' : 'Enregistrer le brouillon'}</button>{savedId && <button className="secondary-button teradoc-download" type="button" onClick={downloadPdf}>Télécharger le PDF</button>}{message && <p className="form-message" role="status">{message}</p>}</div><p className="teradoc-note">Modèle sélectionné : <strong>{selected.name}</strong>. TeraDoc privilégie une mise en page sobre, des textes sélectionnables et une lecture claire.</p>
  </section>
}
