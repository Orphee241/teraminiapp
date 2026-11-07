export const DEFAULT_BRAND_COLOR = '#D71920'

export const BRAND_PRESETS = [
  { label: 'Rouge Terainterface', color: DEFAULT_BRAND_COLOR },
  { label: 'Bleu', color: '#2563EB' },
  { label: 'Bleu pétrole', color: '#0891B2' },
  { label: 'Vert', color: '#16A34A' },
  { label: 'Violet', color: '#7C3AED' },
  { label: 'Orange', color: '#EA580C' },
  { label: 'Or', color: '#CA8A04' },
  { label: 'Anthracite', color: '#374151' },
] as const

export type BrandPalette = { primary: string; deep: string; pale: string; titleText: string; headerText: string }

function rgb(hex: string): [number, number, number] {
  const match = /^#([0-9a-fA-F]{6})$/.exec(hex)
  if (!match) throw new Error('brand_color_invalid')
  return [0, 2, 4].map(index => parseInt(match[1].slice(index, index + 2), 16)) as [number, number, number]
}

function mix(color: [number, number, number], target: [number, number, number], amount: number) {
  return color.map((channel, index) => Math.round(channel + (target[index] - channel) * amount)) as [number, number, number]
}

function hex(color: [number, number, number]) {
  return `#${color.map(channel => channel.toString(16).padStart(2, '0')).join('')}`.toUpperCase()
}

function luminance(color: [number, number, number]) {
  const [r, g, b] = color.map(channel => channel / 255).map(value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrastText(color: [number, number, number]) {
  const brightness = luminance(color)
  const whiteContrast = 1.05 / (brightness + 0.05)
  const darkContrast = (brightness + 0.05) / 0.05
  return darkContrast >= whiteContrast ? '#111111' : '#FFFFFF'
}

export function deriveBrandPalette(value: string): BrandPalette {
  const primary = rgb(value.trim().toUpperCase())
  let deep = mix(primary, [0, 0, 0], 0.2)
  while (1.05 / (luminance(deep) + 0.05) < 4.5) deep = mix(deep, [0, 0, 0], 0.1)
  const pale = mix(primary, [255, 255, 255], 0.94)
  return { primary: hex(primary), deep: hex(deep), pale: hex(pale), titleText: contrastText(primary), headerText: contrastText(deep) }
}
