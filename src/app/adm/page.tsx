'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, ChevronRight, Clock3, Eye, EyeOff, MessageCircle, RefreshCw, Search, ShieldCheck, Users, X } from 'lucide-react'
import { createActionGate } from '../../lib/action-gate'
import { configureTelegramBackButton, openTelegramWindow, setTelegramVerticalSwipes } from '../../lib/telegram-window'

type Profile = { telegram_id: string; username?: string; first_name?: string; last_name?: string; language_code?: string; photo_url?: string; email?: string; phone?: string; address?: string; company_name?: string; nif?: string; rccm?: string; conversation_count?: number; last_app_visit_at?: string; is_online?: number; created_at?: string }
type Admin = { telegram_id: string; username?: string; first_name?: string; last_name?: string; created_at?: string }
type Conversation = { id: string; external_user_id: string; title: string; status: string; created_at: string; updated_at: string; username?: string; first_name?: string; last_name?: string }
type Message = { id: string; role: 'user' | 'assistant'; text: string; sent_at: string }
type DashboardData = { profiles: Profile[]; conversations: Conversation[]; stats: { users?: number; conversations?: number; messages?: number } }

const date = (value?: string) => value ? new Date(value).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
const relativeDate = (value?: string) => { if (!value) return '—'; const seconds = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 1000)); if (seconds < 60) return `Il y a ${seconds || 1} minute${seconds > 1 ? 's' : ''}`; const minutes = Math.floor(seconds / 60); if (minutes < 60) return `Il y a ${minutes} minute${minutes > 1 ? 's' : ''}`; const hours = Math.floor(minutes / 60); if (hours < 24) return `Il y a ${hours} heure${hours > 1 ? 's' : ''}`; const days = Math.floor(hours / 24); if (days <= 7) return `Il y a ${days} jour${days > 1 ? 's' : ''}`; return date(value) }
function normalizeSearch(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr') }
const matchesSearch = (value: string, query: string) => normalizeSearch(value).includes(normalizeSearch(query))
const displayName = (profile: Pick<Profile, 'telegram_id' | 'first_name' | 'last_name' | 'username'>) => [profile.first_name, profile.last_name].filter(Boolean).join(' ') || (profile.username ? `@${profile.username}` : `Telegram ${profile.telegram_id}`)
const conversationName = (conversation: Conversation) => displayName({ telegram_id: conversation.external_user_id, username: conversation.username, first_name: conversation.first_name, last_name: conversation.last_name })

export default function AdminPage() {
  const [initData, setInitData] = useState('')
  const [data, setData] = useState<DashboardData>({ profiles: [], conversations: [], stats: {} })
  const [admins, setAdmins] = useState<Admin[]>([])
  const [adminForm, setAdminForm] = useState({ telegram_id: '' })
  const [adminPage, setAdminPage] = useState(1)
  const [profilePage, setProfilePage] = useState(1)
  const [conversationPage, setConversationPage] = useState(1)
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [adminQuery, setAdminQuery] = useState('')
  const [profileQuery, setProfileQuery] = useState('')
  const [conversationQuery, setConversationQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [unlocked, setUnlocked] = useState(false)
  const [noticeKind, setNoticeKind] = useState<'error' | 'success'>('error')
  const [now, setNow] = useState(() => Date.now())
  const refreshGate = useRef(createActionGate())
  const mutationGate = useRef(createActionGate())

  useEffect(() => {
    const webApp = window.Telegram?.WebApp
    webApp?.ready()
    const telegramInitData = webApp?.initData || ''
    setInitData(telegramInitData)
    if (webApp) openTelegramWindow(webApp)
    if (webApp) setTelegramVerticalSwipes(webApp, false)
    const syncSafeAreas = () => {
      const safe = webApp?.safeAreaInset || {}
      const content = webApp?.contentSafeAreaInset || {}
      for (const [name, value] of Object.entries(safe)) document.documentElement.style.setProperty(`--tg-safe-area-inset-${name}`, `${Number(value) || 0}px`)
      for (const [name, value] of Object.entries(content)) document.documentElement.style.setProperty(`--tg-content-safe-area-inset-${name}`, `${Number(value) || 0}px`)
    }
    syncSafeAreas()
    webApp?.onEvent?.('safeAreaChanged', syncSafeAreas)
    webApp?.onEvent?.('contentSafeAreaChanged', syncSafeAreas)
    if (telegramInitData) void fetch('/api/admin/access', { headers: { 'x-telegram-init-data': telegramInitData }, cache: 'no-store' }).then(response => response.ok ? response.json() : null).then(payload => { if (payload?.unlocked) setUnlocked(true); else if (payload && !payload.allowed) setError('Accès administrateur requis.') }).catch(() => undefined)
    return () => {
      webApp?.offEvent?.('safeAreaChanged', syncSafeAreas)
      webApp?.offEvent?.('contentSafeAreaChanged', syncSafeAreas)
      if (webApp) setTelegramVerticalSwipes(webApp, true)
    }
  }, [])
  useEffect(() => {
    const webApp = window.Telegram?.WebApp
    if (!webApp) return
    const onBack = () => { if (selectedProfile) setSelectedProfile(null); else if (selected) setSelected(null); else window.location.href = '/' }
    return configureTelegramBackButton(webApp, true, onBack)
  }, [selectedProfile, selected])
  useEffect(() => { if (!error) return; const timer = window.setTimeout(() => setError(''), 8000); return () => window.clearTimeout(timer) }, [error])
  useEffect(() => { if (!unlocked) return; const timer = window.setInterval(() => { setNow(Date.now()); void refresh() }, 60_000); return () => window.clearInterval(timer) }, [unlocked])
  useEffect(() => { if (initData && unlocked) void refresh() }, [initData, unlocked])
  useEffect(() => { setAdminPage(1) }, [adminQuery])
  useEffect(() => { setProfilePage(1) }, [profileQuery])
  useEffect(() => { setConversationPage(1) }, [conversationQuery])

  async function unlock(event: React.FormEvent) {
    event.preventDefault()
    if (!password.trim()) { setNoticeKind('error'); setError('Veuillez renseigner le mot de passe.'); return }
    const response = await fetch('/api/admin/access', { method: 'POST', headers: { 'content-type': 'application/json', 'x-telegram-init-data': initData }, body: JSON.stringify({ password }) })
    const payload = await response.json().catch(() => ({}))
    if (!response.ok) { setNoticeKind('error'); setError(payload.error || 'Mot de passe incorrect.'); return }
    setPassword(''); setShowPassword(false); setNoticeKind('success'); setError('Mot de passe accepté. Accès administrateur ouvert.'); setUnlocked(true)
  }

  async function refresh() {
    if (refreshGate.current.busy) return
    return refreshGate.current.run(async () => {
      setLoading(true); setError('')
      try {
        const response = await fetch('/api/admin/conversations', { headers: { 'x-telegram-init-data': initData }, cache: 'no-store' })
        const payload = await response.json()
        if (!response.ok) throw new Error(payload.error || 'Accès refusé.')
        setData({ profiles: payload.profiles || [], conversations: payload.conversations || [], stats: payload.stats || {} }); setAdmins(payload.admins || [])
      } catch (cause) { setError(cause instanceof Error ? cause.message : 'Tableau de bord indisponible.') } finally { setLoading(false) }
    })
  }

  async function saveAdmin(event: React.FormEvent) { event.preventDefault(); if (mutationGate.current.busy) return; return mutationGate.current.run(async () => { const response = await fetch('/api/admin/conversations', { method: 'POST', headers: { 'content-type': 'application/json', 'x-telegram-init-data': initData }, body: JSON.stringify(adminForm) }); const payload = await response.json().catch(() => ({})); if (!response.ok) return setError(payload.error || 'Administrateur impossible à enregistrer.'); setAdminForm({ telegram_id: '' }); await refresh() }) }
  async function addAdminFromProfile(profile: Profile) { if (mutationGate.current.busy) return; return mutationGate.current.run(async () => { const response = await fetch('/api/admin/conversations', { method: 'POST', headers: { 'content-type': 'application/json', 'x-telegram-init-data': initData }, body: JSON.stringify({ telegram_id: profile.telegram_id, username: profile.username || '', first_name: profile.first_name || '', last_name: profile.last_name || '' }) }); const payload = await response.json().catch(() => ({})); if (!response.ok) return setError(payload.error || 'Administrateur impossible à enregistrer.'); await refresh() }) }
  async function removeAdmin(telegramId: string) { if (!window.confirm('Supprimer cet administrateur ?') || mutationGate.current.busy) return; return mutationGate.current.run(async () => { const response = await fetch(`/api/admin/conversations?telegram_id=${encodeURIComponent(telegramId)}`, { method: 'DELETE', headers: { 'x-telegram-init-data': initData } }); const payload = await response.json().catch(() => ({})); if (!response.ok) return setError(payload.error || 'Suppression impossible.'); await refresh() }) }
  async function openConversation(conversation: Conversation) {
    setSelected(conversation); setMessages([])
    const response = await fetch(`/api/admin/conversations?conversation_id=${encodeURIComponent(conversation.id)}`, { headers: { 'x-telegram-init-data': initData }, cache: 'no-store' })
    const payload = await response.json(); if (response.ok) setMessages(payload.messages || []); else setError(payload.error || 'Conversation indisponible.')
  }

  const filteredAdmins = useMemo(() => admins.filter(admin => matchesSearch(`${admin.telegram_id} ${admin.username || ''} ${admin.first_name || ''} ${admin.last_name || ''}`, adminQuery)), [admins, adminQuery])
  const profiles = useMemo(() => data.profiles.filter(profile => matchesSearch(`${displayName(profile)} ${profile.username || ''} ${profile.telegram_id}`, profileQuery)), [data.profiles, profileQuery])
  const conversations = useMemo(() => data.conversations.filter(item => matchesSearch(`${item.external_user_id} ${item.title} ${item.username || ''} ${item.first_name || ''} ${item.last_name || ''}`, conversationQuery)), [data.conversations, conversationQuery])
  const pagedAdmins = filteredAdmins.slice((adminPage - 1) * 4, adminPage * 4)
  const pagedProfiles = profiles.slice((profilePage - 1) * 3, profilePage * 3)
  const pagedConversations = conversations.slice((conversationPage - 1) * 6, conversationPage * 6)
  const isProfileAdmin = (telegramId: string) => admins.some(admin => admin.telegram_id === telegramId)
  const isProfileOnline = (profile: Profile) => Boolean(profile.is_online) && Boolean(profile.last_app_visit_at) && now - new Date(profile.last_app_visit_at || 0).getTime() < 5 * 60 * 1000

  if (!unlocked) return <main className="admin-shell"><header className="admin-header"><div className="brand-mark">T</div><div><p className="eyebrow accent">ESPACE PRIVÉ</p><h1>Administration</h1></div></header><div className="admin-content"><section className="settings-section admin-lock"><ShieldCheck size={24} /><h2>Accès sécurisé</h2><p>Entrez le mot de passe Administration pour continuer.</p><form onSubmit={unlock}><div className="admin-password-wrap"><input className="admin-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Mot de passe" /><button className="admin-password-toggle" type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><button className="primary-button" type="submit">Ouvrir Administration</button></form>{error && <p className={`form-message ${noticeKind}`} role="alert">{error}</p>}</section></div></main>

  return <main className="admin-shell">
    <header className="admin-header"><div className="brand-mark">T</div><div><p className="eyebrow accent">ESPACE PRIVÉ</p><h1>Administration</h1></div><button className="admin-refresh" onClick={refresh} disabled={loading} aria-label="Actualiser"><RefreshCw size={18} className={loading ? 'spin' : ''} /></button></header>
    <div className="admin-content">
      {error && <div className={`admin-alert ${noticeKind}`} role="status"><ShieldCheck size={18} /><span>{error}</span><button onClick={() => setError('')} aria-label="Fermer"><X size={16} /></button></div>}
      <section className="admin-intro"><div><p className="eyebrow accent">TABLEAU DE BORD</p><h2>Vue d’ensemble</h2><p>Suivez les utilisateurs Telegram et les échanges avec Michelle.</p></div><div className="admin-status"><span /><span>Connexion sécurisée</span></div></section>
      <section className="stat-grid"><Stat icon={Users} label="Utilisateurs" value={data.stats.users} /><Stat icon={MessageCircle} label="Conversations" value={data.stats.conversations} /><Stat icon={Activity} label="Messages" value={data.stats.messages} /></section>
      <div className="admin-mobile-carousel">
        <section className="admin-panel"><div className="panel-heading"><div><p className="eyebrow accent">ADMINISTRATEURS</p><h3>Accès Administration</h3></div><span>{filteredAdmins.length}</span></div><div className="admin-search"><Search size={16} /><input aria-label="Rechercher un administrateur" value={adminQuery} onChange={event => setAdminQuery(event.target.value)} placeholder="Rechercher un administrateur…" /></div><form className="admin-admin-form" onSubmit={saveAdmin}><input value={adminForm.telegram_id} onChange={event => setAdminForm({ telegram_id: event.target.value })} placeholder="ID Telegram *" inputMode="numeric" required /><button className="primary-button" type="submit">Ajouter / modifier</button></form>{filteredAdmins.length === 0 ? <Empty text={adminQuery ? 'Aucun administrateur ne correspond à cette recherche.' : 'Aucun administrateur enregistré en base.'} /> : <div className="admin-table"><div className="admin-table-head"><span>Utilisateur</span><span>ID Telegram</span><span>Ajouté le</span><span>Action</span></div>{pagedAdmins.map(admin => <div className="admin-table-row" key={admin.telegram_id}><span><strong>{[admin.first_name, admin.last_name].filter(Boolean).join(' ') || (admin.username ? `@${admin.username}` : `Telegram ${admin.telegram_id}`)}</strong><small>{admin.username ? `@${admin.username}` : 'Sans nom d’utilisateur'}</small></span><span>{admin.telegram_id}</span><span>{date(admin.created_at)}</span><button className="admin-delete" type="button" onClick={() => removeAdmin(admin.telegram_id)}>Supprimer</button></div>)}</div>}{filteredAdmins.length > 4 && <Pager page={adminPage} pages={Math.ceil(filteredAdmins.length / 4)} onChange={setAdminPage} label="4 par page" />} </section>
        <section className="admin-panel"><div className="panel-heading"><div><p className="eyebrow">PROFILS TELEGRAM</p><h3>Utilisateurs récents</h3></div><span>{profiles.length}</span></div><div className="admin-search"><Search size={16} /><input aria-label="Rechercher un utilisateur" value={profileQuery} onChange={event => setProfileQuery(event.target.value)} placeholder="Rechercher un utilisateur…" /></div>{loading ? <Loading /> : profiles.length === 0 ? <Empty text={profileQuery ? 'Aucun utilisateur ne correspond à cette recherche.' : 'Aucun profil enregistré pour le moment.'} /> : <div className="profile-table">{pagedProfiles.map(profile => <div className="profile-card" key={profile.telegram_id} role="button" tabIndex={0} onClick={() => setSelectedProfile(profile)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') setSelectedProfile(profile) }}><div className="profile-avatar">{profile.photo_url ? <img src={profile.photo_url} alt="" /> : (profile.first_name || 'T').slice(0, 1).toUpperCase()}</div><div className="profile-main"><strong>{displayName(profile)}</strong><small>{profile.username ? `@${profile.username}` : `ID ${profile.telegram_id}`}</small></div><div className="profile-meta"><b>{profile.conversation_count || 0}</b><small>conversation(s)</small></div><div className="profile-date"><small>{isProfileOnline(profile) ? <>En ligne <i className="online-dot" aria-label="En ligne" /></> : 'Hors ligne'}</small><small>Dernière activité</small><span>{isProfileOnline(profile) ? 'Maintenant' : relativeDate(profile.last_app_visit_at || profile.created_at)}</span></div>{!isProfileAdmin(profile.telegram_id) && <button className="admin-profile-action" type="button" onClick={event => { event.stopPropagation(); void addAdminFromProfile(profile) }}>Ajouter admin</button>}</div>)}</div>}{profiles.length > 3 && <Pager page={profilePage} pages={Math.ceil(profiles.length / 3)} onChange={setProfilePage} label="3 par page" />} </section>
         <section className="admin-panel"><div className="panel-heading"><div><p className="eyebrow">ÉCHANGES</p><h3>Conversations</h3></div><span>{conversations.length}</span></div><div className="admin-search"><Search size={16} /><input aria-label="Rechercher une conversation" value={conversationQuery} onChange={event => setConversationQuery(event.target.value)} placeholder="Rechercher une conversation…" /></div>{loading ? <Loading /> : conversations.length === 0 ? <Empty text={conversationQuery ? 'Aucune conversation ne correspond à cette recherche.' : 'Aucune conversation enregistrée.'} /> : <div className="conversation-list">{pagedConversations.map(conversation => <button className="conversation-card" key={conversation.id} onClick={() => openConversation(conversation)}><span className="conversation-icon"><MessageCircle size={18} /></span><span className="conversation-main"><strong>{conversationName(conversation)}</strong><small>{conversation.username ? `@${conversation.username} · ` : ''}Utilisateur Telegram : {conversation.external_user_id}</small></span><span className="conversation-date"><Clock3 size={14} />{date(conversation.updated_at)}</span><ChevronRight size={18} /></button>)}</div>}{conversations.length > 6 && <Pager page={conversationPage} pages={Math.ceil(conversations.length / 6)} onChange={setConversationPage} label="6 par page" />} </section>
       </div>
    </div>
    {selectedProfile && <div className="admin-overlay" onMouseDown={() => setSelectedProfile(null)}><section className="profile-detail-sheet" onMouseDown={event => event.stopPropagation()}><div className="sheet-heading"><div><p className="eyebrow accent">PROFIL TELEGRAM</p><h2>{displayName(selectedProfile)}</h2><small>ID Telegram : {selectedProfile.telegram_id}</small></div><button className="close-button" onClick={() => setSelectedProfile(null)} aria-label="Fermer"><X size={20} /></button></div><div className="profile-detail-identity">{selectedProfile.photo_url ? <img src={selectedProfile.photo_url} alt="" /> : <div className="profile-detail-avatar">{(selectedProfile.first_name || 'T').slice(0, 1).toUpperCase()}</div>}<div><strong>{selectedProfile.username ? `@${selectedProfile.username}` : 'Sans nom d’utilisateur'}</strong><span>{isProfileOnline(selectedProfile) ? 'En ligne' : 'Hors ligne'}</span></div></div><div className="profile-detail-grid"><Detail label="Prénom" value={selectedProfile.first_name} /><Detail label="Nom" value={selectedProfile.last_name} /><Detail label="Nom d’utilisateur" value={selectedProfile.username ? `@${selectedProfile.username}` : undefined} /><Detail label="Langue" value={selectedProfile.language_code} /><Detail label="E-mail" value={selectedProfile.email} /><Detail label="Téléphone" value={selectedProfile.phone} /><Detail label="Adresse" value={selectedProfile.address} /><Detail label="Entreprise" value={selectedProfile.company_name} /><Detail label="NIF" value={selectedProfile.nif} /><Detail label="RCCM" value={selectedProfile.rccm} /><Detail label="Dernière activité" value={relativeDate(selectedProfile.last_app_visit_at || selectedProfile.created_at)} /><Detail label="Conversations" value={String(selectedProfile.conversation_count || 0)} /></div></section></div>}
    {selected && <div className="admin-overlay" onMouseDown={() => setSelected(null)}><section className="conversation-sheet" onMouseDown={event => event.stopPropagation()}><div className="sheet-heading"><div><p className="eyebrow accent">CONVERSATION</p><h2>{selected.title || 'Michelle'}</h2><small>Utilisateur Telegram : {selected.external_user_id}</small></div><button className="close-button" onClick={() => setSelected(null)} aria-label="Fermer"><X size={20} /></button></div><div className="admin-messages">{messages.length === 0 ? <Empty text="Aucun message dans cette conversation." /> : messages.map(message => <div className={`admin-message ${message.role}`} key={message.id}><span>{message.text}</span><time>{date(message.sent_at)}</time></div>)}</div></section></div>}
  </main>
}

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value?: number }) { return <div className="stat-card"><span><Icon size={19} /></span><div><strong>{value ?? 0}</strong><small>{label}</small></div></div> }
function Loading() { return <div className="admin-loading"><span /><span /><span /></div> }
function Empty({ text }: { text: string }) { return <div className="admin-empty">{text}</div> }
function Detail({ label, value }: { label: string; value?: string }) { return <div className="profile-detail-item"><small>{label}</small><strong>{value || '—'}</strong></div> }
function Pager({ page, pages, onChange, label }: { page: number; pages: number; onChange: (page: number) => void; label: string }) { return <div className="admin-pagination"><button type="button" onClick={() => onChange(page - 1)} disabled={page <= 1}>Précédent</button><span>{label} · {page}/{pages}</span><button type="button" onClick={() => onChange(page + 1)} disabled={page >= pages}>Suivant</button></div> }
