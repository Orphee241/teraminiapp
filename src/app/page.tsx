'use client'

import { useState } from 'react'
import { ArrowRight, MessageCircle, FileText, ShoppingBag, ClipboardList, Menu, X } from 'lucide-react'

const actions = [
  { title:'Demander un devis', text:'Décrivez votre projet et recevez une orientation rapide.', icon:FileText },
  { title:'Découvrir nos services', text:'Explorez les solutions numériques proposées par Terainterface.', icon:ShoppingBag },
  { title:'Suivre ma demande', text:'Retrouvez l’état de vos demandes et commandes.', icon:ClipboardList },
]

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false)
  return <main className="min-h-screen overflow-hidden bg-[#0a0a0f] text-white">
    <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(212,46,91,.18),transparent_35%),radial-gradient(circle_at_90%_80%,rgba(139,21,56,.14),transparent_35%)]" />
    <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
      <div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D42E5B] font-display text-xl">T</div><div><p className="font-display text-2xl leading-none">Terainterface</p><p className="text-xs uppercase tracking-[.2em] text-white/50">Mini-app</p></div></div>
      <button onClick={()=>setMenuOpen(!menuOpen)} className="rounded-lg border border-white/10 p-2 sm:hidden" aria-label="Menu">{menuOpen?<X/>:<Menu/>}</button>
      <nav className={`${menuOpen?'block':'hidden'} absolute right-5 top-20 rounded-xl border border-white/10 bg-[#151017] p-3 sm:static sm:block sm:border-0 sm:bg-transparent sm:p-0`}><button className="rounded-lg px-4 py-2 text-sm text-white/70 hover:text-white">Aide</button></nav>
    </header>
    <section className="relative z-10 mx-auto max-w-6xl px-5 pb-12 pt-12 sm:px-8 sm:pt-20">
      <div className="max-w-3xl"><p className="mb-4 text-sm uppercase tracking-[.3em] text-[#e54d75]">Votre espace Terainterface</p><h1 className="font-display text-6xl leading-[.9] sm:text-8xl">Choisissez votre parcours</h1><p className="mt-6 max-w-xl text-lg leading-relaxed text-white/65">Accédez rapidement à nos services, demandez un devis ou échangez directement avec Michelle.</p></div>
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{actions.map(({title,text,icon:Icon})=><button key={title} className="group rounded-2xl border border-white/10 bg-white/[.04] p-6 text-left transition hover:-translate-y-1 hover:border-[#D42E5B]/70 hover:bg-[#D42E5B]/10"><Icon className="mb-8 h-7 w-7 text-[#e54d75]"/><h2 className="font-display text-2xl">{title}</h2><p className="mt-2 text-sm leading-relaxed text-white/55">{text}</p><ArrowRight className="mt-6 h-5 w-5 text-white/40 transition group-hover:translate-x-1 group-hover:text-white"/></button>)}</div>
      <div className="mt-6 rounded-2xl border border-[#D42E5B]/35 bg-gradient-to-r from-[#D42E5B]/20 to-transparent p-6 sm:flex sm:items-center sm:justify-between"><div><p className="font-display text-2xl">Vous préférez échanger ?</p><p className="mt-1 text-sm text-white/60">Michelle est disponible directement dans le bot Terainterface.</p></div><button className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#D42E5B] px-5 py-3 text-sm font-semibold transition hover:bg-[#b31d45] sm:mt-0"><MessageCircle className="h-5 w-5"/>Discuter avec Michelle</button></div>
    </section>
    <footer className="relative z-10 mx-auto max-w-6xl px-5 pb-8 text-xs text-white/35 sm:px-8">© {new Date().getFullYear()} Terainterface · Mini-app indépendante</footer>
  </main>
}
