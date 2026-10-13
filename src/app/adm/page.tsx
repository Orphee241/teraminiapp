'use client'

import { useEffect, useMemo, useState } from 'react'
import { Activity, ChevronRight, Clock3, MessageCircle, RefreshCw, Search, ShieldCheck, Users, X } from 'lucide-react'

type Profile = { telegram_id: string; username?: string; first_name?: string; last_name?: string; language_code?: string; conversation_count?: number; last_activity?: string; created_at?: string }
type Conversation = { id: string; external_user_id: string; title: string; status: string; created_at: string; updated_at: string }
type Message = { id: string; role: 'user' | 'assistant'; text: string; sent_at: string }
type DashboardData = { profiles: Profile[]; conversations: Conversation[]; stats: { users?: number; conversations?: number; messages?: number } }

const date = (value?: string) => value ? new Date(value).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : '—'
const displayName = (profile: Profile) => [profile.first_name, profile.last_name].filter(Boolean).join(' ') || `Telegram ${profile.telegram_id}`

export default function AdminPage() {
  const [initData, setInitData] = useState('')
  const [data, setData] = useState<DashboardData>({ profiles: [], conversations: [], stats: {} })
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { const webApp = window.Telegram?.WebApp; webApp?.ready(); setInitData(webApp?.initData || '') }, [])
  useEffect(() => { if (initData) void refresh() }, [initData])

  async function refresh() {
    setLoading(true); setError('')
    try {
      const response = await fetch('/api/admin/conversations', { headers: { 'x-telegram-init-data': initData }, cache: 'no-store' })
      const payload = await response.json()
      if (!response.ok) throw new Error(payload.error || 'Accès refusé.')
      setData({ profiles: payload.profiles || [], conversations: payload.conversations || [], stats: payload.stats || {} })
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Tableau de bord indisponible.') } finally { setLoading(false) }
  }

  async function openConversation(conversation: Conversation) {
    setSelected(conversation); setMessages([])
    const response = await fetch(`/api/admin/conversations?conversation_id=${encodeURIComponent(conversation.id)}`, { headers: { 'x-telegram-init-data': initData }, cache: 'no-store' })
    const payload = await response.json(); if (response.ok) setMessages(payload.messages || []); else setError(payload.error || 'Conversation indisponible.')
  }

  const profiles = useMemo(() => data.profiles.filter(profile => `${displayName(profile)} ${profile.username || ''} ${profile.telegram_id}`.toLowerCase().includes(query.toLowerCase())), [data.profiles, query])
  const conversations = useMemo(() => data.conversations.filter(item => `${item.external_user_id} ${item.title}`.toLowerCase().includes(query.toLowerCase())), [data.conversations, query])

  return <main className="admin-shell">
    <header className="admin-header"><div className="brand-mark">T</div><div><p className="eyebrow accent">ESPACE PRIVÉ</p><h1>Administration</h1></div><button className="admin-refresh" onClick={refresh} disabled={loading} aria-label="Actualiser"><RefreshCw size={18} className={loading ? 'spin' : ''} /></button></header>
    <div className="admin-content">
      {error && <div className="admin-alert"><ShieldCheck size={18} /><span>{error}</span><button onClick={() => setError('')} aria-label="Fermer"><X size={16} /></button></div>}
      <section className="admin-intro"><div><p className="eyebrow accent">TABLEAU DE BORD</p><h2>Vue d’ensemble</h2><p>Suivez les utilisateurs Telegram et les échanges avec Michelle.</p></div><div className="admin-status"><span /><span>Connexion sécurisée</span></div></section>
      <section className="stat-grid"><Stat icon={Users} label="Utilisateurs" value={data.stats.users} /><Stat icon={MessageCircle} label="Conversations" value={data.stats.conversations} /><Stat icon={Activity} label="Messages" value={data.stats.messages} /></section>
      <div className="admin-toolbar"><div className="search-field"><Search size={17} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Rechercher un utilisateur…" /></div><button className="admin-secondary" onClick={refresh}><RefreshCw size={15} /> Actualiser</button></div>
      <section className="admin-panel"><div className="panel-heading"><div><p className="eyebrow">PROFILS TELEGRAM</p><h3>Utilisateurs récents</h3></div><span>{profiles.length}</span></div>{loading ? <Loading /> : profiles.length === 0 ? <Empty text="Aucun profil enregistré pour le moment." /> : <div className="profile-table">{profiles.map(profile => <div className="profile-card" key={profile.telegram_id}><div className="profile-avatar">{(profile.first_name || 'T').slice(0, 1).toUpperCase()}</div><div className="profile-main"><strong>{displayName(profile)}</strong><small>{profile.username ? `@${profile.username}` : `ID ${profile.telegram_id}`}</small></div><div className="profile-meta"><b>{profile.conversation_count || 0}</b><small>conversation(s)</small></div><div className="profile-date"><small>Dernière activité</small><span>{date(profile.last_activity || profile.created_at)}</span></div></div>)}</div>}</section>
      <section className="admin-panel"><div className="panel-heading"><div><p className="eyebrow">ÉCHANGES</p><h3>Conversations</h3></div><span>{conversations.length}</span></div>{loading ? <Loading /> : conversations.length === 0 ? <Empty text="Aucune conversation enregistrée." /> : <div className="conversation-list">{conversations.map(conversation => <button className="conversation-card" key={conversation.id} onClick={() => openConversation(conversation)}><span className="conversation-icon"><MessageCircle size={18} /></span><span className="conversation-main"><strong>{conversation.title || 'Michelle'}</strong><small>Utilisateur Telegram : {conversation.external_user_id}</small></span><span className="conversation-date"><Clock3 size={14} />{date(conversation.updated_at)}</span><ChevronRight size={18} /></button>)}</div>}</section>
    </div>
    {selected && <div className="admin-overlay" onMouseDown={() => setSelected(null)}><section className="conversation-sheet" onMouseDown={event => event.stopPropagation()}><div className="sheet-heading"><div><p className="eyebrow accent">CONVERSATION</p><h2>{selected.title || 'Michelle'}</h2><small>Utilisateur Telegram : {selected.external_user_id}</small></div><button className="close-button" onClick={() => setSelected(null)} aria-label="Fermer"><X size={20} /></button></div><div className="admin-messages">{messages.length === 0 ? <Empty text="Aucun message dans cette conversation." /> : messages.map(message => <div className={`admin-message ${message.role}`} key={message.id}><span>{message.text}</span><time>{date(message.sent_at)}</time></div>)}</div></section></div>}
  </main>
}

function Stat({ icon: Icon, label, value }: { icon: typeof Users; label: string; value?: number }) { return <div className="stat-card"><span><Icon size={19} /></span><div><strong>{value ?? 0}</strong><small>{label}</small></div></div> }
function Loading() { return <div className="admin-loading"><span /><span /><span /></div> }
function Empty({ text }: { text: string }) { return <div className="admin-empty">{text}</div> }
