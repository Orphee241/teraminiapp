'use client'

import React from 'react'
import { ArrowLeft, CheckCircle2, ChevronRight, FileText } from 'lucide-react'
import { TERADOC_DOCUMENT_TYPES, type TeraDocTemplateOption } from '../../modules/teradoc/document-catalog'
import TeraDocCenter from './TeraDocCenter'

type Props = { initData: string; onClose: () => void }
type View = 'catalog' | 'documents' | 'cv'
type CvDocument = { id: string; title: string; status: string; updated_at: string }

export default function TeraDocWorkspace({ initData, onClose }: Props) {
  const [view, setView] = React.useState<View>('catalog')
  const [notice, setNotice] = React.useState('')
  const [documents, setDocuments] = React.useState<CvDocument[]>([])
  const [documentsBusy, setDocumentsBusy] = React.useState(false)
  const [selectedDocumentId, setSelectedDocumentId] = React.useState<string>()

  const open = (option: TeraDocTemplateOption) => {
    if (!option.available) {
      setNotice('Ce modèle sera bientôt disponible dans TeraDoc.')
      return
    }
    if (option.documentType === 'cv') setView('cv')
  }

  const showDocuments = () => {
    setView('documents'); setDocumentsBusy(true)
    void fetch('/api/teradoc/cv', { headers: { 'x-telegram-init-data': initData }, cache: 'no-store' })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Impossible de charger vos CV.')))
      .then(data => setDocuments(Array.isArray(data.documents) ? data.documents : []))
      .catch(error => setNotice(error instanceof Error ? error.message : 'Impossible de charger vos CV.'))
      .finally(() => setDocumentsBusy(false))
  }

  if (view === 'cv') return <TeraDocCenter initData={initData} documentId={selectedDocumentId} onClose={() => setView('catalog')} />

  return <section className="teradoc-workspace" aria-label="TeraDoc">
    <button type="button" className="back-link" onClick={onClose}><ArrowLeft size={17} /> Retour aux services</button>
    <div className="teradoc-heading">
      <div><p className="eyebrow accent">TERADOC</p><h2 className="section-title">Vos documents</h2><p className="lead compact">Créez un document professionnel en quelques étapes, directement dans Telegram.</p></div>
      <span className="teradoc-mark"><FileText size={22} /></span>
    </div>
    <div className="teradoc-workspace-actions" aria-label="Actions TeraDoc">
      <button type="button" className="teradoc-workspace-action is-active"><FileText size={18} /><span><strong>Créer un document</strong><small>Choisir un modèle et commencer</small></span><CheckCircle2 size={17} /></button>
      <button type="button" className={`teradoc-workspace-action ${view === 'documents' ? 'is-active' : ''}`} onClick={showDocuments}><FileText size={18} /><span><strong>Mes documents</strong><small>Vos brouillons et versions enregistrées</small></span><CheckCircle2 size={17} /></button>
    </div>
    {view === 'documents' ? <div className="teradoc-document-grid" aria-label="Mes documents">
      {documentsBusy ? <p role="status">Chargement de vos documents…</p> : documents.length === 0 ? <p role="status">Aucun CV enregistré.</p> : documents.map(document => <button type="button" key={document.id} className="teradoc-document-card" onClick={() => { setSelectedDocumentId(document.id); setView('cv') }}>
        <span className="teradoc-document-icon"><FileText size={19} /></span><span className="teradoc-document-copy"><strong>{document.title || 'CV sans nom'}</strong><small>{document.status === 'GENERATED' ? 'Généré' : 'Brouillon'} · {new Date(document.updated_at).toLocaleDateString('fr-FR')}</small></span><ChevronRight size={19} />
      </button>)}
    </div> : <><div className="teradoc-catalog-heading"><div><strong>Choisissez un document</strong><small>Les modèles juridiques sont à relire et à adapter.</small></div></div>
    <div className="teradoc-document-grid" aria-label="Modèles TeraDoc">
      {TERADOC_DOCUMENT_TYPES.map(option => <button type="button" key={option.id} className={`teradoc-document-card ${option.available ? '' : 'is-disabled'}`} onClick={() => open(option)} aria-disabled={!option.available}>
        <span className="teradoc-document-icon"><FileText size={19} /></span>
        <span className="teradoc-document-copy"><strong>{option.name}</strong><small>{option.description}</small>{option.legalNotice && <em>Modèle à relire</em>}</span>
        <span className="teradoc-document-status">{option.available ? <ChevronRight size={19} /> : <small>Bientôt</small>}</span>
      </button>)}
    </div></>}
    {notice && <p className="teradoc-inline-notice" role="status">{notice}</p>}
  </section>
}
