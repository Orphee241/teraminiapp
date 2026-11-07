'use client'

import { useState } from 'react'
import { deriveBrandPalette } from '../../lib/document-branding'

type DocumentKind = 'devis' | 'facture'

export default function DocumentColorSimulator({ color }: { color: string }) {
  const [kind, setKind] = useState<DocumentKind>('devis')
  const palette = deriveBrandPalette(color)
  const title = kind === 'devis' ? 'DEVIS' : 'FACTURE'
  const objectHeading = kind === 'devis' ? 'OBJET DU DEVIS' : 'OBJET DE LA FACTURE'

  return (
    <section className="document-color-simulator" aria-label="Simulation du modèle de devis et facture">
      <div className="document-simulator-heading">
        <div><strong>Modèle réel de devis / facture</strong><small>Les zones colorées correspondent au document généré.</small></div>
        <div className="document-simulator-tabs" role="tablist" aria-label="Type de document à simuler">
          {(['devis', 'facture'] as const).map(option => (
            <button key={option} type="button" role="tab" aria-selected={kind === option} onClick={() => setKind(option)}>{option === 'devis' ? 'Devis' : 'Facture'}</button>
          ))}
        </div>
      </div>
      <article className="document-simulator-paper" aria-label={`Aperçu ${kind}`} style={{ '--sim-primary': palette.primary, '--sim-deep': palette.deep, '--sim-pale': palette.pale, '--sim-title-text': palette.titleText, '--sim-header-text': palette.headerText } as React.CSSProperties}>
        <header className="simulator-top-band" aria-label="En-tête coloré"><span className="simulator-band-notch" /></header>
        <div className="simulator-document-head">
          <div className="simulator-logo-zone"><div className="simulator-logo-mark">T</div><small>Terainterface</small></div>
          <h3>{title}</h3>
        </div>
        <div className="simulator-identity-grid">
          <div><strong>Terainterface SARL</strong><span>Essassa, Ntoum, Estuaire</span><span>NIF : 202601003540 N</span><span>Tél. : 077 00 00 00</span></div>
          <div><span>N° : {kind === 'devis' ? 'DEV' : 'FAC'}-20261107-001</span><span>Date : 07/11/2026</span><span>{kind === 'devis' ? 'Validité : 15 jours' : 'Échéance : à réception'}</span><span>Devise : FCFA</span></div>
        </div>
        <div className="simulator-client-object">
          <div><strong>CLIENT</strong><span>Nom : Client Exemple</span><span>Téléphone : 077 00 00 00</span><span>Adresse : Libreville, Gabon</span></div>
          <div><strong>{objectHeading}</strong><span>Prestation : Service numérique</span><span>Type : Service</span><span>Référence : REF-001</span></div>
        </div>
        <div className="simulator-table" role="table" aria-label="Lignes du document">
          <div className="simulator-table-head" role="row"><span role="columnheader">DÉSIGNATION</span><span role="columnheader">QTÉ</span><span role="columnheader">P.U.</span><span role="columnheader">TOTAL</span></div>
          <div className="simulator-table-row" role="row"><span role="cell">Prestation de service</span><span role="cell">1</span><span role="cell">50 000</span><span role="cell">50 000</span></div>
        </div>
        <div className="simulator-totals"><span>Total HT : 50 000 FCFA</span><span>TVA : Non appliquée</span></div>
        <div className="simulator-document-total"><span>Net à payer : 50 000 FCFA</span></div>
        <div className="simulator-signatures"><span>Signature / cachet</span><span>Signature et cachet Client</span></div>
        <footer className="simulator-footer">Terainterface SARL · Essassa, Ntoum · Tél. : 077 00 00 00</footer>
      </article>
    </section>
  )
}
