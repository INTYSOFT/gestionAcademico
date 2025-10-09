const defaultTheme = require('tailwindcss/defaultTheme');

module.exports = {
  darkMode: 'class',
  content: [
    './src/index.html',
    './src/**/*.html',
    './src/**/*.ts',
    './src/**/*.scss'
  ],
  safelist: [
    {
      pattern: /^(bg|text|border)-(primary|secondary|accent|warn)-(50|100|200|300|400|500|600|700)$/,
      variants: ['hover', 'focus', 'dark']
    }
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Roboto', ...defaultTheme.fontFamily.sans]
      },
      colors: {
        primary: {
          50: '#e8eaf6',
          100: '#c5cae9',
          200: '#9fa8da',
          300: '#7985cb',
          400: '#5c6bc0',
          500: '#3f51b5',
          600: '#394aae',
          700: '#3140a4',
          800: '#2a379b',
          900: '#1c278b',
          DEFAULT: '#3f51b5',
          foreground: '#ffffff'
        },
        secondary: {
          DEFAULT: '#7c4dff',
          foreground: '#ffffff'
        }
      }
    }
  },
  plugins: []
};
