import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'bg-main': 'var(--bg-main)',
        'fg-main': 'var(--fg-main)',
        'accent-blue': 'var(--accent-blue)',
        'accent-pink': 'var(--accent-pink)',
        'accent-gray': 'var(--accent-gray)',
      },
      fontFamily: {
        sans: ['"eurostile"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
export default config

