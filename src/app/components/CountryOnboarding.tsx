'use client'

import { useState } from 'react'
import { COUNTRY_OPTIONS } from '../../modules/profiles/country-catalog'

type Props = { initData: string; onSaved: (profile: Record<string, string>) => void }

export default function CountryOnboarding({ initData, onSaved }: Props) {
  const [countryCode, setCountryCode] = useState('GA')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const selected = COUNTRY_OPTIONS.find(country => country.code === countryCode)
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected || busy) return
    setBusy(true); setError('')
    try {
      const response = await fetch('/api/profile', { method: 'PUT', headers: { 'content-type': 'application/json', 'x-telegram-init-data': initData }, body: JSON.stringify({ country_code: selected.code }) })
      const value = await response.json().catch(() => ({}))
      if (!response.ok || !value.profile) throw new Error('country_save_failed')
      onSaved(value.profile)
    } catch { setError('Impossible d’enregistrer votre pays. Réessayez dans un instant.') } finally { setBusy(false) }
  }
  return <main className="country-onboarding"><section className="country-card"><h1>Votre pays</h1><p>Sélectionnez votre pays pour configurer automatiquement votre indicatif téléphonique et votre devise.</p><form onSubmit={submit}><label htmlFor="country-code">Pays</label><select id="country-code" value={countryCode} onChange={event => setCountryCode(event.target.value)} disabled={busy}>{COUNTRY_OPTIONS.map(country => <option key={country.code} value={country.code}>{country.name}</option>)}</select>{selected && <div className="country-preview"><span>Indicatif : <strong>{selected.phoneCode}</strong></span><span>Devise : <strong>{selected.currency}</strong> — {selected.currencyName}</span></div>}<button className="primary-button" type="submit" disabled={busy}>{busy ? 'Enregistrement…' : 'Continuer'}</button>{error && <p className="form-message error" role="alert">{error}</p>}</form></section></main>
}
