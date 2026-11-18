'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, Check, Download, FileText, LayoutTemplate, Save } from 'lucide-react'
import PdfViewer from './PdfViewer'
import { pickPdfFile, savePdf } from '../../lib/document-download'
import { TERADOC_TEMPLATES, type TeraDocTemplateId } from '../../modules/teradoc/templates'
import { validateTeraDocForm, type TeraDocFormErrors } from '../../lib/teradoc-form-validation'

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
  const [errors, setErrors] = useState<TeraDocFormErrors>({})
  const [previewBytes, setPreviewBytes] = useState<Uint8Array | null>(null)
  const [previewStatus, setPreviewStatus] = useState<'incomplete' | 'loading' | 'ready' | 'error'>('incomplete')
  const [previewMessage, setPreviewMessage] = useState('')
  const [previewVersion, setPreviewVersion] = useState(0)
  const [previewFingerprint, setPreviewFingerprint] = useState('')
  const [downloadBusy, setDownloadBusy] = useState(false)
  const selected = useMemo(() => TERADOC_TEMPLATES.find(item => item.id === draft.templateId) || TERADOC_TEMPLATES[0], [draft.templateId])
  const payload = useMemo(() => ({ ...draft, skills: skillsText.split(',').map(value => value.trim()).filter(Boolean) }), [draft, skillsText])
  const previewPayloadKey = useMemo(() => JSON.stringify(payload), [payload])
  const previewReady = previewStatus === 'ready' && Boolean(previewBytes) && previewFingerprint === previewPayloadKey
  const validation = useMemo(() => validateTeraDocForm({ fullName: draft.fullName, headline: draft.headline, email: draft.email, phone: draft.phone, location: draft.location, summary: draft.summary, role: draft.experience[0].role, company: draft.experience[0].company, startDate: draft.experience[0].startDate, description: draft.experience[0].description, degree: draft.education[0].degree, institution: draft.education[0].institution, skills: skillsText }), [draft, skillsText])
  const clearError = (key: keyof TeraDocFormErrors) => setErrors(previous => { if (!previous[key]) return previous; const next = { ...previous }; delete next[key]; return next })
  const update = (key: keyof CvDraft, value: string) => { setDraft(previous => ({ ...previous, [key]: value })); clearError(key as keyof TeraDocFormErrors) }
  const updateExperience = (key: string, value: string) => { setDraft(previous => ({ ...previous, experience: [{ ...previous.experience[0], [key]: value }] })); clearError(key as keyof TeraDocFormErrors) }
  const updateEducation = (key: string, value: string) => { setDraft(previous => ({ ...previous, education: [{ ...previous.education[0], [key]: value }] })); clearError(key as keyof TeraDocFormErrors) }
  useEffect(() => {
    const controller = new AbortController()
    let cancelled = false
    setPreviewBytes(null)
    setPreviewFingerprint('')
    setPreviewMessage('')
    if (Object.keys(validation).length) {
      setPreviewStatus('incomplete')
      return () => { cancelled = true; controller.abort() }
    }
    setPreviewStatus('loading')
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/teradoc/cv/preview', { method: 'POST', headers: { 'content-type': 'application/json', 'x-telegram-init-data': initData }, body: JSON.stringify(payload), cache: 'no-store', signal: controller.signal })
        if (!response.ok) { const data = await response.json().catch(() => ({})); throw new Error(String(data.error || 'Impossible de générer l’aperçu.')) }
        if (!response.headers.get('content-type')?.includes('application/pdf')) throw new Error('Le document reçu n’est pas un PDF valide.')
        const bytes = new Uint8Array(await response.arrayBuffer())
        if (bytes.byteLength < 5 || bytes[0] !== 0x25 || bytes[1] !== 0x50 || bytes[2] !== 0x44 || bytes[3] !== 0x46 || bytes[4] !== 0x2d) throw new Error('Le PDF reçu est vide ou invalide.')
        if (cancelled) return
        setPreviewBytes(bytes)
        setPreviewFingerprint(previewPayloadKey)
        setPreviewVersion(value => value + 1)
        setPreviewStatus('ready')
      } catch (error) {
        if (cancelled || (error instanceof DOMException && error.name === 'AbortError')) return
        setPreviewMessage(error instanceof Error ? error.message : 'Impossible de générer l’aperçu.')
        setPreviewStatus('error')
      }
    }, 550)
    return () => { cancelled = true; window.clearTimeout(timer); controller.abort() }
  }, [payload, previewPayloadKey, validation, initData])

  async function saveDraft() {
    setErrors(validation)
    if (Object.keys(validation).length) { setMessage('Complétez les champs signalés avant d’enregistrer votre CV.'); window.setTimeout(() => document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(), 0); return }
    setBusy(true); setMessage('')
    try {
      const response = await fetch('/api/teradoc/cv', { method: 'POST', headers: { 'content-type': 'application/json', 'x-telegram-init-data': initData }, body: JSON.stringify(payload) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(String(data.error || 'Impossible de sauvegarder le CV.'))
      setMessage('Brouillon enregistré.')
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Impossible de sauvegarder le CV.') } finally { setBusy(false) }
  }

  async function downloadPdf() {
    if (!previewReady || !previewBytes) return
    setDownloadBusy(true)
    try {
      const handle = await pickPdfFile('teradoc-cv.pdf')
      await savePdf(previewBytes.slice().buffer as ArrayBuffer, 'teradoc-cv.pdf', handle)
      setMessage('Téléchargement du CV terminé.')
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) setPreviewMessage(error instanceof Error ? error.message : 'Impossible de télécharger le CV.')
    } finally { setDownloadBusy(false) }
  }
  return <section className="teradoc-center" aria-label="TeraDoc">
    <button type="button" className="back-link" onClick={onClose}><ArrowLeft size={17} /> Retour aux services</button>
    <div className="teradoc-heading"><div><p className="eyebrow accent">TERADOC</p><h2 className="section-title">Créer un CV</h2><p className="lead compact">Un CV propre, lisible et adapté à votre parcours.</p></div><span className="teradoc-mark"><FileText size={22} /></span></div>
    <div className="teradoc-template-grid" aria-label="Choisir un modèle">{TERADOC_TEMPLATES.map(template => <button type="button" key={template.id} className={`teradoc-template ${draft.templateId === template.id ? 'is-selected' : ''}`} onClick={() => setDraft(previous => ({ ...previous, templateId: template.id }))}><span className="teradoc-template-preview" style={{ borderTopColor: template.accent }}><LayoutTemplate size={18} /><strong>{template.name}</strong><small>{template.columns === 1 ? 'Une colonne' : 'Deux colonnes'}</small></span><span className="teradoc-template-copy"><strong>{template.description}</strong><small>{template.atsLevel === 'high' ? 'Lecture ATS prioritaire' : 'Style créatif — vérifiez la compatibilité ATS'}</small>{draft.templateId === template.id && <Check size={16} aria-label="Sélectionné" />}</span></button>)}</div>
    <div className="teradoc-live-preview" aria-label="Prévisualisation du CV"><div className="teradoc-live-preview-head"><span>PRÉVISUALISATION A4</span><small>Le PDF affiché est exactement celui qui sera téléchargé.</small><button className="teradoc-preview-download" type="button" onClick={() => void downloadPdf()} disabled={!previewReady || downloadBusy} aria-label="Télécharger le CV"><Download size={16} />{downloadBusy ? 'Préparation…' : 'Télécharger le CV'}</button></div><div className="teradoc-preview-stage" aria-busy={previewStatus === 'loading'}>{previewReady && previewBytes ? <PdfViewer key={previewVersion} src={`teradoc-live:${previewVersion}`} title="Aperçu réel du CV au format A4" initData={initData} pdfData={previewBytes} hideDownload /> : <div className="teradoc-preview-placeholder" role="status">{previewStatus === 'loading' ? 'Génération de votre aperçu A4…' : previewStatus === 'error' ? previewMessage : 'Complétez les champs indispensables pour afficher votre CV au format A4.'}</div>}</div></div>
    <div className="teradoc-form-card"><div className="teradoc-section-title"><strong>Informations personnelles</strong><small>Les champs avec * sont indispensables.</small></div><div className="teradoc-form-grid"><label className={errors.fullName ? 'has-error' : ''}>Nom complet <span className="required-mark" aria-hidden="true">*</span><input required aria-invalid={Boolean(errors.fullName)} aria-describedby={errors.fullName ? 'teradoc-error-fullName' : undefined} value={draft.fullName} onChange={event => update('fullName', event.target.value)} placeholder="Ex. Aline Mba" />{errors.fullName && <small id="teradoc-error-fullName" className="teradoc-field-error">{errors.fullName}</small>}</label><label className={errors.headline ? 'has-error' : ''}>Titre professionnel <span className="required-mark" aria-hidden="true">*</span><input required aria-invalid={Boolean(errors.headline)} value={draft.headline} onChange={event => update('headline', event.target.value)} placeholder="Ex. Responsable administrative" />{errors.headline && <small className="teradoc-field-error">{errors.headline}</small>}</label><label className={errors.email ? 'has-error' : ''}>Email <span className="required-mark" aria-hidden="true">*</span><input required type="email" aria-invalid={Boolean(errors.email)} value={draft.email} onChange={event => update('email', event.target.value)} />{errors.email && <small className="teradoc-field-error">{errors.email}</small>}</label><label className={errors.phone ? 'has-error' : ''}>Téléphone <span className="required-mark" aria-hidden="true">*</span><input required aria-invalid={Boolean(errors.phone)} value={draft.phone} onChange={event => update('phone', event.target.value)} />{errors.phone && <small className="teradoc-field-error">{errors.phone}</small>}</label><label className={errors.location ? 'has-error' : ''}>Ville / pays <span className="required-mark" aria-hidden="true">*</span><input required aria-invalid={Boolean(errors.location)} value={draft.location} onChange={event => update('location', event.target.value)} />{errors.location && <small className="teradoc-field-error">{errors.location}</small>}</label></div><label className={errors.summary ? 'has-error' : ''}>Résumé professionnel <span className="required-mark" aria-hidden="true">*</span><textarea required aria-invalid={Boolean(errors.summary)} value={draft.summary} onChange={event => update('summary', event.target.value)} rows={4} placeholder="Présentez votre profil en quelques lignes." />{errors.summary && <small className="teradoc-field-error">{errors.summary}</small>}</label></div>
    <div className="teradoc-form-card"><div className="teradoc-section-title"><strong>Expérience principale</strong><small>Vous pourrez ajouter les autres expériences dans l’étape suivante.</small></div><div className="teradoc-form-grid"><label className={errors.role ? 'has-error' : ''}>Poste <span className="required-mark" aria-hidden="true">*</span><input required aria-invalid={Boolean(errors.role)} value={draft.experience[0].role} onChange={event => updateExperience('role', event.target.value)} />{errors.role && <small className="teradoc-field-error">{errors.role}</small>}</label><label className={errors.company ? 'has-error' : ''}>Entreprise <span className="required-mark" aria-hidden="true">*</span><input required aria-invalid={Boolean(errors.company)} value={draft.experience[0].company} onChange={event => updateExperience('company', event.target.value)} />{errors.company && <small className="teradoc-field-error">{errors.company}</small>}</label><label className={errors.startDate ? 'has-error' : ''}>Date de début <span className="required-mark" aria-hidden="true">*</span><input required type="month" aria-invalid={Boolean(errors.startDate)} value={draft.experience[0].startDate} onChange={event => updateExperience('startDate', event.target.value)} />{errors.startDate && <small className="teradoc-field-error">{errors.startDate}</small>}</label></div><label className={errors.description ? 'has-error' : ''}>Description <span className="required-mark" aria-hidden="true">*</span><textarea required aria-invalid={Boolean(errors.description)} value={draft.experience[0].description} onChange={event => updateExperience('description', event.target.value)} rows={4} />{errors.description && <small className="teradoc-field-error">{errors.description}</small>}</label></div>
    <div className="teradoc-form-card"><div className="teradoc-section-title"><strong>Formation et compétences</strong><small>Séparez les compétences par des virgules.</small></div><div className="teradoc-form-grid"><label className={errors.degree ? 'has-error' : ''}>Diplôme / formation <span className="required-mark" aria-hidden="true">*</span><input required aria-invalid={Boolean(errors.degree)} value={draft.education[0].degree} onChange={event => updateEducation('degree', event.target.value)} />{errors.degree && <small className="teradoc-field-error">{errors.degree}</small>}</label><label className={errors.institution ? 'has-error' : ''}>Établissement <span className="required-mark" aria-hidden="true">*</span><input required aria-invalid={Boolean(errors.institution)} value={draft.education[0].institution} onChange={event => updateEducation('institution', event.target.value)} />{errors.institution && <small className="teradoc-field-error">{errors.institution}</small>}</label></div><label className={errors.skills ? 'has-error' : ''}>Compétences <span className="required-mark" aria-hidden="true">*</span><input required aria-invalid={Boolean(errors.skills)} value={skillsText} onChange={event => { setSkillsText(event.target.value); clearError('skills') }} placeholder="Organisation, Excel, Gestion de projet" />{errors.skills && <small className="teradoc-field-error">{errors.skills}</small>}</label></div>
    <div className="teradoc-actions"><button className="primary-button" type="button" disabled={busy} onClick={saveDraft}><Save size={17} />{busy ? 'Enregistrement…' : 'Enregistrer le brouillon'}</button>{message && <p className="form-message" role="status">{message}</p>}</div><p className="teradoc-note">Modèle sélectionné : <strong>{selected.name}</strong>. TeraDoc privilégie une mise en page sobre, des textes sélectionnables et une lecture claire.</p>
  </section>
}
