'use client'

import { useState } from 'react'
import { FileText, Home, Headphones, Menu, MessageCircle, Pencil, Plus, Receipt, Settings, ShoppingBag, Trash2, User, X, ClipboardList } from 'lucide-react'

type Tab = 'accueil' | 'services' | 'profil'
type DocumentAction = 'Créer' | 'Modifier' | 'Supprimer'
type DocumentKind = 'devis' | 'facture'

const documentActions: { label: DocumentAction; kind: 'devis' | 'facture'; icon: typeof FileText }[] = [
  { label: 'Créer', kind: 'devis', icon: Plus },
  { label: 'Modifier', kind: 'devis', icon: Pencil },
  { label: 'Supprimer', kind: 'devis', icon: Trash2 },
  { label: 'Créer', kind: 'facture', icon: Plus },
  { label: 'Modifier', kind: 'facture', icon: Pencil },
  { label: 'Supprimer', kind: 'facture', icon: Trash2 },
]

export default function HomePage() {
  const [tab, setTab] = useState<Tab>('accueil')
  const [menuOpen, setMenuOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [quoteOpen, setQuoteOpen] = useState(false)
  const [quoteKind, setQuoteKind] = useState<DocumentKind>('devis')
  const [quoteBusy, setQuoteBusy] = useState(false)
  const [quoteResult, setQuoteResult] = useState('')

  const selectAction = (label: string, kind: DocumentKind) => {
    if (label === 'Créer') {
      setQuoteKind(kind)
      setQuoteResult('')
      setQuoteOpen(true)
      return
    }
    setNotice(`${label} une ${kind} — ce parcours sera bientôt disponible.`)
    setTimeout(() => setNotice(''), 3500)
  }

  const createQuote = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setQuoteBusy(true)
    setQuoteResult('')
    const form = new FormData(event.currentTarget)
    const quantity = Number(form.get('quantity') || 1)
    const unitPrice = Number(form.get('unit_price') || 0)
    const payload = {
      document_type: quoteKind,
      issuer: { name: String(form.get('issuer_name') || 'Terainterface'), company: 'Terainterface', address: '', phone: '', tax_id: '' },
      client: { name: String(form.get('client_name') || ''), company: String(form.get('client_company') || ''), address: String(form.get('client_address') || ''), phone: String(form.get('client_phone') || ''), tax_id: '' },
      items: [{ designation: String(form.get('designation') || ''), quantity, unit_price: unitPrice }],
      template_profile: 'official', vat_applied: false, persist_crm: true,
      idempotency_key: `miniapp-${quoteKind}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    }
    try {
      const response = await fetch('/api/documents', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || data.detail || 'La création a échoué.')
      setQuoteResult(`${quoteKind === 'devis' ? 'Devis' : 'Facture'} ${data.number || ''} créé(e) avec succès.`)
      event.currentTarget.reset()
    } catch (error) { setQuoteResult(error instanceof Error ? error.message : 'La création a échoué.') }
    finally { setQuoteBusy(false) }
  }

  return <main className="min-h-screen overflow-hidden bg-[#0a0a0f] pb-24 text-white">
    <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(212,46,91,.18),transparent_35%),radial-gradient(circle_at_90%_80%,rgba(139,21,56,.14),transparent_35%)]" />
    <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
      <button onClick={() => setTab('accueil')} className="flex items-center gap-3 text-left"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D42E5B] font-display text-xl">T</div><div><p className="font-display text-2xl leading-none">Terainterface</p><p className="text-xs uppercase tracking-[.2em] text-white/50">Mini-app</p></div></button>
      <button onClick={() => setMenuOpen(!menuOpen)} className="rounded-lg border border-white/10 p-2 sm:hidden" aria-label="Menu">{menuOpen ? <X /> : <Menu />}</button>
      {menuOpen && <div className="absolute right-5 top-20 rounded-xl border border-white/10 bg-[#151017] p-3"><button onClick={() => { setTab('profil'); setMenuOpen(false) }} className="rounded-lg px-4 py-2 text-sm text-white/70">Aide et contact</button></div>}
    </header>

    <section className="relative z-10 mx-auto max-w-6xl px-5 pt-8 sm:px-8 sm:pt-14">
      {tab === 'accueil' && <div>
        <p className="mb-4 text-sm uppercase tracking-[.3em] text-[#e54d75]">Votre espace Terainterface</p>
        <h1 className="font-display text-6xl leading-[.9] sm:text-8xl">Bienvenue</h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-white/65">Gérez vos services, vos devis et vos factures depuis un seul espace.</p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2"><HomeCard icon={ShoppingBag} title="Services" text="Accéder à vos devis, factures et commandes." onClick={() => setTab('services')} /><HomeCard icon={MessageCircle} title="Michelle" text="Discuter directement avec notre assistante." onClick={() => setNotice('La conversation avec Michelle s’ouvrira depuis le bot Terainterface.')} /></div>
      </div>}

      {tab === 'services' && <div>
        <p className="mb-4 text-sm uppercase tracking-[.3em] text-[#e54d5b]">Gestion commerciale</p><h1 className="font-display text-6xl leading-[.9] sm:text-8xl">Services</h1><p className="mt-5 text-white/60">Tout ce qui concerne vos devis, factures et commandes.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{documentActions.map(({ label, kind, icon: Icon }) => <button key={`${label}-${kind}`} onClick={() => selectAction(label, kind)} className="group rounded-2xl border border-white/10 bg-white/[.04] p-5 text-left transition hover:-translate-y-1 hover:border-[#D42E5B]/70 hover:bg-[#D42E5B]/10"><Icon className="mb-7 h-6 w-6 text-[#e54d75]" /><p className="text-xs uppercase tracking-widest text-white/40">{kind}</p><h2 className="mt-1 font-display text-2xl">{label} une {kind}</h2></button>)}</div>
        <button onClick={() => setNotice('Le suivi des commandes sera bientôt disponible.')} className="mt-4 flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/[.04] p-5 text-left hover:border-[#D42E5B]/60"><ClipboardList className="h-6 w-6 text-[#e54d5b]" /><span><strong className="block font-display text-2xl">Suivre mes commandes</strong><small className="text-white/50">Consulter l’état de vos demandes</small></span></button>
      </div>}

      {tab === 'profil' && <div><p className="mb-4 text-sm uppercase tracking-[.3em] text-[#e54d75]">Espace personnel</p><h1 className="font-display text-6xl leading-[.9] sm:text-8xl">Profil</h1><div className="mt-8 grid gap-4 sm:grid-cols-2"><ProfileCard icon={Settings} title="Paramètres" text="Gérer vos préférences et votre compte." /><ProfileCard icon={Headphones} title="Assistance" text="Obtenir de l’aide sur un service ou une commande." /><ProfileCard icon={MessageCircle} title="Nous contacter" text="Signaler un souci ou envoyer une demande." /></div></div>}
    </section>

    {quoteOpen && <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/75 p-4 sm:items-center"><div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-white/10 bg-[#151017] p-6"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-widest text-[#e54d75]">Nouveau document</p><h2 className="font-display text-3xl">Créer une {quoteKind}</h2></div><button onClick={() => setQuoteOpen(false)} className="rounded-lg p-2 text-white/50 hover:bg-white/10 hover:text-white" aria-label="Fermer"><X /></button></div><form onSubmit={createQuote} className="mt-6 space-y-4"><Field name="client_name" label="Nom du client" required /><Field name="client_company" label="Entreprise du client" /><Field name="client_phone" label="Téléphone" type="tel" /><Field name="client_address" label="Adresse" /><Field name="designation" label="Prestation ou article" required /><div className="grid grid-cols-2 gap-4"><Field name="quantity" label="Quantité" type="number" min="1" defaultValue="1" required /><Field name="unit_price" label="Prix unitaire (FCFA)" type="number" min="1" required /></div><button disabled={quoteBusy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#D42E5B] px-5 py-3 font-semibold transition hover:bg-[#b31d45] disabled:cursor-wait disabled:opacity-60">{quoteBusy ? 'Création en cours…' : `Créer la ${quoteKind}`}</button>{quoteResult && <p role="status" className="rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white/75">{quoteResult}</p>}</form></div></div>}
    {notice && <div role="status" className="fixed bottom-24 left-5 right-5 z-30 rounded-xl border border-[#D42E5B]/60 bg-[#241019] p-4 text-center text-sm shadow-2xl sm:left-auto sm:right-8 sm:max-w-sm">{notice}</div>}
    <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-[#0f0b10]/95 px-4 pb-4 pt-3 backdrop-blur-xl"><div className="mx-auto flex max-w-md items-center justify-around"><NavButton active={tab === 'accueil'} icon={Home} label="Accueil" onClick={() => setTab('accueil')} /><NavButton active={tab === 'services'} icon={ShoppingBag} label="Services" onClick={() => setTab('services')} /><NavButton active={tab === 'profil'} icon={User} label="Profil" onClick={() => setTab('profil')} /></div></nav>
  </main>
}

function Field({ name, label, type = 'text', required = false, min, defaultValue }: { name: string; label: string; type?: string; required?: boolean; min?: string; defaultValue?: string }) { return <label className="block text-sm text-white/65">{label}{required && <span className="ml-1 text-[#e54d75]">*</span>}<input name={name} type={type} min={min} defaultValue={defaultValue} required={required} className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-3 text-white outline-none focus:border-[#D42E5B]" /></label> }
function HomeCard({ icon: Icon, title, text, onClick }: { icon: typeof Home; title: string; text: string; onClick: () => void }) { return <button onClick={onClick} className="group rounded-2xl border border-white/10 bg-white/[.04] p-6 text-left transition hover:-translate-y-1 hover:border-[#D42E5B]/70 hover:bg-[#D42E5B]/10"><Icon className="mb-8 h-7 w-7 text-[#e54d75]" /><h2 className="font-display text-2xl">{title}</h2><p className="mt-2 text-sm leading-relaxed text-white/55">{text}</p></button> }
function ProfileCard({ icon: Icon, title, text }: { icon: typeof Settings; title: string; text: string }) { return <button className="rounded-2xl border border-white/10 bg-white/[.04] p-6 text-left hover:border-[#D42E5B]/70"><Icon className="mb-7 h-6 w-6 text-[#e54d75]" /><h2 className="font-display text-2xl">{title}</h2><p className="mt-2 text-sm text-white/55">{text}</p></button> }
function NavButton({ active, icon: Icon, label, onClick }: { active: boolean; icon: typeof Home; label: string; onClick: () => void }) { return <button onClick={onClick} className={`flex min-w-20 flex-col items-center gap-1 text-xs transition ${active ? 'text-[#e54d75]' : 'text-white/45 hover:text-white'}`}><Icon className="h-5 w-5" /><span>{label}</span></button> }
