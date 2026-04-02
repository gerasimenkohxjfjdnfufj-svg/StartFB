/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'brand-green': '#2EC67A',
        'brand-red':   '#F04E37',
        'brand-blue':  '#2D7CF6',
        'bg':          '#0F1217',
        'bg2':         '#171C26',
        'bg3':         '#1E2535',
      }
    }
  },
  plugins: [],
}
