'use client'

import { ReactNode, useState } from 'react'

const PANELS = [
  { id: 'settings-company', label: 'Entreprise' },
  { id: 'settings-preferences', label: 'Préférences' },
] as const

export default function SettingsCarousel({ company, preferences }: { company: ReactNode; preferences: ReactNode }) {
  const [activeIndex, setActiveIndex] = useState(0)
  const panel = PANELS[activeIndex]

  return <div className="settings-carousel">
    <div className="settings-carousel-nav" role="tablist" aria-label="Paramètres">
      {PANELS.map((item, index) => <button key={item.id} id={`${item.id}-tab`} type="button" role="tab" aria-selected={activeIndex === index} aria-controls={`${item.id}-panel`} tabIndex={activeIndex === index ? 0 : -1} onClick={() => setActiveIndex(index)} onKeyDown={event => { const next = event.key === 'ArrowRight' ? (index + 1) % PANELS.length : event.key === 'ArrowLeft' ? (index + PANELS.length - 1) % PANELS.length : event.key === 'Home' ? 0 : event.key === 'End' ? PANELS.length - 1 : index; if (next !== index) { event.preventDefault(); setActiveIndex(next); document.getElementById(`${PANELS[next].id}-tab`)?.focus() } }}>{item.label}</button>)}
    </div>
    <section id={`${panel.id}-panel`} className="settings-section" role="tabpanel" aria-labelledby={`${panel.id}-tab`}>
      {activeIndex === 0 ? company : preferences}
    </section>
  </div>
}
