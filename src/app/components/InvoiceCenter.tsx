'use client'

import { useEffect, useState } from 'react'
import PdfViewer from './PdfViewer'
import { Archive, ArrowLeft, Eye, FilePlus2, FileText, Pencil, Search, Trash2, X } from 'lucide-react'

type Invoice = { id: number; type_document: string; numero: string; statut: string; montant: number; notes?: string; created_at?: string }

export default function InvoiceCenter({ initData, onClose, onCreate, onEdit }: { initData: string; onClose: () => void; onCreate: () => void; onEdit: () => void }) {
  const [screen, setScreen] = useState<'hub' | 'list'>('hub')
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState<Invoice | null>(null)
  const [menu, setMenu] = useState<Invoice | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const load = async () => {
    setLoading(true); setError('')
    try {
      const query = new URLSearchParams({ search, status })
      const response = await fetch(`/api/documents?${query}`, { headers: { 'x-telegram-init-data': initData }, cache: 'no-store' })
      const data = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(data.error || data.detail || 'Impossible de charger vos factures.')
      setInvoices(Array.isArray(data.documents) ? data.documents : [])
    } catch (reason) {
      setInvoices([])
      setError(reason instanceof Error ? reason.message : 'Impossible de charger vos factures.')
    } finally { setLoading(false) }
  }
  useEffect(() => { if (screen === 'list') void load() }, [screen])
  const title = (invoice: Invoice) => { try { return JSON.parse(invoice.notes || '{}').items?.[0]?.designation || 'Facture Terainterface' } catch { return 'Facture Terainterface' } }
  const remove = async () => { if (!menu || !window.confirm(`Supprimer la facture ${menu.numero} ?`)) return; await fetch(`/api/documents/${menu.id}`, { method: 'DELETE', headers: { 'x-telegram-init-data': initData } }); setMenu(null); await load() }
  return <section className="invoice-page" aria-label="Factures">{screen === 'hub' ? <><button className="back-link invoice-back" onClick={onClose} aria-label="Retour aux services"><ArrowLeft size={16} /> Retour</button><div className="sheet-heading"><div><p className="eyebrow accent">SERVICE</p><h2>Facture</h2></div><button className="close-button" onClick={onClose} aria-label="Fermer"><X size={20} /></button></div><div className="invoice-hub"><button className="action-card" onClick={onCreate}><span className="action-icon"><FilePlus2 size={20} /></span><span className="action-type">Document</span><strong>Créer une facture</strong></button><button className="action-card" onClick={() => setScreen('list')}><span className="action-icon"><Archive size={20} /></span><span className="action-type">Archives</span><strong>Voir mes factures générées</strong></button></div></> : <><button className="back-link" onClick={() => setScreen('hub')}><ArrowLeft size={16} /> Facture</button><div className="sheet-heading"><div><p className="eyebrow accent">ARCHIVES</p><h2>Mes factures</h2></div><button className="close-button" onClick={onClose} aria-label="Fermer"><X size={20} /></button></div><div className="invoice-toolbar"><div className="invoice-search"><Search size={16} /><input value={search} onChange={event => setSearch(event.target.value)} onKeyDown={event => event.key === 'Enter' && void load()} placeholder="Rechercher..." /></div><select value={status} onChange={event => { setStatus(event.target.value); setTimeout(() => void load(), 0) }}><option value="">Tous les statuts</option><option value="genere">Générées</option><option value="supprime">Supprimées</option></select></div><div className="invoice-list">{loading ? <p className="empty-state">Chargement de vos factures…</p> : error ? <p className="empty-state">{error}</p> : invoices.length ? invoices.map(invoice => <button className="invoice-row" key={invoice.id} onClick={() => setSelected(invoice)} onContextMenu={event => { event.preventDefault(); setMenu(invoice) }}><span className="invoice-row-icon"><FileText size={18} /></span><span><strong>{invoice.numero}</strong><small>{title(invoice)} · {invoice.montant.toLocaleString('fr-FR')} FCFA</small></span><span className="invoice-status">{invoice.statut}</span></button>) : <p className="empty-state">Aucune facture générée.</p>}</div></>}{selected && <div className="detail-card"><button className="close-button" onClick={() => setSelected(null)} aria-label="Fermer"><X size={18} /></button><p className="eyebrow accent">FACTURE</p><h3>{selected.numero}</h3><p>{title(selected)}</p><strong>{selected.montant.toLocaleString('fr-FR')} FCFA</strong><PdfViewer title={`Aperçu de ${selected.numero}`} src={`/api/documents/${selected.id}/pdf`} /><p className="pdf-note"><Eye size={16} /> Aperçu affiché directement dans l’application</p></div>}{menu && <div className="context-backdrop" onMouseDown={() => setMenu(null)}><div className="context-menu" onMouseDown={event => event.stopPropagation()}><strong>{menu.numero}</strong><button onClick={() => { setSelected(menu); setMenu(null) }}><Eye size={16} /> Voir</button><button onClick={() => { setMenu(null); onEdit() }}><Pencil size={16} /> Modifier</button><button className="danger-action" onClick={() => void remove()}><Trash2 size={16} /> Supprimer</button></div></div>}</section>
}
