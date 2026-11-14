'use client'

import { DEFAULT_BRAND_COLOR } from '../../lib/document-branding'

export default function BrandColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  const selected = /^#[0-9a-fA-F]{6}$/.test(value) ? value.toUpperCase() : DEFAULT_BRAND_COLOR

  return <div className="brand-color-setting">
    <div className="brand-color-heading">
      <span><strong>Couleur des documents</strong><small>Choisissez la couleur principale de vos prochains devis et factures.</small></span>
      <label className="brand-color-input-wrap">
        <input aria-label="Choisir une couleur" type="color" value={selected} onChange={event => onChange(event.target.value.toUpperCase())} />
        <span>Choisir une couleur</span>
      </label>
    </div>
    <output className="brand-color-value" aria-label="Couleur sélectionnée">{selected}</output>
    <small className="brand-color-note">La couleur est appliquée au simulateur ci-dessous. Les documents déjà créés gardent leur apparence.</small>
  </div>
}
