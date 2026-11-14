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
  { code: 'GH', name: 'Ghana', phoneCode: '+233', currency: 'GHS', currencyName: 'Cedi ghanéen' },
  { code: 'LR', name: 'Liberia', phoneCode: '+231', currency: 'LRD', currencyName: 'Dollar libérien' },
  { code: 'NG', name: 'Nigeria', phoneCode: '+234', currency: 'NGN', currencyName: 'Naira nigérian' },
  { code: 'SL', name: 'Sierra Leone', phoneCode: '+232', currency: 'SLE', currencyName: 'Leone sierra-léonais' },
  { code: 'LS', name: 'Lesotho', phoneCode: '+266', currency: 'LSL', currencyName: 'Loti lesothan' },
  { code: 'MW', name: 'Malawi', phoneCode: '+265', currency: 'MWK', currencyName: 'Kwacha malawite' },
  { code: 'MZ', name: 'Mozambique', phoneCode: '+258', currency: 'MZN', currencyName: 'Metical mozambicain' },
  { code: 'ZM', name: 'Zambie', phoneCode: '+260', currency: 'ZMW', currencyName: 'Kwacha zambien' },
  { code: 'ZW', name: 'Zimbabwe', phoneCode: '+263', currency: 'USD', currencyName: 'Dollar américain' },
  { code: 'ET', name: 'Éthiopie', phoneCode: '+251', currency: 'ETB', currencyName: 'Birr éthiopien' },
  { code: 'KE', name: 'Kenya', phoneCode: '+254', currency: 'KES', currencyName: 'Shilling kényan' },
  { code: 'RW', name: 'Rwanda', phoneCode: '+250', currency: 'RWF', currencyName: 'Franc rwandais' },
  { code: 'SS', name: 'Soudan du Sud', phoneCode: '+211', currency: 'SSP', currencyName: 'Livre sud-soudanaise' },
  { code: 'TZ', name: 'Tanzanie', phoneCode: '+255', currency: 'TZS', currencyName: 'Shilling tanzanien' },
  { code: 'UG', name: 'Ouganda', phoneCode: '+256', currency: 'UGX', currencyName: 'Shilling ougandais' },
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
