import type { Config } from 'tailwindcss'
const config: Config = { content:['./src/**/*.{ts,tsx}'], theme:{extend:{fontFamily:{sans:['var(--font-oswald)','sans-serif'],display:['var(--font-bebas)','sans-serif']},colors:{tera:{500:'#e54d75',600:'#D42E5B',700:'#b31d45',800:'#951b3d'}}}}, plugins:[] }
export default config
