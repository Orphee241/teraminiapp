'use client'

import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowLeft, ChevronRight, Clock3, Home, MessageCircle, RefreshCw, Search, ShieldCheck, Users, X } from 'lucide-react'

type Profile = { telegram_id: string; username?: string; first_name?: string; last_name?: string; language_code?: string; conversation_count?: number; last_activity?: string; created_at?: string }
type Admin = { telegram_id: string; username?: string; first_name?: string; last_name?: string; created_at?: string }
type Conversation = { id: string; external_user_id: string; title: string; status: string; created_at: string; updated_at: string }
type Message = { id: string; role: 'user' | 'assistant'; text: string; sent_at: string }
type DashboardData = { profiles: Profile[]; conversations: Conversation[]; stats: { users?: number; conversations?: number; messages?: number } }

const date = (value?: string) => value ? new Date(value).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
const displayName = (profile: Profile) => [profile.first_name, profile.last_name].filter(Boolean).join(' ') || `Telegram ${profile.telegram_id}`

export default function AdminPage() {
  const [initData, setInitData] = useState('')
  const [data, setData] = useState<DashboardData>({ profiles: [], conversations: [], stats: {} })
  const [admins, setAdmins] = useState<Admin[]>([])
  const [adminForm, setAdminForm] = useState({ telegram_id: '', username: '', first_name: '', last_name: '' })
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [password, setPassword] = useState('')
  const [unlocked, setUnlocked] = useState(false)

  useEffect(() => { const webApp = window.Telegram?.WebApp; webApp?.ready(); const data = webApp?.initData || ''; setInitData(data); if (data) void fetch('/api/admin/access', { headers: { 'x-telegram-init-data': data }, cache: 'no-store' }).then(response => response.ok ? response.json() : null).then(payload => { if (payload?.unlocked) setUnlocked(true); else if (payload && !payload.allowed) setError('Accès administrateur requis.') }).catch(() => undefined) }, [])
  useEffect(() => { if (initData && unlocked) void refresh() }, [initData, unlocked])

  async function unlock(event: React.FormEvent) { event.preventDefault(); const response = await fetch('/api/admin/access', { method: 'POST', headers: { 'content-type': 'application/json', 'x-telegram-init-data': initData }, body: JSON.stringify({ password }) }); const payload = await response.json().catch(() => ({})); if (!response.ok) return setError(payload.error || 'Accès refusé.'); setPassword(''); setUnlocked(true) }

  async function refresh() {
    setLoading(true); setError('')
    try {
      const response = await fetch('/api/admin/conversations', { headers: { 'x-telegram-init-data': initData }, cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Accès refusé.')
      setData({ profiles: payload.profiles || [], conversations: payload.conversations || [], stats: payload.stats || {} }); setAdmins(payload.admins || [])
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Tableau de bord indisponible.') } finally { setLoading(false) }
  }

  async function saveAdmin(event: React.FormEvent) { event.preventDefault(); const response = await fetch('/api/admin/conversations', { method: 'POST', headers: { 'content-type': 'application/json', 'x-telegram-init-data': initData }, body: JSON.stringify(adminForm) }); const payload = await response.json().catch(() => ({})); if (!response.ok) return setError(payload.error || 'Administrateur impossible à enregistrer.'); setAdminForm({ telegram_id: '', username: '', first_name: '', last_name: '' }); await refresh() }
  async function addAdminFromProfile(profile: Profile) { const response = await fetch('/api/admin/conversations', { method: 'POST', headers: { 'content-type': 'application/json', 'x-telegram-init-data': initData }, body: JSON.stringify({ telegram_id: profile.telegram_id, username: profile.username || '', first_name: profile.first_name || '', last_name: profile.last_name || '' }) }); const payload = await response.json().catch(() => ({})); if (!response.ok) return setError(payload.error || 'Administrateur impossible à enregistrer.'); await refresh() }
  async function removeAdmin(telegramId: string) { if (!window.confirm('Supprimer cet administrateur ?')) return; const response = await fetch(`/api/admin/conversations?telegram_id=${encodeURIComponent(telegramId)}`, { method: 'DELETE', headers: { 'x-telegram-init-data': initData } }); const payload = await response.json().catch(() => ({})); if (!response.ok) return setError(payload.error || 'Suppression impossible.'); await refresh() }
  async function openConversation(conversation: Conversation) {
    setSelected(conversation); setMessages([])
    const response = await fetch(`/api/admin/conversations?conversation_id=${encodeURIComponent(conversation.id)}`, { headers: { 'x-telegram-init-data': initData }, cache: 'no-store' })
    const payload = await response.json(); if (response.ok) setMessages(payload.messages || []); else setError(payload.error || 'Conversation indisponible.')
  }

  const profiles = useMemo(() => data.profiles.filter(profile => `${displayName(profile)} ${profile.username || ''} ${profile.telegram_id}`.toLowerCase().includes(query.toLowerCase())), [data.profiles, query])
  const conversations = useMemo(() => data.conversations.filter(item => `${item.external_user_id} ${item.title}`.toLowerCase().includes(query.toLowerCase())), [data.conversations, query])
  const isProfileAdmin = (telegramId: string) => admins.some(admin => admin.telegram_id === telegramId)

  if (!unlocked) return <main className="admin-shell"><header className="admin-header"><div className="brand-mark">T</div><div><p className="eyebrow accent">ESPACE PRIVÉ</p><h1>Administration</h1></div><button className="admin-secondary" onClick={() => { window.location.href = '/' }}><Home size={15} /> Accueil</button></header><div className="admin-content"><section className="settings-section admin-lock"><ShieldCheck size={24} /><h2>Accès sécurisé</h2><p>Entrez le mot de passe Administration pour continuer.</p><form onSubmit={unlock}><input className="admin-password" type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Mot de passe" required /><button className="primary-button" type="submit">Ouvrir Administration</button></form>{error && <p className="form-message" role="alert">{error}</p>}</section></div></main>

  return <main className="admin-shell">
    <header className="admin-header"><div className="brand-mark">T</div><div><p className="eyebrow accent">ESPACE PRIVÉ</p><h1>Administration</h1></div><button className="admin-secondary" onClick={() => { window.location.href = '/' }}><ArrowLeft size={15} /> Quitter</button><button className="admin-refresh" onClick={refresh} disabled={loading} aria-label="Actualiser"><RefreshCw size={18} className={loading ? 'spin' : ''} /></button></header>
    <div className="admin-content">
      {error && <div className="admin-alert"><ShieldCheck size={18} /><span>{error}</span><button onClick={() => setError('')} aria-label="Fermer"><X size={16} /></button></div>}
      <section className="admin-intro"><div><p className="eyebrow accent">TABLEAU DE BORD</p><h2>Vue d’ensemble</h2><p>Suivez les utilisateurs Telegram et les échanges avec Michelle.</p></div><div className="admin-status"><span /><span>Connexion sécurisée</span></div></section>
      <section className="stat-grid"><Stat icon={Users} label="Utilisateurs" value={data.stats.users} /><Stat icon={MessageCircle} label="Conversations" value={data.stats.conversations} /><Stat icon={Activity} label="Messages" value={data.stats.messages} /></section>
      <div className="admin-toolbar"><div className="search-field"><Search size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Rechercher un utilisateur…" /></div><button className="admin-secondary" onClick={refresh}><RefreshCw size={15} /> Actualiser</button></div>
      <div className="admin-mobile-carousel">
      <section className="admin-panel"><div className="panel-heading"><div><p className="eyebrow accent">ADMINISTRATEURS</p><h3>Accès Administration</h3></div><span>{admins.length}</span></div><form className="admin-admin-form" onSubmit={saveAdmin}><input value={adminForm.telegram_id} onChange={event => setAdminForm({ ...adminForm, telegram_id: event.target.value })} placeholder="ID Telegram *" inputMode="numeric" required /><input value={adminForm.username} onChange={event => setAdminForm({ ...adminForm, username: event.target.value })} placeholder="Nom d’utilisateur" /><input value={adminForm.first_name} onChange={event => setAdminForm({ ...adminForm, first_name: event.target.value })} placeholder="Prénom" /><input value={adminForm.last_name} onChange={event => setAdminForm({ ...adminForm, last_name: event.target.value })} placeholder="Nom" /><button className="primary-button" type="submit">Ajouter / modifier</button></form>{admins.length === 0 ? <Empty text="Aucun administrateur enregistré en base." /> : <div className="admin-table"><div className="admin-table-head"><span>Utilisateur</span><span>ID Telegram</span><span>Ajouté le</span><span>Action</span></div>{admins.map(admin => <div className="admin-table-row" key={admin.telegram_id}><span><strong>{[admin.first_name, admin.last_name].filter(Boolean).join(' ') || 'Utilisateur Telegram'}</strong><small>{admin.username ? `@${admin.username}` : 'Sans nom d’utilisateur'}</small></span><span>{admin.telegram_id}</span><span>{date(admin.created_at)}</span><button className="admin-delete" type="button" onClick={() => removeAdmin(admin.telegram_id)}>Supprimer</button></div>)}</div>}</section>
      <section className="admin-panel"><div className="panel-heading"><div><p className="eyebrow">PROFILS TELEGRAM</p><h3>Utilisateurs récents</h3></div><span>{profiles.length}</span></div>{loading ? <Loading /> : profiles.length === 0 ? <Empty text="Aucun profil enregistré pour le moment." /> : <div className="profile-table">{profiles.map(profile => <div className="profile-card" key={profile.telegram_id}><div className="profile-avatar">{(profile.first_name || 'T').slice(0, 1).toUpperCase()}</div><div className="profile-main"><strong>{displayName(profile)}</strong><small>{profile.username ? `@${profile.username}` : `ID ${profile.telegram_id}`}</small></div><div className="profile-meta"><b>{profile.conversation_count || 0}</b><small>conversation(s)</small></div><div className="profile-date"><small>Dernière activité</small><span>{date(profile.last_activity || profile.created_at)}</span></div><button className="admin-profile-action" type="button" onClick={() => isProfileAdmin(profile.telegram_id) ? removeAdmin(profile.telegram_id) : addAdminFromProfile(profile)}>{isProfileAdmin(profile.telegram_id) ? 'Retirer admin' : 'Ajouter admin'}</button></div>)}</div>}</section>
      <section className="admin-panel"><div className="panel-heading"><div><p className="eyebrow">ÉCHANGES</p><h3>Conversations</h3></div><span>{conversations.length}</span></div>{loading ? <Loading /> : conversations.length === 0 ? <Empty text="Aucune conversation enregistrée." /> : <div className="conversation-list">{conversations.map(conversation => <button className="conversation-card" key={conversation.id} onClick={() => openConversation(conversation)}><span className="conversation-icon"><MessageCircle size={18} /></span><span className="conversation-main"><strong>{conversation.title || 'Michelle'}</strong><small>Utilisateur Telegram : {conversation.external_user_id}</small></span><span className="conversation-date"><Clock3 size={14} />{date(conversation.updated_at)}</span><ChevronRight size={18} /></button>)}</div>}</section>
      </div>
</div>
    {selected && <div className="admin-overlay" onMouseDown={() => setSelected(null)}><section className="conversation-sheet" onMouseDown={event => event.stopPropagation()}><div className="sheet-heading"><div><p className="eyebrow accent">CONVERSATION</p><h2>{selected.title || 'Michelle'}</h2><small>Utilisateur Telegram : {selected.external_user_id}</small></div><button className="close-button" onClick={() => setSelected(null)} aria-label="Fermer"><X size={20} /></button></div><div className="admin-messages">{messages.length === 0 ? <Empty text="Aucun message dans cette conversation." /> : messages.map(message => <div className={`admin-message ${message.role}`} key={message.id}><span>{message.text}</span><time>{date(message.sent_at)}</time></div>)}</div></section></div>}
  </main>
}

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value?: number }) { return <div className="stat-card"><span><Icon size={19} /></span><div><strong>{value ?? 0}</strong><small>{label}</small></div></div> }
function Loading() { return <div className="admin-loading"><span /><span /><span /></div> }
function Empty({ text }: { text: string }) { return <div className="admin-empty">{text}</div> }
