/* eslint-env node */
const { join } = require('path');

module.exports = {
  darkMode: 'class',
  content: [
    join(__dirname, '../index.html'),
    join(__dirname, '../**/*.{html,ts}')
  ],
  safelist: [
    { pattern: /text-(emerald|rose)-500/, variants: ['dark'] },
    { pattern: /bg-primary-500\/10/, variants: ['dark'] }
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif']
      },
      boxShadow: {
        card: '0 10px 30px -10px rgba(15, 23, 42, 0.3)'
      }
    }
  },
  plugins: [require('@tailwindcss/forms')]
};
