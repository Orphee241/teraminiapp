'use client'

import { useEffect, useRef, useState } from 'react'
import { createActionGate } from '../../lib/action-gate'
import PdfViewer from './PdfViewer'
import './invoice-bulk-selection.css'
import { Archive, FilePlus2, FileText, Pencil, Search, Trash2, X } from 'lucide-react'

type DocumentKind = 'devis' | 'facture'
type DocumentRecord = { id: number; type_document: string; numero: string; statut: string; montant: number; notes?: string; created_at?: string }

export default function InvoiceCenter({ initData, onClose, onCreate, onEdit, onCreateFromQuote, onBackReady = () => undefined, archiveRefresh = null }: { initData: string; onClose: () => void; onCreate: (kind?: DocumentKind) => void; onEdit: (kind?: DocumentKind, document?: DocumentRecord) => void; onCreateFromQuote?: (document: DocumentRecord) => void; onBackReady?: (handler: () => void) => void; archiveRefresh?: { kind: DocumentKind; key: number } | null }) {
  const [screen, setScreen] = useState<'hub' | 'list'>('hub')
  const [archiveKind, setArchiveKind] = useState<DocumentKind>('devis')
  const [documents, setDocuments] = useState<DocumentRecord[]>([])
  const [archivePage, setArchivePage] = useState(1)
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<DocumentRecord | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const [bulkDeleteConfirmation, setBulkDeleteConfirmation] = useState(false)
  const [menu, setMenu] = useState<DocumentRecord | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<DocumentRecord | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [editBusy, setEditBusy] = useState(false)
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const loaded = useRef(false)
  const loadRequestId = useRef(0)
  const currentSearch = useRef('')
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const removeGate = useRef(createActionGate())
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const suppressClick = useRef(false)
  const handleBack = useRef<() => void>(() => undefined)
  const archiveCache = useRef(new Map<string, { documents: DocumentRecord[]; expiresAt: number }>())
  const cacheTtlMs = 30_000

  const kindLabel = (kind: DocumentKind) => kind === 'devis' ? 'devis' : 'facture'
  const kindTitle = (kind: DocumentKind) => kind === 'devis' ? 'Devis' : 'Facture'
  const matchesKind = (document: DocumentRecord, kind: DocumentKind) => {
    const value = String(document.type_document || '').toLowerCase()
    return value === kind || value === `document_${kind}` || value.includes(kind)
  }
  const visibleDocuments = documents.filter(document => matchesKind(document, archiveKind))
  const pageSize = 4
  const pageCount = Math.max(1, Math.ceil(visibleDocuments.length / pageSize))
  const currentPage = Math.min(archivePage, pageCount)
  const pageDocuments = visibleDocuments.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const onBack = () => handleBack.current()
  useEffect(() => {
    handleBack.current = () => {
      if (bulkDeleteConfirmation) { setBulkDeleteConfirmation(false); return }
      if (confirmDelete) { setConfirmDelete(null); return }
      if (menu) { setMenu(null); return }
      if (selected) { setSelected(null); return }
      if (screen === 'list') { setSelectedIds(new Set()); setSelectionMode(false); setScreen('hub'); setSearch(''); return }
      onClose()
    }
    onBackReady(onBack)
  }, [bulkDeleteConfirmation, confirmDelete, menu, onBackReady, onClose, screen, selected, selectionMode])

  const load = async (nextSearch = search, nextKind = archiveKind) => {
    const requestId = ++loadRequestId.current
    const normalizedSearch = nextSearch.trim()
    currentSearch.current = normalizedSearch
    const cacheKey = `${nextKind}:${normalizedSearch}`
    const cached = archiveCache.current.get(cacheKey)
    if (cached && cached.expiresAt > Date.now()) {
      setDocuments(cached.documents)
      setRefreshing(false)
      setLoading(false)
      setError('')
      return
    }
    setLoading(true)
    setRefreshing(Boolean(documents.length))
    setError('')
    try {
      const query = new URLSearchParams({ search: normalizedSearch, status: 'genere', document_type: nextKind })
      const response = await fetch(`/api/documents?${query}`, { headers: { 'x-telegram-init-data': initData }, cache: 'no-store' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || data.detail || `Impossible de charger vos ${kindLabel(nextKind)}.`)
      if (requestId === loadRequestId.current) {
        const nextDocuments = Array.isArray(data.documents) ? data.documents : []
        archiveCache.current.set(cacheKey, { documents: nextDocuments, expiresAt: Date.now() + cacheTtlMs })
        setDocuments(nextDocuments)
      }
    } catch (reason) {
      if (requestId === loadRequestId.current) setError(reason instanceof Error ? reason.message : `Impossible de charger vos ${kindLabel(nextKind)}.`)
    } finally {
      setRefreshing(false)
      if (requestId === loadRequestId.current) setLoading(false)
    }
  }

  useEffect(() => {
    if (screen === 'list' && !loaded.current) {
      loaded.current = true
      setArchivePage(1)
      void load()
    }
  }, [screen, archiveKind])

  useEffect(() => {
    if (!archiveRefresh) return
    setArchiveKind(archiveRefresh.kind)
    setArchivePage(1)
    setScreen('list')
    setSearch('')
    setSelected(null)
    setSelectedIds(new Set())
    setSelectionMode(false)
    setBulkDeleteConfirmation(false)
    setMenu(null)
    loaded.current = true
    archiveCache.current.clear()
    void load('', archiveRefresh.kind)
  }, [archiveRefresh?.key])

  useEffect(() => {
    if (screen !== 'list' || !loaded.current) return
    const nextSearch = search.trim()
    if (nextSearch === currentSearch.current) return
    if (searchTimer.current) clearTimeout(searchTimer.current)
    setArchivePage(1)
    searchTimer.current = setTimeout(() => { void load(nextSearch, archiveKind) }, 250)
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current) }
  }, [search, archiveKind, screen])

  const openArchive = (kind: DocumentKind) => {
    setArchiveKind(kind)
    setScreen('list')
    loaded.current = false
    setArchivePage(1)
    setError('')
  }

  const changeArchiveKind = (kind: DocumentKind) => {
    setArchiveKind(kind)
    setArchivePage(1)
    setSearch('')
    setSelected(null)
    setSelectedIds(new Set())
    setSelectionMode(false)
    archiveCache.current.clear()
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
    pressTimer.current = setTimeout(() => {
      suppressClick.current = true
      setMenu(document)
    }, 550)
  }
  const editDocument = async (document: DocumentRecord) => {
    setEditBusy(true)
    try {
      const response = await fetch(`/api/documents/${document.id}`, { headers: { 'x-telegram-init-data': initData }, cache: 'no-store' })
      const data = await response.json().catch(() => ({}))
      if (response.ok) {
        const complete = (data.document || data) as DocumentRecord
        onEdit(archiveKind, { ...document, ...complete })
      } else {
        onEdit(archiveKind, document)
      }
    } catch {
      onEdit(archiveKind, document)
    } finally {
      setEditBusy(false)
      setMenu(null)
    }
  }
  const cancelLongPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current)
    pressTimer.current = null
  }

  const toggleDocumentSelection = (documentId: number) => {
    setSelectionMode(true)
    setSelectedIds(previous => {
      const next = new Set(previous)
      if (next.has(documentId)) next.delete(documentId)
      else next.add(documentId)
      return next
    })
  }
  const cancelSelection = () => { setSelectionMode(false); setSelectedIds(new Set()); setBulkDeleteConfirmation(false) }
  const toggleSelectAll = () => {
    const selectableDocuments = visibleDocuments
    const selectableIds = selectableDocuments.map(document => document.id)
    const allSelected = selectableIds.length > 0 && selectableIds.every(id => selectedIds.has(id))
    setSelectedIds(previous => {
      const next = new Set(previous)
      for (const id of selectableIds) {
        if (allSelected) next.delete(id)
        else next.add(id)
      }
      return next
    })
    setSelectionMode(true)
  }
  const removeSelected = async () => {
    const targets = visibleDocuments.filter(document => selectedIds.has(document.id))
    if (!targets.length || removeGate.current.busy) return
    return removeGate.current.run(async () => {
      setDeleteBusy(true)
      const previousDocuments = documents
      setDocuments(previous => previous.filter(document => !selectedIds.has(document.id)))
      archiveCache.current.clear()
      try {
        const results = await Promise.all(targets.map(async target => {
          const response = await fetch(`/api/documents/${target.id}`, { method: 'DELETE', headers: { 'x-telegram-init-data': initData } })
          return { target, response }
        }))
        const failedIds = new Set(results.filter(result => !result.response.ok).map(result => result.target.id))
        if (failedIds.size) {
          setDocuments(previousDocuments.filter(document => !selectedIds.has(document.id) || failedIds.has(document.id)))
          setError(`${failedIds.size} suppression${failedIds.size > 1 ? 's ont' : ' a'} échoué${failedIds.size > 1 ? 's' : ''}. Les documents concernés restent dans la liste.`)
          setSelectedIds(failedIds)
          setSelectionMode(failedIds.size > 0)
        } else {
          setError('')
          setSelectedIds(new Set())
          setSelectionMode(false)
        }
        setBulkDeleteConfirmation(false)
      } catch {
        setDocuments(previousDocuments)
        setError('Impossible de supprimer les documents sélectionnés. Ils sont conservés dans la liste.')
        setSelectedIds(new Set(targets.map(document => document.id)))
        setSelectionMode(true)
      } finally {
        setDeleteBusy(false)
      }
    })
  }
  const remove = async () => {
    const target = confirmDelete
    if (!target || removeGate.current.busy) return
    return removeGate.current.run(async () => {
    setDeleteBusy(true)
    const previousDocuments = documents
    // Optimistic UI: hide the row immediately after confirmation. If the
    // authoritative request fails, restore the exact previous list.
    setDocuments(previous => previous.filter(document => document.id !== target.id))
    archiveCache.current.clear()
    try {
      const response = await fetch(`/api/documents/${target.id}`, { method: 'DELETE', headers: { 'x-telegram-init-data': initData } })
      if (!response.ok) {
        setDocuments(previousDocuments)
        setError(`Impossible de supprimer cette ${kindLabel(archiveKind)}.`)
        return
      }
      setConfirmDelete(null)
      setError('')
      // The authoritative DELETE already completed. Do not immediately fetch the
      // whole archive again: that caused a second visible loading phase after
      // every successful deletion. The local list is now synchronized.
    } catch {
      setDocuments(previousDocuments)
      setError(`Impossible de supprimer cette ${kindLabel(archiveKind)}.`)
    } finally {
      setDeleteBusy(false)
    }
    })
  }

  return <section className="invoice-page" aria-label="Devis et factures">
    {screen === 'hub' ? <>
      <div className="sheet-heading"><div><p className="eyebrow accent">SERVICE</p><h2>Devis et Facture</h2></div></div>
      <div className="invoice-hub">
        <button className="action-card" onClick={() => onCreate('devis')}><span className="action-icon"><FilePlus2 size={20} /></span><span className="action-type">Document</span><strong>Créer un devis</strong></button>
        <button className="action-card" onClick={() => onCreate('facture')}><span className="action-icon"><FilePlus2 size={20} /></span><span className="action-type">Document</span><strong>Créer une facture</strong></button>
        <button className="action-card archive-action" onClick={() => openArchive('devis')}><span className="action-icon"><Archive size={20} /></span><span className="action-type">Archives</span><strong>Voir mes devis et factures</strong></button>
      </div>
    </> : <>
      <div className="sheet-heading"><div><p className="eyebrow accent">ARCHIVES</p><h2>Mes {archiveKind === 'devis' ? 'devis' : 'factures'}</h2></div></div>
      <div className="archive-switcher"><button className={archiveKind === 'devis' ? 'active' : ''} onClick={() => changeArchiveKind('devis')}>Mes devis</button><button className={archiveKind === 'facture' ? 'active' : ''} onClick={() => changeArchiveKind('facture')}>Mes factures</button></div>
      <div className="invoice-toolbar"><div className="invoice-search"><Search size={16} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder="Rechercher..." aria-label="Rechercher dans les devis et factures" /></div>{refreshing && <span className="refresh-indicator" role="status"><span className="inline-spinner" aria-hidden="true" /> Actualisation…</span>}<div className="archive-bulk-controls">{selectionMode ? <><span>{selectedIds.size} sélectionné{selectedIds.size > 1 ? 's' : ''}</span><button type="button" onClick={toggleSelectAll}>{visibleDocuments.length > 0 && visibleDocuments.every(document => selectedIds.has(document.id)) ? 'Tout désélectionner' : 'Tout sélectionner'}</button><button type="button" onClick={cancelSelection}>Annuler</button><button type="button" className="danger-button" disabled={!selectedIds.size || deleteBusy} aria-label={`Supprimer les ${selectedIds.size} sélectionnés`} onClick={() => setBulkDeleteConfirmation(true)}><Trash2 size={15} /> Supprimer ({selectedIds.size})</button></> : <button type="button" onClick={() => setSelectionMode(true)}>Sélectionner des documents</button>}</div></div>
      <div className="invoice-list">{loading && !visibleDocuments.length ? <p className="empty-state" role="status"><span className="inline-spinner" aria-hidden="true" /> Chargement de vos {kindLabel(archiveKind)}…</p> : error && !visibleDocuments.length ? <p className="empty-state">{error}</p> : visibleDocuments.length ? <>{loading && <p className="pdf-status" role="status">Actualisation…</p>}{error && <p className="pdf-status pdf-error" role="status">{error}</p>}{pageDocuments.map(document => selectionMode ? <div className={`invoice-row invoice-row-selectable ${selectedIds.has(document.id) ? 'selected' : ''}`} key={document.id} onPointerDown={() => beginLongPress(document)} onPointerUp={cancelLongPress} onPointerCancel={cancelLongPress} onPointerLeave={cancelLongPress} onClick={event => { if (suppressClick.current) { suppressClick.current = false; return } if ((event.target as HTMLElement).closest('input[type="checkbox"]')) return; toggleDocumentSelection(document.id) }} onContextMenu={event => { event.preventDefault(); cancelLongPress() }}><input type="checkbox" aria-label={`Sélectionner ${document.numero}`} checked={selectedIds.has(document.id)} onChange={() => toggleDocumentSelection(document.id)} /><span className="invoice-row-icon"><FileText size={18} /></span><span><strong>{document.numero}</strong><small>{title(document)} · {document.montant.toLocaleString('fr-FR')} FCFA</small></span><span className="invoice-row-status">{document.statut}</span></div> : <button className="invoice-row" key={document.id} onPointerDown={() => beginLongPress(document)} onPointerUp={cancelLongPress} onPointerCancel={cancelLongPress} onPointerLeave={cancelLongPress} onClick={() => { if (suppressClick.current) { suppressClick.current = false; return } setSelected(document) }} onContextMenu={event => { event.preventDefault(); cancelLongPress(); setMenu(document) }}><span className="invoice-row-icon"><FileText size={18} /></span><span><strong>{document.numero}</strong><small>{title(document)} · {document.montant.toLocaleString('fr-FR')} FCFA</small></span><span className="invoice-row-status">{document.statut}</span></button>)}</> : <p className="empty-state">Aucun {kindLabel(archiveKind)} généré.</p>}</div>{pageCount > 1 && <nav className="invoice-pagination" aria-label={`Pagination des ${kindLabel(archiveKind)}`}><button type="button" disabled={currentPage === 1} onClick={() => setArchivePage(page => Math.max(1, page - 1))}>Précédent</button><span>Page {currentPage} / {pageCount}</span><button type="button" disabled={currentPage === pageCount} onClick={() => setArchivePage(page => Math.min(pageCount, page + 1))}>Suivant</button></nav>}
    </>}

    {selected && <div className="detail-backdrop" onMouseDown={() => setSelected(null)}><section className="detail-sheet" onMouseDown={event => event.stopPropagation()}><div className="sheet-heading"><div><p className="eyebrow accent">APERÇU</p><h2>{selected.numero}</h2></div><button className="close-button" onClick={() => setSelected(null)} aria-label="Fermer"><X size={20} /></button></div><PdfViewer src={`/api/documents/${selected.id}/pdf`} title={selected.numero} initData={initData} />{archiveKind === 'devis' && onCreateFromQuote && <button className="primary-button invoice-from-quote" type="button" onClick={() => { onCreateFromQuote(selected); setSelected(null) }}>Générer la facture</button>}</section></div>}
    {menu && <div className="context-backdrop" onMouseDown={() => setMenu(null)}><section className="context-menu" onMouseDown={event => event.stopPropagation()}><p className="action-sheet-title">{menu.numero}</p><button disabled={editBusy} onClick={() => void editDocument(menu)}><Pencil size={17} /> {editBusy ? <><span className="inline-spinner" aria-hidden="true" /> Chargement…</> : <><Pencil size={17} /> Modifier</>}</button><button className="danger-action" onClick={() => { setConfirmDelete(menu); setMenu(null) }}><Trash2 size={17} /> Supprimer</button></section></div>}
    {bulkDeleteConfirmation && <div className="detail-backdrop confirm-backdrop" onMouseDown={() => !deleteBusy && setBulkDeleteConfirmation(false)}><section className="confirm-sheet confirm-sheet-compact" onMouseDown={event => event.stopPropagation()}><h2>Supprimer {selectedIds.size} document{selectedIds.size > 1 ? 's' : ''} ?</h2><p>Les suppressions sont irréversibles.</p><div className="confirm-actions"><button type="button" className="secondary-button" disabled={deleteBusy} onClick={() => setBulkDeleteConfirmation(false)}>Annuler</button><button type="button" className="danger-button" disabled={deleteBusy || !selectedIds.size} onClick={() => void removeSelected()}>{deleteBusy ? <><span className="inline-spinner" aria-hidden="true" /> Suppression…</> : `Supprimer les ${selectedIds.size}`}</button></div></section></div>}
    {confirmDelete && <div className="detail-backdrop confirm-backdrop" onMouseDown={() => !deleteBusy && setConfirmDelete(null)}><section className="confirm-sheet confirm-sheet-compact" onMouseDown={event => event.stopPropagation()}><h2>Supprimer le {kindLabel(archiveKind)} ?</h2><p><strong>{confirmDelete.numero}</strong><br />Cette action est irréversible.</p><div className="confirm-actions"><button type="button" className="secondary-button" disabled={deleteBusy} onClick={() => setConfirmDelete(null)}>Annuler</button><button type="button" className="danger-button" disabled={deleteBusy} onClick={remove}>{deleteBusy ? <><span className="inline-spinner" aria-hidden="true" /> Suppression…</> : 'Supprimer'}</button></div></section></div>}
  </section>
}
