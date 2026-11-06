'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Activity, ChevronRight, Clock3, Eye, EyeOff, MessageCircle, RefreshCw, Search, ShieldCheck, Users, X } from 'lucide-react'
import { createActionGate } from '../../lib/action-gate'
import { configureTelegramBackButton, openTelegramWindow } from '../../lib/telegram-window'

type Profile = { telegram_id: string; username?: string; first_name?: string; last_name?: string; language_code?: string; conversation_count?: number; last_activity?: string; created_at?: string }
type Admin = { telegram_id: string; username?: string; first_name?: string; last_name?: string; created_at?: string }
type Conversation = { id: string; external_user_id: string; title: string; status: string; created_at: string; updated_at: string; username?: string; first_name?: string; last_name?: string }
type Message = { id: string; role: 'user' | 'assistant'; text: string; sent_at: string }
type DashboardData = { profiles: Profile[]; conversations: Conversation[]; stats: { users?: number; conversations?: number; messages?: number } }

const date = (value?: string) => value ? new Date(value).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
function normalizeSearch(value: string) { return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr') }
const matchesSearch = (value: string, query: string) => normalizeSearch(value).includes(normalizeSearch(query))
const displayName = (profile: Pick<Profile, 'telegram_id' | 'first_name' | 'last_name' | 'username'>) => [profile.first_name, profile.last_name].filter(Boolean).join(' ') || (profile.username ? `@${profile.username}` : `Telegram ${profile.telegram_id}`)
const conversationName = (conversation: Conversation) => displayName({ telegram_id: conversation.external_user_id, username: conversation.username, first_name: conversation.first_name, last_name: conversation.last_name })

export default function AdminPage() {
  const [initData, setInitData] = useState('')
  const [data, setData] = useState<DashboardData>({ profiles: [], conversations: [], stats: {} })
  const [admins, setAdmins] = useState<Admin[]>([])
  const [adminForm, setAdminForm] = useState({ telegram_id: '', username: '', first_name: '', last_name: '' })
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
  const refreshGate = useRef(createActionGate())
  const mutationGate = useRef(createActionGate())

  useEffect(() => {
    const webApp = window.Telegram?.WebApp
    webApp?.ready()
    const telegramInitData = webApp?.initData || ''
    setInitData(telegramInitData)
    if (webApp) openTelegramWindow(webApp)
    const syncSafeAreas = () => {
      const safe = webApp?.safeAreaInset || {}
      const content = webApp?.contentSafeAreaInset || {}
      for (const [name, value] of Object.entries(safe)) document.documentElement.style.setProperty(`--tg-safe-area-inset-${name}`, `${Number(value) || 0}px`)
      for (const [name, value] of Object.entries(content)) document.documentElement.style.setProperty(`--tg-content-safe-area-inset-${name}`, `${Number(value) || 0}px`)
    }
    syncSafeAreas()
    webApp?.onEvent?.('safeAreaChanged', syncSafeAreas)
    webApp?.onEvent?.('contentSafeAreaChanged', syncSafeAreas)
    const cleanupBack = webApp ? configureTelegramBackButton(webApp, true, () => { window.location.href = '/' }) : () => undefined
    if (telegramInitData) void fetch('/api/admin/access', { headers: { 'x-telegram-init-data': telegramInitData }, cache: 'no-store' }).then(response => response.ok ? response.json() : null).then(payload => { if (payload?.unlocked) setUnlocked(true); else if (payload && !payload.allowed) setError('Accès administrateur requis.') }).catch(() => undefined)
    return () => {
      cleanupBack()
      webApp?.offEvent?.('safeAreaChanged', syncSafeAreas)
      webApp?.offEvent?.('contentSafeAreaChanged', syncSafeAreas)
    }
  }, [])
  useEffect(() => { if (!error) return; const timer = window.setTimeout(() => setError(''), 8000); return () => window.clearTimeout(timer) }, [error])
  useEffect(() => { if (initData && unlocked) void refresh() }, [initData, unlocked])

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

  async function saveAdmin(event: React.FormEvent) { event.preventDefault(); if (mutationGate.current.busy) return; return mutationGate.current.run(async () => { const response = await fetch('/api/admin/conversations', { method: 'POST', headers: { 'content-type': 'application/json', 'x-telegram-init-data': initData }, body: JSON.stringify(adminForm) }); const payload = await response.json().catch(() => ({})); if (!response.ok) return setError(payload.error || 'Administrateur impossible à enregistrer.'); setAdminForm({ telegram_id: '', username: '', first_name: '', last_name: '' }); await refresh() }) }
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
  const isProfileAdmin = (telegramId: string) => admins.some(admin => admin.telegram_id === telegramId)

  if (!unlocked) return <main className="admin-shell"><header className="admin-header"><div className="brand-mark">T</div><div><p className="eyebrow accent">ESPACE PRIVÉ</p><h1>Administration</h1></div></header><div className="admin-content"><section className="settings-section admin-lock"><ShieldCheck size={24} /><h2>Accès sécurisé</h2><p>Entrez le mot de passe Administration pour continuer.</p><form onSubmit={unlock}><div className="admin-password-wrap"><input className="admin-password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} placeholder="Mot de passe" /><button className="admin-password-toggle" type="button" onClick={() => setShowPassword(value => !value)} aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button></div><button className="primary-button" type="submit">Ouvrir Administration</button></form>{error && <p className={`form-message ${noticeKind}`} role="alert">{error}</p>}</section></div></main>

  return <main className="admin-shell">
    <header className="admin-header"><div className="brand-mark">T</div><div><p className="eyebrow accent">ESPACE PRIVÉ</p><h1>Administration</h1></div><button className="admin-refresh" onClick={refresh} disabled={loading} aria-label="Actualiser"><RefreshCw size={18} className={loading ? 'spin' : ''} /></button></header>
    <div className="admin-content">
      {error && <div className={`admin-alert ${noticeKind}`} role="status"><ShieldCheck size={18} /><span>{error}</span><button onClick={() => setError('')} aria-label="Fermer"><X size={16} /></button></div>}
      <section className="admin-intro"><div><p className="eyebrow accent">TABLEAU DE BORD</p><h2>Vue d’ensemble</h2><p>Suivez les utilisateurs Telegram et les échanges avec Michelle.</p></div><div className="admin-status"><span /><span>Connexion sécurisée</span></div></section>
      <section className="stat-grid"><Stat icon={Users} label="Utilisateurs" value={data.stats.users} /><Stat icon={MessageCircle} label="Conversations" value={data.stats.conversations} /><Stat icon={Activity} label="Messages" value={data.stats.messages} /></section>
      <div className="admin-mobile-carousel">
        <section className="admin-panel"><div className="panel-heading"><div><p className="eyebrow accent">ADMINISTRATEURS</p><h3>Accès Administration</h3></div><span>{filteredAdmins.length}</span></div><div className="admin-search"><Search size={16} /><input aria-label="Rechercher un administrateur" value={adminQuery} onChange={event => setAdminQuery(event.target.value)} placeholder="Rechercher un administrateur…" /></div><form className="admin-admin-form" onSubmit={saveAdmin}><input value={adminForm.telegram_id} onChange={event => setAdminForm({ ...adminForm, telegram_id: event.target.value })} placeholder="ID Telegram *" inputMode="numeric" required /><input value={adminForm.username} onChange={event => setAdminForm({ ...adminForm, username: event.target.value })} placeholder="Nom d’utilisateur" /><input value={adminForm.first_name} onChange={event => setAdminForm({ ...adminForm, first_name: event.target.value })} placeholder="Prénom" /><input value={adminForm.last_name} onChange={event => setAdminForm({ ...adminForm, last_name: event.target.value })} placeholder="Nom" /><button className="primary-button" type="submit">Ajouter / modifier</button></form>{filteredAdmins.length === 0 ? <Empty text={adminQuery ? 'Aucun administrateur ne correspond à cette recherche.' : 'Aucun administrateur enregistré en base.'} /> : <div className="admin-table"><div className="admin-table-head"><span>Utilisateur</span><span>ID Telegram</span><span>Ajouté le</span><span>Action</span></div>{filteredAdmins.map(admin => <div className="admin-table-row" key={admin.telegram_id}><span><strong>{[admin.first_name, admin.last_name].filter(Boolean).join(' ') || (admin.username ? `@${admin.username}` : `Telegram ${admin.telegram_id}`)}</strong><small>{admin.username ? `@${admin.username}` : 'Sans nom d’utilisateur'}</small></span><span>{admin.telegram_id}</span><span>{date(admin.created_at)}</span><button className="admin-delete" type="button" onClick={() => removeAdmin(admin.telegram_id)}>Supprimer</button></div>)}</div>}</section>
        <section className="admin-panel"><div className="panel-heading"><div><p className="eyebrow">PROFILS TELEGRAM</p><h3>Utilisateurs récents</h3></div><span>{profiles.length}</span></div><div className="admin-search"><Search size={16} /><input aria-label="Rechercher un utilisateur" value={profileQuery} onChange={event => setProfileQuery(event.target.value)} placeholder="Rechercher un utilisateur…" /></div>{loading ? <Loading /> : profiles.length === 0 ? <Empty text={profileQuery ? 'Aucun utilisateur ne correspond à cette recherche.' : 'Aucun profil enregistré pour le moment.'} /> : <div className="profile-table">{profiles.map(profile => <div className="profile-card" key={profile.telegram_id}><div className="profile-avatar">{(profile.first_name || 'T').slice(0, 1).toUpperCase()}</div><div className="profile-main"><strong>{displayName(profile)}</strong><small>{profile.username ? `@${profile.username}` : `ID ${profile.telegram_id}`}</small></div><div className="profile-meta"><b>{profile.conversation_count || 0}</b><small>conversation(s)</small></div><div className="profile-date"><small>Dernière activité</small><span>{date(profile.last_activity || profile.created_at)}</span></div><button className="admin-profile-action" type="button" onClick={() => isProfileAdmin(profile.telegram_id) ? removeAdmin(profile.telegram_id) : addAdminFromProfile(profile)}>{isProfileAdmin(profile.telegram_id) ? 'Retirer admin' : 'Ajouter admin'}</button></div>)}</div>}</section>
        <section className="admin-panel"><div className="panel-heading"><div><p className="eyebrow">ÉCHANGES</p><h3>Conversations</h3></div><span>{conversations.length}</span></div><div className="admin-search"><Search size={16} /><input aria-label="Rechercher une conversation" value={conversationQuery} onChange={event => setConversationQuery(event.target.value)} placeholder="Rechercher une conversation…" /></div>{loading ? <Loading /> : conversations.length === 0 ? <Empty text={conversationQuery ? 'Aucune conversation ne correspond à cette recherche.' : 'Aucune conversation enregistrée.'} /> : <div className="conversation-list">{conversations.map(conversation => <button className="conversation-card" key={conversation.id} onClick={() => openConversation(conversation)}><span className="conversation-icon"><MessageCircle size={18} /></span><span className="conversation-main"><strong>{conversationName(conversation)}</strong><small>{conversation.username ? `@${conversation.username} · ` : ''}Utilisateur Telegram : {conversation.external_user_id}</small></span><span className="conversation-date"><Clock3 size={14} />{date(conversation.updated_at)}</span><ChevronRight size={18} /></button>)}</div>}</section>
      </div>
    </div>
    {selected && <div className="admin-overlay" onMouseDown={() => setSelected(null)}><section className="conversation-sheet" onMouseDown={event => event.stopPropagation()}><div className="sheet-heading"><div><p className="eyebrow accent">CONVERSATION</p><h2>{selected.title || 'Michelle'}</h2><small>Utilisateur Telegram : {selected.external_user_id}</small></div><button className="close-button" onClick={() => setSelected(null)} aria-label="Fermer"><X size={20} /></button></div><div className="admin-messages">{messages.length === 0 ? <Empty text="Aucun message dans cette conversation." /> : messages.map(message => <div className={`admin-message ${message.role}`} key={message.id}><span>{message.text}</span><time>{date(message.sent_at)}</time></div>)}</div></section></div>}
  </main>
}

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value?: number }) { return <div className="stat-card"><span><Icon size={19} /></span><div><strong>{value ?? 0}</strong><small>{label}</small></div></div> }
function Loading() { return <div className="admin-loading"><span /><span /><span /></div> }
function Empty({ text }: { text: string }) { return <div className="admin-empty">{text}</div> }
