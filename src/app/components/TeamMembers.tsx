'use client'

import { useEffect, useState } from 'react'
import { UserPlus, X } from 'lucide-react'

type Member = { telegram_id: string; role: string; first_name?: string; last_name?: string; username?: string }

const roleLabel: Record<string, string> = { admin: 'Administrateur', manager: 'Manager', operator: 'Opérateur', supervisor: 'Superviseur' }

export default function TeamMembers() {
  const [members, setMembers] = useState<Member[]>([])
  const [telegramId, setTelegramId] = useState('')
  const [role, setRole] = useState('operator')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const authHeaders = () => ({ 'x-telegram-init-data': window.Telegram?.WebApp?.initData || '' })
  const load = async () => { const response = await fetch('/api/team/members', { headers: authHeaders(), cache: 'no-store' }); if (response.ok) setMembers((await response.json()).members || []) }
  useEffect(() => { void load() }, [])
  const add = async (event: React.FormEvent) => { event.preventDefault(); if (!/^\d{1,20}$/.test(telegramId) || busy) return; setBusy(true); setMessage(''); try { const response = await fetch('/api/team/members', { method: 'POST', headers: { ...authHeaders(), 'content-type': 'application/json' }, body: JSON.stringify({ telegram_id: telegramId, role }) }); const payload = await response.json().catch(() => ({})); if (!response.ok) throw new Error(payload.error || 'Ajout impossible.'); setTelegramId(''); await load(); setMessage('Membre ajouté.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Ajout impossible.') } finally { setBusy(false) } }
  const remove = async (id: string) => { if (busy) return; setBusy(true); try { const response = await fetch(`/api/team/members?telegram_id=${encodeURIComponent(id)}`, { method: 'DELETE', headers: { ...authHeaders(), 'x-requested-with': 'XMLHttpRequest' } }); if (!response.ok) throw new Error('Retrait impossible.'); await load(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Retrait impossible.') } finally { setBusy(false) } }
  return <section className="team-members"><div className="settings-section-title"><UserPlus size={19} /><span><strong>Équipe</strong><small>Les administrateurs et managers reçoivent les notifications de l’entreprise.</small></span></div><form className="team-member-form" onSubmit={add}><input aria-label="ID Telegram du membre" inputMode="numeric" placeholder="ID Telegram du membre" value={telegramId} onChange={event => setTelegramId(event.target.value)} required /><select aria-label="Rôle du membre" value={role} onChange={event => setRole(event.target.value)}><option value="admin">Administrateur</option><option value="manager">Manager</option><option value="operator">Opérateur</option><option value="supervisor">Superviseur</option></select><button type="submit" disabled={busy}>Ajouter</button></form>{message && <p className="team-member-message" role="status">{message}</p>}<div className="team-member-list">{members.map(member => <div className="team-member-row" key={member.telegram_id}><span><strong>{[member.first_name, member.last_name].filter(Boolean).join(' ') || (member.username ? `@${member.username}` : `Telegram ${member.telegram_id}`)}</strong><small>{roleLabel[member.role] || member.role} · ID {member.telegram_id}</small></span>{member.role !== 'admin' && <button type="button" aria-label={`Retirer ${member.telegram_id}`} onClick={() => void remove(member.telegram_id)} disabled={busy}><X size={15} /></button>}</div>)}</div></section>
}
