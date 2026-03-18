/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: '#5B6BF5',
        'primary-end': '#9B59F5',
        surface: '#F5F5F7',
        'text-primary': '#1A1A2E',
        'text-secondary': '#8A8A9A',
        success: '#22C55E',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'sans-serif'],
      },
      borderRadius: {
        '2xl': '20px',
        '3xl': '24px',
        '4xl': '32px',
      },
      boxShadow: {
        card: '0 4px 20px rgba(0,0,0,0.08)',
        bottom: '0 -2px 16px rgba(0,0,0,0.07)',
      },
    },
  },
  plugins: [],
}
