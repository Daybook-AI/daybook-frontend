/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      colors: {
        midnight: '#0F1115',
        charcoal: '#171A21',
        card: '#1D2129',
        border: '#2A2E37',
        warm: '#F4F1EA',
        muted: '#9A9DA5',
        amber: '#D9A441',
        lightAmber: '#F0C674',
      }
    }
  },
  plugins: [],
}

