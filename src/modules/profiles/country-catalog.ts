export type CountryOption = {
  code: string
  name: string
  phoneCode: string
  currency: string
  currencyName: string
}

// Keep this catalogue explicit and server-validated. The browser never defines
// the derived phone or currency values.
export const COUNTRY_OPTIONS: readonly CountryOption[] = [
  { code: 'GA', name: 'Gabon', phoneCode: '+241', currency: 'XAF', currencyName: 'Franc CFA BEAC' },
  { code: 'CM', name: 'Cameroun', phoneCode: '+237', currency: 'XAF', currencyName: 'Franc CFA BEAC' },
  { code: 'CG', name: 'Congo', phoneCode: '+242', currency: 'XAF', currencyName: 'Franc CFA BEAC' },
  { code: 'CD', name: 'République démocratique du Congo', phoneCode: '+243', currency: 'CDF', currencyName: 'Franc congolais' },
  { code: 'CI', name: "Côte d’Ivoire", phoneCode: '+225', currency: 'XOF', currencyName: 'Franc CFA BCEAO' },
  { code: 'SN', name: 'Sénégal', phoneCode: '+221', currency: 'XOF', currencyName: 'Franc CFA BCEAO' },
  { code: 'BJ', name: 'Bénin', phoneCode: '+229', currency: 'XOF', currencyName: 'Franc CFA BCEAO' },
  { code: 'TG', name: 'Togo', phoneCode: '+228', currency: 'XOF', currencyName: 'Franc CFA BCEAO' },
  { code: 'BF', name: 'Burkina Faso', phoneCode: '+226', currency: 'XOF', currencyName: 'Franc CFA BCEAO' },
  { code: 'ML', name: 'Mali', phoneCode: '+223', currency: 'XOF', currencyName: 'Franc CFA BCEAO' },
  { code: 'FR', name: 'France', phoneCode: '+33', currency: 'EUR', currencyName: 'Euro' },
  { code: 'BE', name: 'Belgique', phoneCode: '+32', currency: 'EUR', currencyName: 'Euro' },
  { code: 'CH', name: 'Suisse', phoneCode: '+41', currency: 'CHF', currencyName: 'Franc suisse' },
  { code: 'GB', name: 'Royaume-Uni', phoneCode: '+44', currency: 'GBP', currencyName: 'Livre sterling' },
  { code: 'US', name: 'États-Unis', phoneCode: '+1', currency: 'USD', currencyName: 'Dollar américain' },
  { code: 'CA', name: 'Canada', phoneCode: '+1', currency: 'CAD', currencyName: 'Dollar canadien' },
] as const

export function findCountry(code: string) {
  return COUNTRY_OPTIONS.find(country => country.code === code.trim().toUpperCase()) || null
}
