'use client'

import { ReactNode, useRef, useState } from 'react'

const PANELS = [
  { id: 'settings-company', label: 'Entreprise' },
  { id: 'settings-preferences', label: 'Préférences' },
] as const

export default function SettingsCarousel({ company, preferences }: { company: ReactNode; preferences: ReactNode }) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)

  const selectPanel = (index: number) => {
    setActiveIndex(index)
    trackRef.current?.querySelector<HTMLElement>(`#${PANELS[index].id}`)?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest', inline: 'start' })
  }

  const updateActivePanel = () => {
    const track = trackRef.current
    if (!track) return
    const panels = Array.from(track.querySelectorAll<HTMLElement>('.settings-carousel-panel'))
    if (panels.length < 2) return
    const midpoint = track.scrollLeft + track.clientWidth / 2
    const nextIndex = panels.findIndex(panel => panel.offsetLeft + panel.offsetWidth / 2 >= midpoint)
    setActiveIndex(nextIndex < 0 ? panels.length - 1 : nextIndex)
  }

  return <div className="settings-carousel" aria-label="Paramètres de l’entreprise">
    <div className="settings-carousel-nav" role="group" aria-label="Aller à une section des paramètres">
      {PANELS.map((panel, index) => <button key={panel.id} type="button" aria-pressed={activeIndex === index} onClick={() => selectPanel(index)}>{panel.label}</button>)}
    </div>
    <div className="settings-sections" ref={trackRef} onScroll={updateActivePanel}>
      <section id="settings-company" className="settings-section settings-carousel-panel" aria-label="Entreprise" aria-roledescription="diapositive">{company}</section>
      <section id="settings-preferences" className="settings-section settings-carousel-panel" aria-label="Préférences" aria-roledescription="diapositive">{preferences}</section>
    </div>
  </div>
}
