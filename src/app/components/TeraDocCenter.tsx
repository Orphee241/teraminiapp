'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Download, FileText, Save } from 'lucide-react'
import PdfViewer from './PdfViewer'
import { pickPdfFile, savePdf } from '../../lib/document-download'
import { TERADOC_TEMPLATES, type TeraDocTemplateId } from '../../modules/teradoc/templates'
import { validateTeraDocForm, type TeraDocFormErrors } from '../../lib/teradoc-form-validation'

type Props = { initData: string; onClose: () => void; documentId?: string }

type CvDraft = {
  templateId: TeraDocTemplateId; fullName: string; headline: string; email: string; phone: string; location: string; summary: string
  experience: { role: string; company: string; startDate: string; description: string }[]
  education: { degree: string; institution: string }[]; skills: string[]; languages: { language: string; level: string }[]; certifications: string[]
}

const emptyDraft: CvDraft = { templateId: 'essential', fullName: '', headline: '', email: '', phone: '', location: '', summary: '', experience: [{ role: '', company: '', startDate: '', description: '' }], education: [{ degree: '', institution: '' }], skills: [], languages: [], certifications: [] }
const blankExperience = () => ({ role: '', company: '', startDate: '', description: '' })
const blankEducation = () => ({ degree: '', institution: '' })

export default function TeraDocCenter({ initData, onClose, documentId: initialDocumentId }: Props) {
  const [documentId, setDocumentId] = useState(initialDocumentId || '')
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
  const [step, setStep] = useState(0)
  const steps = ['Informations personnelles', 'Expérience principale', 'Formation et compétences']
  const selected = useMemo(() => TERADOC_TEMPLATES.find(item => item.id === draft.templateId) || TERADOC_TEMPLATES[0], [draft.templateId])
  const payload = useMemo(() => ({ ...draft, skills: skillsText.split(',').map(value => value.trim()).filter(Boolean) }), [draft, skillsText])
  const previewPayloadKey = useMemo(() => JSON.stringify(payload), [payload])
  const previewReady = previewStatus === 'ready' && Boolean(previewBytes) && previewFingerprint === previewPayloadKey
  const validation = useMemo(() => validateTeraDocForm({ fullName: draft.fullName, headline: draft.headline, email: draft.email, phone: draft.phone, location: draft.location, summary: draft.summary, role: draft.experience[0].role, company: draft.experience[0].company, startDate: draft.experience[0].startDate, description: draft.experience[0].description, degree: draft.education[0].degree, institution: draft.education[0].institution, skills: skillsText }), [draft, skillsText])
  const stepKeys: (keyof TeraDocFormErrors)[][] = [['fullName', 'headline', 'email', 'phone', 'location', 'summary'], ['role', 'company', 'startDate', 'description'], ['degree', 'institution', 'skills']]
  const clearError = (key: keyof TeraDocFormErrors) => setErrors(previous => { if (!previous[key]) return previous; const next = { ...previous }; delete next[key]; return next })
  const update = (key: keyof CvDraft, value: string) => { setDraft(previous => ({ ...previous, [key]: value })); clearError(key as keyof TeraDocFormErrors) }
  const updateExperience = (index: number, key: string, value: string) => { setDraft(previous => ({ ...previous, experience: previous.experience.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item) })); clearError(key as keyof TeraDocFormErrors) }
  const updateEducation = (index: number, key: string, value: string) => { setDraft(previous => ({ ...previous, education: previous.education.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item) })); clearError(key as keyof TeraDocFormErrors) }
  const addExperience = () => setDraft(previous => ({ ...previous, experience: [...previous.experience, blankExperience()] }))
  const removeExperience = (index: number) => setDraft(previous => ({ ...previous, experience: previous.experience.length > 1 ? previous.experience.filter((_, itemIndex) => itemIndex !== index) : previous.experience }))
  const addEducation = () => setDraft(previous => ({ ...previous, education: [...previous.education, blankEducation()] }))
  const removeEducation = (index: number) => setDraft(previous => ({ ...previous, education: previous.education.length > 1 ? previous.education.filter((_, itemIndex) => itemIndex !== index) : previous.education }))
  const goToFirstInvalidStep = (nextErrors: TeraDocFormErrors) => {
    const firstInvalidStep = stepKeys.findIndex(keys => keys.some(key => nextErrors[key]))
    if (firstInvalidStep >= 0) {
      setStep(firstInvalidStep)
      window.setTimeout(() => document.querySelector<HTMLElement>(`[data-teradoc-step="${firstInvalidStep}"] [aria-invalid="true"]`)?.focus(), 0)
    }
  }
  const goNext = () => {
    const currentErrors = Object.fromEntries(stepKeys[step].filter(key => validation[key]).map(key => [key, validation[key]])) as TeraDocFormErrors
    setErrors(previous => ({ ...previous, ...currentErrors }))
    if (Object.keys(currentErrors).length) {
      window.setTimeout(() => document.querySelector<HTMLElement>(`[data-teradoc-step="${step}"] [aria-invalid="true"]`)?.focus(), 0)
      return
    }
    setStep(value => Math.min(value + 1, steps.length - 1))
  }
  useEffect(() => {
    if (!initialDocumentId) return
    const controller = new AbortController()
    void fetch(`/api/teradoc/cv/${encodeURIComponent(initialDocumentId)}`, { headers: { 'x-telegram-init-data': initData }, cache: 'no-store', signal: controller.signal })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Impossible de charger le CV.')))
      .then(data => {
        const value = data.document?.payload
        if (!value) throw new Error('Impossible de charger le CV.')
        setDraft({ ...emptyDraft, ...value, experience: value.experience?.length ? value.experience : emptyDraft.experience, education: value.education?.length ? value.education : emptyDraft.education })
        setSkillsText(Array.isArray(value.skills) ? value.skills.join(', ') : '')
      })
      .catch(error => { if (!(error instanceof DOMException && error.name === 'AbortError')) setMessage(error instanceof Error ? error.message : 'Impossible de charger le CV.') })
    return () => controller.abort()
  }, [initialDocumentId, initData])
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
    if (Object.keys(validation).length) { setErrors(validation); setMessage('Complétez les champs signalés avant d’enregistrer votre CV.'); goToFirstInvalidStep(validation); return }
    setBusy(true); setMessage('')
    try {
      const response = await fetch(documentId ? `/api/teradoc/cv/${encodeURIComponent(documentId)}` : '/api/teradoc/cv', { method: documentId ? 'PUT' : 'POST', headers: { 'content-type': 'application/json', 'x-telegram-init-data': initData }, body: JSON.stringify(payload) })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(String(data.error || 'Impossible de sauvegarder le CV.'))
      if (data.document?.id) setDocumentId(String(data.document.id))
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
    <div className="teradoc-heading"><div><p className="eyebrow accent">TERADOC</p><h2 className="section-title">{documentId ? 'Modifier votre CV' : 'Créer un CV'}</h2><p className="lead compact">Un CV propre, lisible et adapté à votre parcours.</p></div><span className="teradoc-mark"><FileText size={22} /></span></div>
    <label className="teradoc-template-select">Modèle de CV<select data-compact="true" value={draft.templateId} onChange={event => setDraft(previous => ({ ...previous, templateId: event.target.value as TeraDocTemplateId }))}>{TERADOC_TEMPLATES.map((template, index) => <option key={template.id} value={template.id}>Modèle {index + 1} — {template.name}</option>)}</select></label>
    <div className="teradoc-live-preview" aria-label="Prévisualisation du CV"><div className="teradoc-live-preview-head"><span>PRÉVISUALISATION A4</span><small>Le PDF affiché est exactement celui qui sera téléchargé.</small><button className="teradoc-preview-download" type="button" onClick={() => void downloadPdf()} disabled={!previewReady || downloadBusy} aria-label="Télécharger le CV"><Download size={16} />{downloadBusy ? 'Préparation…' : 'Télécharger le CV'}</button></div><div className="teradoc-preview-stage" aria-busy={previewStatus === 'loading'}>{previewReady && previewBytes ? <PdfViewer key={previewVersion} src={`teradoc-live:${previewVersion}`} title="Aperçu réel du CV au format A4" initData={initData} pdfData={previewBytes} hideDownload /> : <div className="teradoc-preview-placeholder" role="status">{previewStatus === 'loading' ? 'Génération de votre aperçu A4…' : previewStatus === 'error' ? previewMessage : 'Complétez les champs indispensables pour afficher votre CV au format A4.'}</div>}</div></div>
    <nav className="teradoc-stepper" aria-label="Étapes du CV">{steps.map((label, index) => <button key={label} type="button" className={index === step ? 'is-current' : index < step ? 'is-complete' : ''} aria-current={index === step ? 'step' : undefined} onClick={() => index <= step && setStep(index)} disabled={index > step}><span>{index < step ? <Check size={15} aria-hidden="true" /> : index + 1}</span><strong>{label}</strong></button>)}</nav>
    <div className="teradoc-form-card" data-teradoc-step="0" hidden={step !== 0}><div className="teradoc-section-title"><h3>Informations personnelles</h3><small>Les champs avec * sont indispensables.</small></div><div className="teradoc-form-grid"><label className={errors.fullName ? 'has-error' : ''}>Nom complet <span className="required-mark" aria-hidden="true">*</span><input required aria-invalid={Boolean(errors.fullName)} aria-describedby={errors.fullName ? 'teradoc-error-fullName' : undefined} value={draft.fullName} onChange={event => update('fullName', event.target.value)} placeholder="Ex. Aline Mba" />{errors.fullName && <small id="teradoc-error-fullName" className="teradoc-field-error">{errors.fullName}</small>}</label><label className={errors.headline ? 'has-error' : ''}>Titre professionnel <span className="required-mark" aria-hidden="true">*</span><input required aria-invalid={Boolean(errors.headline)} value={draft.headline} onChange={event => update('headline', event.target.value)} placeholder="Ex. Responsable administrative" />{errors.headline && <small className="teradoc-field-error">{errors.headline}</small>}</label><label className={errors.email ? 'has-error' : ''}>Email <span className="required-mark" aria-hidden="true">*</span><input required type="email" aria-invalid={Boolean(errors.email)} value={draft.email} onChange={event => update('email', event.target.value)} />{errors.email && <small className="teradoc-field-error">{errors.email}</small>}</label><label className={errors.phone ? 'has-error' : ''}>Téléphone <span className="required-mark" aria-hidden="true">*</span><input required aria-invalid={Boolean(errors.phone)} value={draft.phone} onChange={event => update('phone', event.target.value)} />{errors.phone && <small className="teradoc-field-error">{errors.phone}</small>}</label><label className={errors.location ? 'has-error' : ''}>Ville / pays <span className="required-mark" aria-hidden="true">*</span><input required aria-invalid={Boolean(errors.location)} value={draft.location} onChange={event => update('location', event.target.value)} />{errors.location && <small className="teradoc-field-error">{errors.location}</small>}</label></div><label className={errors.summary ? 'has-error' : ''}>Résumé professionnel <span className="required-mark" aria-hidden="true">*</span><textarea required aria-invalid={Boolean(errors.summary)} value={draft.summary} onChange={event => update('summary', event.target.value)} rows={4} placeholder="Présentez votre profil en quelques lignes." />{errors.summary && <small className="teradoc-field-error">{errors.summary}</small>}</label></div>
    <div className="teradoc-form-card" data-teradoc-step="1" hidden={step !== 1}><div className="teradoc-section-title"><h3>Expérience principale</h3><small>Ajoutez autant d’expériences que nécessaire.</small></div>{draft.experience.map((item, index) => <div className="teradoc-repeatable" key={index}><div className="teradoc-repeatable-heading"><h4>Expérience {index + 1}</h4>{index > 0 && <button type="button" className="teradoc-remove" aria-label={`Supprimer expérience ${index + 1}`} onClick={() => removeExperience(index)}>Supprimer</button>}</div><div className="teradoc-form-grid"><label>Poste <input required value={item.role} onChange={event => updateExperience(index, 'role', event.target.value)} /></label><label>Entreprise <input required value={item.company} onChange={event => updateExperience(index, 'company', event.target.value)} /></label><label>Date de début <input required type="month" value={item.startDate} onChange={event => updateExperience(index, 'startDate', event.target.value)} /></label></div><label>Description <textarea required value={item.description} onChange={event => updateExperience(index, 'description', event.target.value)} rows={4} /></label></div>)}<button type="button" className="teradoc-add" onClick={addExperience}>+ Ajouter une expérience</button></div>
    <div className="teradoc-form-card" data-teradoc-step="2" hidden={step !== 2}><div className="teradoc-section-title"><h3>Formation et compétences</h3><small>Ajoutez vos formations puis séparez les compétences par des virgules.</small></div>{draft.education.map((item, index) => <div className="teradoc-repeatable" key={index}><div className="teradoc-repeatable-heading"><h4>Formation {index + 1}</h4>{index > 0 && <button type="button" className="teradoc-remove" aria-label={`Supprimer formation ${index + 1}`} onClick={() => removeEducation(index)}>Supprimer</button>}</div><div className="teradoc-form-grid"><label>Diplôme / formation <input required value={item.degree} onChange={event => updateEducation(index, 'degree', event.target.value)} /></label><label>Établissement <input required value={item.institution} onChange={event => updateEducation(index, 'institution', event.target.value)} /></label></div></div>)}<button type="button" className="teradoc-add" onClick={addEducation}>+ Ajouter une formation</button><label className={errors.skills ? 'has-error' : ''}>Compétences <span className="required-mark" aria-hidden="true">*</span><input required aria-invalid={Boolean(errors.skills)} value={skillsText} onChange={event => { setSkillsText(event.target.value); clearError('skills') }} placeholder="Organisation, Excel, Gestion de projet" />{errors.skills && <small className="teradoc-field-error">{errors.skills}</small>}</label></div>
    <div className="teradoc-actions"><button type="button" className="teradoc-previous" onClick={() => setStep(value => Math.max(0, value - 1))} disabled={step === 0}><ArrowLeft size={17} />Étape précédente</button>{step < steps.length - 1 ? <button className="primary-button" type="button" onClick={goNext}><ArrowRight size={17} />Étape suivante</button> : <button className="primary-button" type="button" disabled={busy} onClick={saveDraft}><Save size={17} />{busy ? 'Enregistrement…' : 'Enregistrer le brouillon'}</button>}{message && <p className="form-message" role="status">{message}</p>}</div><p className="teradoc-note">Modèle sélectionné : <strong>Model {TERADOC_TEMPLATES.findIndex(item => item.id === draft.templateId) + 1}</strong>. TeraDoc privilégie une mise en page sobre, des textes sélectionnables et une lecture claire.</p>
  </section>
}
