'use client'

import { useState } from 'react'
import { deriveBrandPalette } from '../../lib/document-branding'

type DocumentKind = 'devis' | 'facture'

export default function DocumentColorSimulator({ color }: { color: string }) {
  const [kind, setKind] = useState<DocumentKind>('devis')
  const palette = deriveBrandPalette(color)
  const title = kind === 'devis' ? 'DEVIS' : 'FACTURE'

  return (
    <section className="document-color-simulator" aria-label="Simulation du modèle de devis et facture">
      <div className="document-simulator-heading">
        <div><strong>Modèle de devis / facture</strong><small>Aperçu de la couleur et de ses teintes dérivées.</small></div>
        <div className="document-simulator-tabs" role="tablist" aria-label="Type de document à simuler">
          {(['devis', 'facture'] as const).map(option => (
            <button key={option} type="button" role="tab" aria-selected={kind === option} onClick={() => setKind(option)}>
              {option === 'devis' ? 'Devis' : 'Facture'}
            </button>
          ))}
        </div>
      </div>
      <article className="document-simulator-paper" aria-label={`Aperçu ${kind}`} style={{ '--sim-primary': palette.primary, '--sim-deep': palette.deep, '--sim-pale': palette.pale, '--sim-title-text': palette.titleText, '--sim-header-text': palette.headerText } as React.CSSProperties}>
        <header className="simulator-document-header">
          <div className="simulator-company-mark">T</div>
          <div className="simulator-company"><strong>VOTRE ENTREPRISE</strong><small>Adresse de l’entreprise · Téléphone</small></div>
          <h3>{title}</h3>
        </header>
        <div className="simulator-document-meta"><strong>Client : Client Exemple</strong><span>N° {kind === 'devis' ? 'DEV' : 'FAC'}-2026-001</span><span>Date : 07/11/2026</span></div>
        <div className="simulator-table" role="table" aria-label="Lignes du document">
          <div className="simulator-table-head" role="row"><span role="columnheader">DÉSIGNATION</span><span role="columnheader">QTÉ</span><span role="columnheader">P.U.</span><span role="columnheader">TOTAL</span></div>
          <div className="simulator-table-row" role="row"><span role="cell">Prestation de service</span><span role="cell">1</span><span role="cell">35 000</span><span role="cell">35 000</span></div>
          <div className="simulator-table-row" role="row"><span role="cell">Accompagnement personnalisé</span><span role="cell">1</span><span role="cell">15 000</span><span role="cell">15 000</span></div>
        </div>
        <footer className="simulator-document-total"><span>NET À PAYER</span><strong>50 000 FCFA</strong></footer>
      </article>
    </section>
  )
}
