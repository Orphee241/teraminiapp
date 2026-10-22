'use client'

import { useEffect, useRef, useState } from 'react'
import { createActionGate } from '../../lib/action-gate'
import PdfViewer from './PdfViewer'
import { Archive, ArrowLeft, FilePlus2, FileText, Pencil, Search, Trash2, X } from 'lucide-react'

type DocumentKind = 'devis' | 'facture'
type DocumentRecord = { id: number; type_document: string; numero: string; statut: string; montant: number; notes?: string; created_at?: string }

export default function InvoiceCenter({ initData, onClose, onCreate, onEdit }: { initData: string; onClose: () => void; onCreate: (kind?: DocumentKind) => void; onEdit: (kind?: DocumentKind, document?: DocumentRecord) => void }) {
  const [screen, setScreen] = useState<'hub' | 'list'>('hub')
  const [archiveKind, setArchiveKind] = useState<DocumentKind>('devis')
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<DocumentRecord | null>(null)
  const [menu, setMenu] = useState<DocumentRecord | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<DocumentRecord | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const loaded = useRef(false)
  const loadGate = useRef(createActionGate())
  const removeGate = useRef(createActionGate())
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suppressClick = useRef(false)

  const kindLabel = (kind: DocumentKind) => kind === 'devis' ? 'devis' : 'facture'
  const kindTitle = (kind: DocumentKind) => kind === 'devis' ? 'Devis' : 'Facture'
  const matchesKind = (document: DocumentRecord, kind: DocumentKind) => {
    const value = String(document.type_document || '').toLowerCase()
    return value === kind || value === `document_${kind}` || value.includes(kind)
  }
  const visibleDocuments = documents.filter(document => matchesKind(document, archiveKind))

  const load = async () => {
    if (loadGate.current.busy) return
    return loadGate.current.run(async () => {
    setLoading(true)
    setError('')
    try {
      const query = new URLSearchParams({ search, status: 'genere' })
      const response = await fetch(`/api/documents?${query}`, { headers: { 'x-telegram-init-data': initData }, cache: 'no-store' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || data.detail || `Impossible de charger vos ${kindLabel(archiveKind)}.`)
      setDocuments(Array.isArray(data.documents) ? data.documents : [])
    } catch (reason) {
      setDocuments([])
      setError(reason instanceof Error ? reason.message : `Impossible de charger vos ${kindLabel(archiveKind)}.`)
    } finally {
      setLoading(false)
    }
    })
  }

  useEffect(() => {
    if (screen === 'list' && !loaded.current) {
      loaded.current = true
      void load()
    }
  }, [screen])

  const openArchive = (kind: DocumentKind) => {
    setArchiveKind(kind)
    setScreen('list')
    loaded.current = false
  }

  const title = (document: DocumentRecord) => {
    try {
      return JSON.parse(document.notes || '{}').items?.[0]?.designation || kindTitle(archiveKind)
    } catch {
      return kindTitle(archiveKind)
    }
  }

  const beginLongPress = (document: DocumentRecord) => {
    suppressClick.current = false
    pressTimer.current = setTimeout(() => { suppressClick.current = true; setMenu(document) }, 550)
  }
  const cancelLongPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current)
    pressTimer.current = null
  }

  const remove = async () => {
    const target = confirmDelete
    if (!target || removeGate.current.busy) return
    return removeGate.current.run(async () => {
    setDeleteBusy(true)
    try {
    const response = await fetch(`/api/documents/${target.id}`, { method: 'DELETE', headers: { 'x-telegram-init-data': initData } })
    if (!response.ok) {
      setError(`Impossible de supprimer cette ${kindLabel(archiveKind)}.`)
      return
    }
    setConfirmDelete(null)
    await load()
    } finally {
      setDeleteBusy(false)
    }
    })
  }

  return <section className="invoice-page" aria-label="Devis et factures">
    {screen === 'hub' ? <>
      <button className="back-link invoice-back" onClick={onClose} aria-label="Retour aux services"><ArrowLeft size={16} /> Retour</button>
      <div className="sheet-heading"><div><p className="eyebrow accent">SERVICE</p><h2>Devis et Facture</h2></div><button className="close-button" onClick={onClose} aria-label="Fermer"><X size={20} /></button></div>
      <div className="invoice-hub">
        <button className="action-card" onClick={() => onCreate('devis')}><span className="action-icon"><FilePlus2 size={20} /></span><span className="action-type">Document</span><strong>Créer un devis</strong></button>
        <button className="action-card" onClick={() => onCreate('facture')}><span className="action-icon"><FilePlus2 size={20} /></span><span className="action-type">Document</span><strong>Créer une facture</strong></button>
        <button className="action-card archive-action" onClick={() => openArchive('devis')}><span className="action-icon"><Archive size={20} /></span><span className="action-type">Archives</span><strong>Voir mes devis et factures</strong></button>
      </div>
    </> : <>
      <button className="back-link" onClick={() => setScreen('hub')}><ArrowLeft size={16} /> Devis et Facture</button>
      <div className="sheet-heading"><div><p className="eyebrow accent">ARCHIVES</p><h2>Mes {archiveKind === 'devis' ? 'devis' : 'factures'}</h2></div><button className="close-button" onClick={onClose} aria-label="Fermer"><X size={20} /></button></div>
      <div className="archive-switcher"><button className={archiveKind === 'devis' ? 'active' : ''} onClick={() => { setArchiveKind('devis'); void load() }}>Mes devis</button><button className={archiveKind === 'facture' ? 'active' : ''} onClick={() => { setArchiveKind('facture'); void load() }}>Mes factures</button></div>
      <div className="invoice-toolbar"><div className="invoice-search"><Search size={16} /><input value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => event.key === 'Enter' && void load()} placeholder="Rechercher..." /></div></div>
      <div className="invoice-list">{loading ? <p className="empty-state">Chargement de vos {kindLabel(archiveKind)}…</p> : error ? <p className="empty-state">{error}</p> : visibleDocuments.length ? visibleDocuments.map(document => <button className="invoice-row" key={document.id} onPointerDown={() => beginLongPress(document)} onPointerUp={cancelLongPress} onPointerCancel={cancelLongPress} onPointerLeave={cancelLongPress} onClick={() => { if (suppressClick.current) { suppressClick.current = false; return } setSelected(document) }} onContextMenu={event => { event.preventDefault(); cancelLongPress(); setMenu(document) }}><span className="invoice-row-icon"><FileText size={18} /></span><span><strong>{document.numero}</strong><small>{title(document)} · {document.montant.toLocaleString('fr-FR')} FCFA</small></span><span className="invoice-row-status">{document.statut}</span></button>) : <p className="empty-state">Aucun {kindLabel(archiveKind)} généré.</p>}</div>
    </>}

    {selected && <div className="detail-backdrop" onMouseDown={() => setSelected(null)}><section className="detail-sheet" onMouseDown={event => event.stopPropagation()}><div className="sheet-heading"><div><p className="eyebrow accent">APERÇU</p><h2>{selected.numero}</h2></div><button className="close-button" onClick={() => setSelected(null)} aria-label="Fermer"><X size={20} /></button></div><PdfViewer src={`/api/documents/${selected.id}/pdf`} title={selected.numero} initData={initData} /></section></div>}
    {menu && <div className="detail-backdrop" onMouseDown={() => setMenu(null)}><section className="action-sheet" onMouseDown={event => event.stopPropagation()}><p className="action-sheet-title">{menu.numero}</p><button onClick={() => { onEdit(archiveKind, menu); setMenu(null) }}><Pencil size={17} /> Modifier</button><button className="danger-action" onClick={() => { setConfirmDelete(menu); setMenu(null) }}><Trash2 size={17} /> Supprimer</button></section></div>}
    {confirmDelete && <div className="detail-backdrop" onMouseDown={() => !deleteBusy && setConfirmDelete(null)}><section className="confirm-sheet" onMouseDown={event => event.stopPropagation()}><div className="confirm-icon"><Trash2 size={22} /></div><p className="eyebrow danger-eyebrow">ATTENTION</p><h2>Supprimer cette {kindLabel(archiveKind)} ?</h2><p>Voulez-vous vraiment supprimer <strong>{confirmDelete.numero}</strong> ? Cette action est irréversible.</p><div className="confirm-actions"><button type="button" className="secondary-button" disabled={deleteBusy} onClick={() => setConfirmDelete(null)}>Non</button><button type="button" className="danger-button" disabled={deleteBusy} onClick={remove}>{deleteBusy ? 'Suppression…' : 'Oui, supprimer'}</button></div></section></div>}
  </section>
}
