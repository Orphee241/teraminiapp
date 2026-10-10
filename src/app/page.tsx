'use client'

import { FormEvent, useEffect, useState } from 'react'
import { ArrowLeft, ClipboardList, FilePlus2, FileText, Headphones, Home, MessageCircle, Pencil, Plus, Settings, ShoppingBag, Trash2, User, X } from 'lucide-react'

type Tab = 'accueil' | 'services' | 'profil'
type DocumentKind = 'devis' | 'facture'
type TelegramWebApp = { initData: string; ready: () => void; expand: () => void; setHeaderColor?: (color: string) => void; setBackgroundColor?: (color: string) => void; BackButton?: { show: () => void; hide: () => void; onClick: (fn: () => void) => void; offClick: (fn: () => void) => void } }
declare global { interface Window { Telegram?: { WebApp?: TelegramWebApp } } }

const actions: { label: string; kind: DocumentKind; icon: typeof FileText }[] = [
  { label: 'Créer', kind: 'devis', icon: Plus }, { label: 'Modifier', kind: 'devis', icon: Pencil }, { label: 'Supprimer', kind: 'devis', icon: Trash2 },
  { label: 'Créer', kind: 'facture', icon: FilePlus2 }, { label: 'Modifier', kind: 'facture', icon: Pencil }, { label: 'Supprimer', kind: 'facture', icon: Trash2 },
]

export default function HomePage() {
  const [tab, setTab] = useState<Tab>('accueil')
  const [documentKind, setDocumentKind] = useState<DocumentKind>('facture')
  const [formOpen, setFormOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [initData, setInitData] = useState('')
  const [michelleOpen, setMichelleOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatBusy, setChatBusy] = useState(false)
  const [chatMessages, setChatMessages] = useState<{ role: 'user' | 'assistant'; text: string }[]>([])


  useEffect(() => {
    const webApp = window.Telegram?.WebApp
    if (!webApp) return
    webApp.ready(); webApp.expand(); webApp.setHeaderColor?.('#0a0a0f'); webApp.setBackgroundColor?.('#0a0a0f')
    setInitData(webApp.initData || '')
  }, [])

  const openCreate = (kind: DocumentKind) => { setDocumentKind(kind); setMessage(''); setFormOpen(true) }
  const closeForm = () => { if (!busy) setFormOpen(false) }
  const onAction = (label: string, kind: DocumentKind) => label === 'Créer' ? openCreate(kind) : setMessage(`${label} ${kind === 'devis' ? 'un devis' : 'une facture'} sera disponible prochainement.`)

  async function createDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage('')
    const form = new FormData(event.currentTarget); const quantity = Number(form.get('quantity') || 1); const unitPrice = Number(form.get('unit_price') || 0)
    const payload = { document_type: documentKind, issuer: { name: 'Terainterface', company: 'Terainterface', address: '', phone: '', tax_id: '' }, client: { name: String(form.get('client_name') || ''), company: String(form.get('client_company') || ''), address: String(form.get('client_address') || ''), phone: String(form.get('client_phone') || ''), tax_id: '' }, items: [{ designation: String(form.get('designation') || ''), quantity, unit_price: unitPrice }], template_profile: 'official', vat_applied: false, persist_crm: true, idempotency_key: `miniapp-${documentKind}-${Date.now()}-${Math.random().toString(36).slice(2)}` }
    try {
      const response = await fetch('/api/documents', { method: 'POST', headers: { 'content-type': 'application/json', 'x-telegram-init-data': initData }, body: JSON.stringify(payload) }); const data = await response.json()
      if (!response.ok) throw new Error(data.error || data.detail || 'La création a échoué.')
      setMessage(`${documentKind === 'devis' ? 'Devis' : 'Facture'} ${data.number ? `n° ${data.number} ` : ''}créé avec succès.`); event.currentTarget.reset()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'La création a échoué.') } finally { setBusy(false) }
  }

  async function sendToMichelle(event: FormEvent) {
    event.preventDefault(); const text = chatInput.trim(); if (!text || chatBusy) return
    setChatInput(''); setChatMessages(previous => [...previous, { role: 'user', text }]); setChatBusy(true)
    try {
      const response = await fetch('/api/michelle', { method: 'POST', headers: { 'content-type': 'application/json', 'x-telegram-init-data': initData }, body: JSON.stringify({ message: text }) }); const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Michelle est momentanément indisponible.')
      setChatMessages(previous => [...previous, { role: 'assistant', text: data.reply || 'Je vous écoute.' }])
    } catch (error) { setChatMessages(previous => [...previous, { role: 'assistant', text: error instanceof Error ? error.message : 'Une erreur est survenue.' }]) } finally { setChatBusy(false) }
  }

  return <main className="app-shell">
    <header className="app-header"><div className="brand-mark">T</div><div><p className="eyebrow">TERAINTERFACE</p><h1>Votre espace</h1></div><button className="header-icon" aria-label="Assistance" onClick={() => setTab('profil')}><Headphones size={19} /></button></header>
    <div className="content">
      {tab === 'accueil' && <section className="screen"><p className="eyebrow accent">ESPACE CLIENT</p><h2 className="hero-title">Bienvenue</h2><p className="lead">Gérez vos services, vos devis et vos factures depuis un seul espace.</p><div className="home-grid"><HomeCard icon={ShoppingBag} title="Services" text="Accéder à vos devis, factures et commandes." onClick={() => setTab('services')} /><HomeCard icon={MessageCircle} title="Michelle" text="Discuter directement avec notre assistante." onClick={() => { setChatMessages(previous => previous.length ? previous : [{ role: 'assistant', text: 'Bonjour, je suis Michelle, assistante de Terainterface. Comment puis-je vous aider ?' }]); setMichelleOpen(true) }} /></div><div className="info-strip"><span className="strip-icon"><FileText size={18} /></span><span><strong>Des documents professionnels</strong><small>Créez vos devis et factures en quelques secondes.</small></span></div></section>}
      {tab === 'services' && <section className="screen"><button className="back-link" onClick={() => setTab('accueil')}><ArrowLeft size={16} /> Accueil</button><p className="eyebrow accent">GESTION COMMERCIALE</p><h2 className="section-title">Services</h2><p className="lead compact">Tout ce qui concerne vos devis, factures et commandes.</p><div className="action-grid">{actions.map(({ label, kind, icon: Icon }) => <button className="action-card" key={`${label}-${kind}`} onClick={() => onAction(label, kind)}><span className="action-icon"><Icon size={21} /></span><span className="action-type">{kind}</span><strong>{label} {kind === 'devis' ? 'un devis' : 'une facture'}</strong></button>)}</div><button className="orders-card" onClick={() => setMessage('Le suivi des commandes sera bientôt disponible.')}><ClipboardList size={21} /><span><strong>Suivre mes commandes</strong><small>Consulter l’état de vos demandes</small></span><span className="chevron">›</span></button></section>}
      {tab === 'profil' && <section className="screen"><p className="eyebrow accent">ESPACE PERSONNEL</p><h2 className="section-title">Profil</h2><div className="profile-list"><ProfileRow icon={Settings} title="Paramètres" text="Gérer vos préférences et votre compte." /><ProfileRow icon={Headphones} title="Assistance" text="Obtenir de l’aide sur un service ou une commande." /><ProfileRow icon={MessageCircle} title="Nous contacter" text="Parler à Michelle sur Telegram." /></div></section>}
    </div>
    {message && <div className="toast" role="status"><span>{message}</span><button onClick={() => setMessage('')} aria-label="Fermer"><X size={16} /></button></div>}
    {michelleOpen && <div className="chat-backdrop"><section className="chat-sheet"><div className="chat-header"><div><p className="eyebrow accent">ASSISTANTE TERAINTERFACE</p><h2>Michelle</h2></div><button className="close-button" onClick={() => setMichelleOpen(false)} aria-label="Fermer"><X size={20} /></button></div><div className="chat-messages" aria-live="polite">{chatMessages.map((item, index) => <div className={`chat-bubble ${item.role}`} key={`${item.role}-${index}`}><span>{item.text}</span></div>)}{chatBusy && <div className="chat-bubble assistant"><span className="typing">Michelle écrit…</span></div>}</div><form className="chat-composer" onSubmit={sendToMichelle}><input value={chatInput} onChange={event => setChatInput(event.target.value)} placeholder="Écrire à Michelle…" aria-label="Message à Michelle" /><button type="submit" disabled={chatBusy || !chatInput.trim()} aria-label="Envoyer"><ArrowLeft size={18} /></button></form><p className="chat-note">Les fichiers et notes vocales seront ajoutés dans une prochaine étape sécurisée.</p></section></div>}
    {formOpen && <div className="sheet-backdrop" onMouseDown={closeForm}><section className="form-sheet" onMouseDown={event => event.stopPropagation()}><div className="sheet-heading"><div><p className="eyebrow accent">NOUVEAU DOCUMENT</p><h2>{documentKind === 'devis' ? 'Créer un devis' : 'Créer une facture'}</h2></div><button className="close-button" onClick={closeForm} aria-label="Fermer"><X size={20} /></button></div><form onSubmit={createDocument}><div className="form-grid"><Field name="client_name" label="Nom du client" required /><Field name="client_company" label="Entreprise du client" /><Field name="client_phone" label="Téléphone" type="tel" /><Field name="client_address" label="Adresse" /><Field name="designation" label="Prestation ou article" required /><Field name="quantity" label="Quantité" type="number" min="1" defaultValue="1" required /><Field name="unit_price" label="Prix unitaire (FCFA)" type="number" min="1" required /></div><button disabled={busy} className="primary-button" type="submit">{busy ? 'Création en cours…' : `Créer ${documentKind === 'devis' ? 'le devis' : 'la facture'}`}</button>{message && <p className="form-message" role="status">{message}</p>}</form></section></div>}
    <nav className="bottom-nav"><NavButton active={tab === 'accueil'} icon={Home} label="Accueil" onClick={() => setTab('accueil')} /><NavButton active={tab === 'services'} icon={ShoppingBag} label="Services" onClick={() => setTab('services')} /><NavButton active={tab === 'profil'} icon={User} label="Profil" onClick={() => setTab('profil')} /></nav>
  </main>
}

function Field({ name, label, type = 'text', required = false, min, defaultValue }: { name: string; label: string; type?: string; required?: boolean; min?: string; defaultValue?: string }) { return <label className="field">{label}{required && <span>*</span>}<input name={name} type={type} min={min} defaultValue={defaultValue} required={required} /></label> }
function HomeCard({ icon: Icon, title, text, onClick }: { icon: typeof Home; title: string; text: string; onClick: () => void }) { return <button className="home-card" onClick={onClick}><span className="card-icon"><Icon size={22} /></span><strong>{title}</strong><span>{text}</span></button> }
function ProfileRow({ icon: Icon, title, text }: { icon: typeof Settings; title: string; text: string }) { return <div className="profile-row"><span className="row-icon"><Icon size={19} /></span><span><strong>{title}</strong><small>{text}</small></span></div> }
function NavButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof Home; label: string; onClick: () => void }) { return <button className={`nav-button ${active ? 'active' : ''}`} onClick={onClick}><Icon size={20} /><span>{label}</span></button> }
