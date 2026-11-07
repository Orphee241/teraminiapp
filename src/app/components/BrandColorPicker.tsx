'use client'

import { BRAND_PRESETS, DEFAULT_BRAND_COLOR, deriveBrandPalette } from '../../lib/document-branding'

export default function BrandColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  const selected = /^#[0-9a-fA-F]{6}$/.test(value) ? value.toUpperCase() : DEFAULT_BRAND_COLOR
  const palette = deriveBrandPalette(selected)

  return <div className="brand-color-setting">
    <div className="brand-color-heading">
      <span><strong>Couleur des documents</strong><small>Personnalisez les accents de vos prochains devis et factures.</small></span>
      <label className="brand-color-input-wrap">
        <input aria-label="Couleur personnalisée" type="color" value={selected} onChange={event => onChange(event.target.value.toUpperCase())} />
        <span>Choisir une couleur</span>
      </label>
    </div>
    <div className="brand-color-presets" role="group" aria-label="Palettes prédéfinies">
      {BRAND_PRESETS.map(preset => {
        const option = deriveBrandPalette(preset.color)
        return <button key={preset.color} type="button" aria-label={`Choisir la palette ${preset.label}`} aria-pressed={selected === preset.color} onClick={() => onChange(preset.color)} style={{ backgroundColor: option.deep, color: option.headerText, borderColor: selected === preset.color ? '#FFFFFF' : option.deep }}>{preset.label}</button>
      })}
    </div>
    <div className="brand-color-preview" aria-label="Aperçu de la palette">
      <span className="brand-preview-header" style={{ backgroundColor: palette.deep, color: palette.headerText }}>DÉSIGNATION　 QTÉ　 P.U.　 TOTAL</span>
      <span className="brand-preview-total" style={{ backgroundColor: palette.pale, color: palette.titleText }}>NET À PAYER</span>
      <span className="brand-preview-accent" style={{ color: palette.titleText, backgroundColor: palette.pale }}>TITRE ET ACCENTS</span>
    </div>
    <small className="brand-color-note">Les documents déjà créés gardent leur apparence. Cette palette s’applique aux nouveaux documents.</small>
  </div>
}
