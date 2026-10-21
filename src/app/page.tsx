'use client'

import { FormEvent, useEffect, useRef, useState } from 'react'
import { ArrowLeft, BriefcaseBusiness, ChevronRight, Clipboard, ClipboardList, CreditCard, FilePlus2, FileText, Headphones, Home, Languages, Maximize2, MessageCircle, Mic, Minimize2, Paperclip, Pencil, Plus, Settings, ShieldCheck, ShoppingBag, Trash2, User, X } from 'lucide-react'
import InvoiceCenter from './components/InvoiceCenter'
import { closeTelegramWindow, openTelegramWindow, toggleTelegramFullscreen, type TelegramWindow } from '../lib/telegram-window'
import { installAutomaticTranslation, type AppLanguage } from '../lib/i18n'
import { createActionGate } from '../lib/action-gate'

type Tab = 'accueil' | 'services' | 'facture' | 'profil'
type AccountPage = 'menu' | 'settings' | 'profile' | 'subscriptions' | 'assistance'
type DocumentKind = 'devis' | 'facture'
type EditableDocument = { id: number; type_document: string; numero: string; montant: number; notes?: string }
type TelegramProfile = { telegram_id: string; username: string; first_name: string; last_name: string; language_code: string; photo_url: string; email: string; phone: string; address: string; company_name: string; nif: string; rccm: string; logo_url: string }
type TelegramWebApp = TelegramWindow & { initData: string; isExpanded?: boolean; setHeaderColor?: (color: string) => void; setBackgroundColor?: (color: string) => void; BackButton?: { show: () => void; hide: () => void; onClick: (fn: () => void) => void; offClick: (fn: () => void) => void } }
declare global { interface Window { Telegram?: { WebApp?: TelegramWebApp } } }

type ServiceItem = { label: string; description: string; icon: typeof FileText; documentKind?: DocumentKind }

const services: ServiceItem[] = [
  { label: 'Développement web ou mobile', description: 'Sites web, applications mobiles et solutions métier.', icon: FileText },
  { label: 'Design graphique', description: 'Identité visuelle, supports de communication et créations graphiques.', icon: Pencil },
  { label: 'Montage vidéo', description: 'Montage, habillage et finition de vos contenus vidéo.', icon: FilePlus2 },
  { label: 'Community Management', description: 'Animation, publication et suivi de vos réseaux sociaux.', icon: MessageCircle },
  { label: 'Création digitale', description: 'Conception de contenus et expériences numériques.', icon: Plus },
  { label: 'Couverture photo', description: 'Reportage et couverture photographique de vos événements.', icon: FileText },
  { label: 'Couverture vidéo', description: 'Captation vidéo de vos événements et activités.', icon: FilePlus2 },
  { label: 'Créer un devis', description: 'Demander un devis professionnel personnalisé.', icon: Plus, documentKind: 'devis' },
  { label: 'Créer une facture', description: 'Créer une facture professionnelle.', icon: FilePlus2, documentKind: 'facture' },
  { label: 'E-commerce', description: 'Boutiques en ligne et solutions de vente digitale.', icon: ShoppingBag },
  { label: 'Formations', description: 'Accompagnement et formations adaptées à vos besoins.', icon: ClipboardList },
  { label: 'Divertissement', description: 'Un espace de divertissement numérique à découvrir.', icon: Headphones },
]

export default function HomePage() {
  const [tab, setTab] = useState<Tab>('accueil')
  const [documentKind, setDocumentKind] = useState<DocumentKind>('facture')
  const [editingDocument, setEditingDocument] = useState<EditableDocument | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [initData, setInitData] = useState('')
  const [michelleOpen, setMichelleOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [chatBusy, setChatBusy] = useState(false)
  const [adminAvailable, setAdminAvailable] = useState(false)
  const [desktopTelegram, setDesktopTelegram] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const [telegramAvailable, setTelegramAvailable] = useState(false)
  const [profile, setProfile] = useState<TelegramProfile>({ telegram_id: '', username: '', first_name: '', last_name: '', language_code: '', photo_url: '', email: '', phone: '', address: '', company_name: '', nif: '', rccm: '', logo_url: '' })
  const [profileMessage, setProfileMessage] = useState('')
  const [accountPage, setAccountPage] = useState<AccountPage>('menu')
  const [language, setLanguage] = useState('fr')
  const [chatMessages, setChatMessages] = useState<{ id?: string; role: 'user' | 'assistant'; text: string; sentAt?: string }[]>([])
  const [selectedMessage, setSelectedMessage] = useState<string>('')
  const [hydrated, setHydrated] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const chatMessagesRef = useRef<HTMLDivElement>(null)
  const createGate = useRef(createActionGate())
  const messageGate = useRef(createActionGate())
  const mediaGate = useRef(createActionGate())
  const deleteMessageGate = useRef(createActionGate())


  useEffect(() => {
    const webApp = window.Telegram?.WebApp
    setTelegramAvailable(Boolean(webApp?.initData))
    setLanguage(window.localStorage.getItem('terainterface-language') || 'fr')
    const savedTab = window.localStorage.getItem('terainterface-tab') as Tab | null
    const savedAccountPage = window.localStorage.getItem('terainterface-account-page') as AccountPage | null
    if (savedTab && ['accueil', 'services', 'facture', 'profil'].includes(savedTab)) setTab(savedTab)
    if (savedAccountPage && ['menu', 'settings', 'profile', 'subscriptions', 'assistance'].includes(savedAccountPage)) setAccountPage(savedAccountPage)
    if (!savedTab || savedTab !== 'profil') setAccountPage('menu')
    setHydrated(true)
    if (!webApp) return
    const telegram = webApp
    setDesktopTelegram(openTelegramWindow(telegram))
    telegram.BackButton?.hide()
    setFullscreen(Boolean(telegram.isFullscreen))
    const syncFullscreen = () => setFullscreen(Boolean(telegram.isFullscreen))
    telegram.onEvent?.('fullscreenChanged', syncFullscreen)
    telegram.onEvent?.('fullscreenFailed', syncFullscreen)
    const expandOnReady = () => { if (!telegram.isExpanded) telegram.expand() }
    window.addEventListener('load', expandOnReady, { once: true })
    const data = telegram.initData || ''
    setInitData(data)
    if (data) {
      void fetch('/api/profile', { method: 'POST', headers: { 'x-telegram-init-data': data } }).then(response => response.ok ? response.json() : null).then(value => value?.profile && setProfile(value.profile)).catch(() => undefined)
      void fetch('/api/admin/access', { headers: { 'x-telegram-init-data': data }, cache: 'no-store' }).then(response => response.ok ? response.json() : null).then(payload => setAdminAvailable(Boolean(payload?.allowed))).catch(() => undefined)
    }
    return () => {
      window.removeEventListener('load', expandOnReady)
      telegram.offEvent?.('fullscreenChanged', syncFullscreen)
      telegram.offEvent?.('fullscreenFailed', syncFullscreen)
    }
  }, [])

  const toggleFullscreen = () => {
    const webApp = window.Telegram?.WebApp
    if (webApp) toggleTelegramFullscreen(webApp)
  }

  useEffect(() => { if (!michelleOpen || !initData || chatMessages.length) return; fetch('/api/conversations', { headers: { 'x-telegram-init-data': initData }, cache: 'no-store' }).then(response => response.ok ? response.json() : null).then(data => data?.messages && setChatMessages(data.messages.map((item: { id: string; role: 'user' | 'assistant'; text: string; sent_at: string }) => ({ id: item.id, role: item.role, text: item.text, sentAt: item.sent_at })))).catch(() => undefined) }, [michelleOpen, initData, chatMessages.length])
  useEffect(() => { if (!michelleOpen) return; const node = chatMessagesRef.current; if (node) node.scrollTo({ top: node.scrollHeight, behavior: 'smooth' }) }, [michelleOpen, chatMessages, chatBusy])

  const openCreate = (kind: DocumentKind, document: EditableDocument | null = null) => { setDocumentKind(kind); setEditingDocument(document); setMessage(''); setFormOpen(true) }
  const closeForm = () => { if (!busy) setFormOpen(false) }
  const onServiceClick = (service: ServiceItem) => service.documentKind ? openCreate(service.documentKind) : setMessage(`${service.label} : Michelle vous donnera les informations disponibles sur ce service.`)
  const openAccount = (page: AccountPage = 'menu') => { setAccountPage(page); setTab('profil'); window.localStorage.setItem('terainterface-account-page', page); window.localStorage.setItem('terainterface-tab', 'profil') }
  const navigate = (value: Tab) => { setTab(value); if (value !== 'profil') setAccountPage('menu'); window.localStorage.setItem('terainterface-tab', value); if (value !== 'profil') window.localStorage.setItem('terainterface-account-page', 'menu') }
  const navigateAccount = (value: AccountPage) => { setAccountPage(value); window.localStorage.setItem('terainterface-account-page', value) }
  const updateLanguage = (value: string) => { setLanguage(value); window.localStorage.setItem('terainterface-language', value); setMessage(value === 'fr' ? 'Langue française sélectionnée.' : 'English selected.') }

  async function createDocument(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (createGate.current.busy) return
    return createGate.current.run(async () => {
    setBusy(true); setMessage('')
    const form = new FormData(event.currentTarget); const quantity = Number(form.get('quantity') || 1); const unitPrice = Number(form.get('unit_price') || 0)
    let existingClient: { name?: string; company?: string; address?: string; phone?: string } = {}
    if (editingDocument?.notes) { try { const parsed = JSON.parse(editingDocument.notes); existingClient = parsed.client || {} } catch { existingClient = {} } }
    const issuerName = profile.company_name.trim()
    const issuerPhone = profile.phone.trim()
    const issuerAddress = profile.address.trim()
    if (!issuerName || !issuerPhone || !issuerAddress) {
      setMessage('Complétez le nom de votre entreprise, le téléphone et l’adresse dans Profil avant de créer le document.')
      setBusy(false)
      return
    }
    const payload = { document_type: documentKind, number: editingDocument?.numero || '', issuer: { name: issuerName, company: issuerName, address: issuerAddress, phone: issuerPhone, tax_id: profile.nif.trim() }, client: { name: String(form.get('client_name') || existingClient.name || ''), company: String(form.get('client_company') || existingClient.company || ''), address: String(form.get('client_address') || existingClient.address || ''), phone: String(form.get('client_phone') || existingClient.phone || ''), tax_id: '' }, items: [{ designation: String(form.get('designation') || ''), quantity, unit_price: unitPrice }], template_profile: 'client_zero', logo_enabled: false, client_logo_path: '', vat_applied: false, persist_crm: true, idempotency_key: `${editingDocument ? `edit-${editingDocument.id}` : `miniapp-${documentKind}`}-${Date.now()}-${Math.random().toString(36).slice(2)}` }
    const formElement = event.currentTarget
    try {
      const response = await fetch(editingDocument ? `/api/documents/${editingDocument.id}` : '/api/documents', { method: editingDocument ? 'PUT' : 'POST', headers: { 'content-type': 'application/json', 'x-telegram-init-data': initData }, body: JSON.stringify(payload) }); const data = await response.json()
      if (!response.ok) throw new Error(data.error || data.detail || 'La création a échoué.')
      setMessage(`${documentKind === 'devis' ? 'Devis' : 'Facture'} ${data.number ? `n° ${data.number} ` : ''}${editingDocument ? 'modifié' : 'créé'} avec succès.`)
      formElement.reset()
    } catch (error) { setMessage(error instanceof Error ? error.message : 'La création a échoué.') } finally { setEditingDocument(null); setBusy(false) }
    })
  }

  async function sendToMichelle(event: FormEvent) {
    event.preventDefault(); const text = chatInput.trim(); if (!text || chatBusy || messageGate.current.busy) return
    return messageGate.current.run(async () => {
    setChatInput(''); setChatBusy(true)
    try {
      const saved = await fetch('/api/conversations', { method: 'POST', headers: { 'content-type': 'application/json', 'x-telegram-init-data': initData }, body: JSON.stringify({ text }) }); const savedData = await saved.json()
      if (!saved.ok) throw new Error(savedData.error || 'Le message n’a pas été enregistré.')
      setChatMessages(previous => [...previous, { id: savedData.id, role: 'user', text, sentAt: savedData.sent_at }])
      const response = await fetch('/api/michelle', { method: 'POST', headers: { 'content-type': 'application/json', 'x-telegram-init-data': initData }, body: JSON.stringify({ message: text }) }); const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Michelle est momentanément indisponible.')
      setChatMessages(previous => [...previous, { role: 'assistant', text: data.reply || 'Je vous écoute.', sentAt: new Date().toISOString() }])
    } catch (error) { setChatMessages(previous => [...previous, { role: 'assistant', text: error instanceof Error ? error.message : 'Une erreur est survenue.', sentAt: new Date().toISOString() }]) } finally { setChatBusy(false) }
    })
  }

  async function copyMessage(text: string) { await navigator.clipboard?.writeText(text); setMessage('Message copié.') }
  async function deleteMessage() { if (!selectedMessage || deleteMessageGate.current.busy) return; return deleteMessageGate.current.run(async () => { const response = await fetch(`/api/conversations?id=${encodeURIComponent(selectedMessage)}`, { method: 'DELETE', headers: { 'x-telegram-init-data': initData } }); if (response.ok) setChatMessages(previous => previous.map(item => item.id === selectedMessage ? { ...item, text: '[Message supprimé]' } : item)); setSelectedMessage('') }) }
  async function sendMedia(event: React.ChangeEvent<HTMLInputElement>) { const file = event.target.files?.[0]; if (!file || mediaGate.current.busy) return; return mediaGate.current.run(async () => { const form = new FormData(); form.append('file', file); form.append('text', file.name); const response = await fetch('/api/media', { method: 'POST', headers: { 'x-telegram-init-data': initData }, body: form }); const data = await response.json(); if (!response.ok) return setMessage(data.error || 'Envoi du média impossible.'); setChatMessages(previous => [...previous, { id: data.message.id, role: 'user', text: file.name, sentAt: data.message.sent_at }]); event.target.value = '' }) }

  if (!telegramAvailable || !hydrated) return <main className="browser-landing"><section className="browser-landing-card"><div className="brand-mark">T</div><p className="eyebrow accent">TERAINTERFACE</p><h1>Votre espace</h1><p>Accède plus rapidement à nos services via notre Application</p><a className="primary-button browser-open-button" href="https://t.me/Terainterface_bot?startapp" rel="noopener noreferrer">Ouvrir l’App</a><small>Telegram s’ouvrira pour lancer l’application.</small></section></main>

  return <main className="app-shell">
    <header className="app-header"><div className="brand-mark">T</div><div><p className="eyebrow">TERAINTERFACE</p><h1>Votre espace</h1></div><div className="header-actions">{desktopTelegram && <><button className="window-action" type="button" title={fullscreen ? 'Quitter le plein écran' : 'Plein écran'} aria-label={fullscreen ? 'Quitter le plein écran' : 'Plein écran'} onClick={toggleFullscreen}>{fullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}</button><button className="window-action" type="button" title="Fermer la Mini App" aria-label="Fermer la Mini App" onClick={() => { const webApp = window.Telegram?.WebApp; if (webApp) closeTelegramWindow(webApp) }}><X size={18} /></button></>}<button className="header-icon" aria-label="Mon compte" onClick={() => openAccount()}><Headphones size={19} /></button></div></header>
    <div className="content">
      {tab === 'accueil' && <section className="screen"><p className="eyebrow accent">ESPACE CLIENT</p><h2 className="hero-title">Bienvenue</h2><p className="lead">Gérez vos services depuis un seul espace.</p><div className="home-grid"><HomeCard icon={ShoppingBag} title="Services" text="Découvrir nos solutions et accompagnements." onClick={() => navigate('services')} /><HomeCard icon={MessageCircle} title="Michelle" text="Discuter directement avec notre assistante." onClick={() => { setChatMessages(previous => previous.length ? previous : [{ role: 'assistant', text: 'Bonjour, je suis Michelle, assistante de Terainterface. Comment puis-je vous aider ?' }]); setMichelleOpen(true) }} /></div><div className="info-strip"><span className="strip-icon"><FileText size={18} /></span><span><strong>Des documents professionnels</strong><small>Créez vos devis et factures en quelques secondes.</small></span></div></section>}
      {tab === 'services' && <section className="screen"><button className="back-link" onClick={() => navigate('accueil')}><ArrowLeft size={16} /> Accueil</button><p className="eyebrow accent">NOS SOLUTIONS</p><h2 className="section-title">Services</h2><p className="lead compact">Découvrez tous les services de Terainterface.</p><div className="service-list">{services.filter(service => !service.documentKind).map(service => { const Icon = service.icon; return <button className="service-card" key={service.label} onClick={() => onServiceClick(service)}><span className="service-icon"><Icon size={20} /></span><span className="service-copy"><strong>{service.label}</strong><small>{service.description}</small></span><span className="chevron">›</span></button> })}<button className="service-card" onClick={() => navigate('facture')}><span className="service-icon"><FileText size={20} /></span><span className="service-copy"><strong>Devis et Facture</strong><small>Créer et retrouver vos devis et factures générés.</small></span><span className="chevron">›</span></button></div></section>}
      {tab === 'facture' && <section className="screen invoice-screen"><InvoiceCenter initData={initData} onClose={() => navigate('services')} onCreate={(kind = 'facture') => { openCreate(kind) }} onEdit={(kind = 'facture', document) => { openCreate(kind, document || null) }} /></section>}
      {tab === 'profil' && <AccountScreen accountPage={accountPage} navigateAccount={navigateAccount} profile={profile} setProfile={setProfile} profileMessage={profileMessage} setProfileMessage={setProfileMessage} language={language} updateLanguage={updateLanguage} adminAvailable={adminAvailable} openMichelle={() => { setChatMessages(previous => previous.length ? previous : [{ role: 'assistant', text: 'Bonjour, je suis Michelle, assistante de Terainterface. Comment puis-je vous aider ?' }]); setMichelleOpen(true) }} onAdmin={() => { window.location.href = '/adm' }} />}
    </div>
    {message && <div className="toast" role="status"><span>{message}</span><button onClick={() => setMessage('')} aria-label="Fermer"><X size={16} /></button></div>}
    {michelleOpen && <div className="chat-backdrop"><section className="chat-sheet"><div className="chat-header"><div><p className="eyebrow accent">ASSISTANTE TERAINTERFACE</p><h2>Michelle</h2></div><button className="close-button" onClick={() => setMichelleOpen(false)} aria-label="Fermer"><X size={20} /></button></div><div ref={chatMessagesRef} className="chat-messages" aria-live="polite">{chatMessages.map((item, index) => <div className={`chat-bubble ${item.role}`} key={item.id || `${item.role}-${index}`} onClick={() => item.id && setSelectedMessage(item.id)}><span>{item.text}</span><time>{item.sentAt ? new Date(item.sentAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : ''}</time>{selectedMessage === item.id && item.role === 'user' && <span className="message-actions"><button type="button" onClick={() => copyMessage(item.text)} aria-label="Copier"><Clipboard size={14} /></button><button type="button" onClick={deleteMessage} aria-label="Supprimer"><Trash2 size={14} /></button></span>}</div>)}{chatBusy && <div className="chat-bubble assistant"><span className="typing">Michelle écrit…</span></div>}</div><form className="chat-composer" onSubmit={sendToMichelle}><button type="button" className="composer-tool" title="Note vocale bientôt disponible" aria-label="Note vocale"><Mic size={18} /></button><button type="button" className="composer-tool" title="Envoyer un média" aria-label="Envoyer un média" onClick={() => fileInputRef.current?.click()}><Paperclip size={18} /></button><input ref={fileInputRef} type="file" hidden accept="image/jpeg,image/png,image/webp,audio/ogg,audio/mpeg,audio/mp4,application/pdf" onChange={sendMedia} /><input value={chatInput} onChange={event => setChatInput(event.target.value)} placeholder="Écrire à Michelle…" aria-label="Message à Michelle" /><button type="submit" disabled={chatBusy || !chatInput.trim()} aria-label="Envoyer"><ArrowLeft size={18} /></button></form><p className="chat-note">Les médias et notes vocales seront ajoutés après validation du stockage sécurisé.</p></section></div>}
    {formOpen && <div className="sheet-backdrop" onMouseDown={closeForm}><section className="form-sheet" onMouseDown={event => event.stopPropagation()}><div className="sheet-heading"><div><p className="eyebrow accent">NOUVEAU DOCUMENT</p><h2>{documentKind === 'devis' ? 'Créer un devis' : 'Créer une facture'}</h2></div><button className="close-button" onClick={closeForm} aria-label="Fermer"><X size={20} /></button></div><form onSubmit={createDocument}><div className="form-grid"><Field name="client_name" label="Nom du client" required /><Field name="client_company" label="Entreprise du client" /><Field name="client_phone" label="Téléphone" type="tel" required /><Field name="client_address" label="Adresse" required /><Field name="designation" label="Prestation ou article" required /><Field name="quantity" label="Quantité" type="number" min="1" defaultValue="1" required /><Field name="unit_price" label="Prix unitaire (FCFA)" type="number" min="1" required /></div><button disabled={busy} className="primary-button" type="submit">{busy ? 'Création en cours…' : `Créer ${documentKind === 'devis' ? 'le devis' : 'la facture'}`}</button>{message && <p className="form-message" role="status">{message}</p>}</form></section></div>}
    <nav className="bottom-nav"><NavButton active={tab === 'accueil'} icon={Home} label="Accueil" onClick={() => navigate('accueil')} /><NavButton active={tab === 'services'} icon={ShoppingBag} label="Services" onClick={() => navigate('services')} /><NavButton active={tab === 'profil'} icon={User} label="Mon compte" onClick={() => openAccount()} /></nav>
  </main>
}

function AccountScreen({ accountPage, navigateAccount, profile, setProfile, profileMessage, setProfileMessage, language, updateLanguage, adminAvailable, openMichelle, onAdmin }: { accountPage: AccountPage; navigateAccount: (page: AccountPage) => void; profile: TelegramProfile; setProfile: (profile: TelegramProfile) => void; profileMessage: string; setProfileMessage: (message: string) => void; language: string; updateLanguage: (value: string) => void; adminAvailable: boolean; openMichelle: () => void; onAdmin: () => void }) {
  const saveProfileGate = useRef(createActionGate())
  const saveProfile = async (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); if (saveProfileGate.current.busy) return; return saveProfileGate.current.run(async () => { setProfileMessage(''); const response = await fetch('/api/profile', { method: 'PUT', headers: { 'content-type': 'application/json', 'x-telegram-init-data': window.Telegram?.WebApp?.initData || '' }, body: JSON.stringify(profile) }); const value = await response.json().catch(() => ({})); if (response.ok) { setProfile(value.profile || profile); setProfileMessage('Informations enregistrées.'); } else setProfileMessage(value.error || 'Enregistrement impossible.') }) }
  const companyForm = <form className="profile-settings" onSubmit={saveProfile}><p className="settings-note">Ces informations apparaissent comme émetteur de vos propres devis et factures.</p><Field name="company_name" label="Nom de l’entreprise (facultatif)" value={profile.company_name} onChange={event => setProfile({ ...profile, company_name: event.target.value })} /><Field name="phone" label="Téléphone" value={profile.phone} onChange={event => setProfile({ ...profile, phone: event.target.value })} /><Field name="address" label="Adresse" value={profile.address} onChange={event => setProfile({ ...profile, address: event.target.value })} /><Field name="nif" label="NIF (facultatif)" value={profile.nif} onChange={event => setProfile({ ...profile, nif: event.target.value })} /><Field name="rccm" label="RCCM (facultatif)" value={profile.rccm} onChange={event => setProfile({ ...profile, rccm: event.target.value })} /><Field name="logo_url" label="Logo (facultatif)" value={profile.logo_url} onChange={event => setProfile({ ...profile, logo_url: event.target.value })} placeholder="Logo à importer prochainement" /><button className="primary-button" type="submit">Enregistrer</button>{profileMessage && <p className="form-message" role="status">{profileMessage}</p>}</form>
  const page = accountPage
  return <section className="screen"><button className="back-link" onClick={() => page === 'menu' ? navigateAccount('menu') : navigateAccount('menu')}><ArrowLeft size={16} /> {page === 'menu' ? 'Accueil' : 'Mon compte'}</button>
    {page === 'menu' && <><p className="eyebrow accent">ESPACE PERSONNEL</p><h2 className="section-title">Mon compte</h2><div className="account-list"><AccountRow icon={User} title="Profil" text="Consulter vos informations personnelles." onClick={() => navigateAccount('profile')} /><AccountRow icon={CreditCard} title="Abonnements" text="Gérer votre abonnement et vos offres." onClick={() => navigateAccount('subscriptions')} /><AccountRow icon={Settings} title="Paramètres" text="Gérer votre entreprise et vos préférences." onClick={() => navigateAccount('settings')} /><AccountRow icon={Headphones} title="Assistance" text="Obtenir de l’aide sur un service ou une commande." onClick={() => navigateAccount('assistance')} />{adminAvailable && <AccountRow icon={ShieldCheck} title="Administration" text="Gérer les utilisateurs et les conversations." onClick={onAdmin} />}</div></>}
    {page === 'settings' && <><p className="eyebrow accent">PRÉFÉRENCES</p><h2 className="section-title">Paramètres</h2><div className="settings-sections"><div className="settings-section"><div className="settings-section-title"><BriefcaseBusiness size={19} /><span><strong>Entreprise</strong><small>Informations utilisées sur vos devis et factures.</small></span></div>{companyForm}</div><div className="settings-section"><div className="settings-section-title"><Languages size={19} /><span><strong>Langue</strong><small>Choisissez la langue de l’application.</small></span></div><label className="language-field">Langue<select value={language} onChange={event => updateLanguage(event.target.value)}><option value="fr">Français</option><option value="en">English</option></select></label></div></div></>}
    {page === 'profile' && <><p className="eyebrow accent">ESPACE PERSONNEL</p><h2 className="section-title">Profil</h2><div className="profile-list"><div className="profile-row profile-identity">{profile.photo_url ? <img src={profile.photo_url} alt="Photo Telegram" /> : <span className="row-icon"><User size={19} /></span>}<span><strong>{[profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Utilisateur Telegram'}</strong><small>{profile.username ? `@${profile.username}` : 'Profil Telegram'}</small></span></div><ProfileRow icon={User} title="Identifiant Telegram" text={profile.telegram_id || 'Non disponible'} /><ProfileRow icon={MessageCircle} title="Langue" text={profile.language_code || 'Non renseignée'} /><ProfileRow icon={FileText} title="Téléphone" text={profile.phone || 'Non renseigné'} /><ProfileRow icon={FileText} title="Adresse" text={profile.address || 'Non renseignée'} /></div></>}
    {page === 'subscriptions' && <><p className="eyebrow accent">MON OFFRE</p><h2 className="section-title">Abonnements</h2><div className="profile-list"><ProfileRow icon={CreditCard} title="Historique des paiements" text="Aucun paiement d’abonnement enregistré." /></div></>}
    {page === 'assistance' && <><p className="eyebrow accent">AIDE</p><h2 className="section-title">Assistance</h2><button className="profile-row account-action" onClick={openMichelle}><span className="row-icon"><MessageCircle size={19} /></span><span><strong>Contacter Michelle</strong><small>Parler à notre assistante.</small></span><ChevronRight size={18} /></button></>}
  </section>
}
function AccountRow({ icon: Icon, title, text, onClick }: { icon: typeof Settings; title: string; text: string; onClick: () => void }) { return <button className="profile-row account-row" onClick={onClick}><span className="row-icon"><Icon size={19} /></span><span><strong>{title}</strong><small>{text}</small></span><ChevronRight size={18} /></button> }
function Field({ name, label, type = 'text', required = false, min, defaultValue, value, placeholder, onChange }: { name: string; label: string; type?: string; required?: boolean; min?: string; defaultValue?: string; value?: string; placeholder?: string; onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void }) { return <label className="field">{label}{required && <span>*</span>}<input name={name} type={type} min={min} defaultValue={defaultValue} value={value} placeholder={placeholder} onChange={onChange} required={required} /></label> }
function HomeCard({ icon: Icon, title, text, onClick }: { icon: typeof Home; title: string; text: string; onClick: () => void }) { return <button className="home-card" onClick={onClick}><span className="card-icon"><Icon size={22} /></span><strong>{title}</strong><span>{text}</span></button> }
function ProfileRow({ icon: Icon, title, text }: { icon: typeof Settings; title: string; text: string }) { return <div className="profile-row"><span className="row-icon"><Icon size={19} /></span><span><strong>{title}</strong><small>{text}</small></span></div> }
function NavButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof Home; label: string; onClick: () => void }) { return <button className={`nav-button ${active ? 'active' : ''}`} onClick={onClick}><Icon size={20} /><span>{label}</span></button> }
