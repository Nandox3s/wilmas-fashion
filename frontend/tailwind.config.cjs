module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        vino: '#5B0E2D',
        matte: '#0F0F0F',
        gold: '#D4AF37',
        'soft-gray': '#F5F5F7'
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Inter', 'ui-sans-serif', 'system-ui']
      },
      boxShadow: {
        soft: '0 6px 18px rgba(15,15,15,0.08)'
      }
    },
  },
  plugins: [],
}
