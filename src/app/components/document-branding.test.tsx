import { describe, expect, it } from 'vitest'
import { DEFAULT_BRAND_COLOR, BRAND_PRESETS, deriveBrandPalette } from '../../lib/document-branding'

describe('document brand color palette', () => {
  it('derives the legacy-compatible accents from the selected primary color', () => {
    expect(DEFAULT_BRAND_COLOR).toBe('#D71920')
    expect(deriveBrandPalette('#D71920')).toEqual({ primary: '#D71920', deep: '#AC141A', pale: '#FDF1F2', titleText: '#FFFFFF', headerText: '#FFFFFF' })
  })

  it('chooses readable text for light and dark custom colors', () => {
    expect(deriveBrandPalette('#FACC15').titleText).toBe('#111111')
    expect(deriveBrandPalette('#1D4ED8').headerText).toBe('#FFFFFF')
    expect(deriveBrandPalette('#FFFFFF').titleText).toBe('#111111')
  })

  it('offers a useful selection of ready-made palettes', () => {
    expect(BRAND_PRESETS.map(preset => preset.color)).toContain('#2563EB')
    expect(BRAND_PRESETS.length).toBeGreaterThanOrEqual(6)
  })

  it('rejects invalid color values instead of injecting arbitrary PDF data', () => {
    expect(() => deriveBrandPalette('url(javascript:alert(1))')).toThrow('brand_color_invalid')
  })
})
