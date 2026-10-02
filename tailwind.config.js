export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        // Color de marca de la instancia/entrenador; lo fija aplicarColor() en useConfig.js
        acento: {
          DEFAULT: 'rgb(var(--acento-rgb) / <alpha-value>)',
          hover: 'var(--acento-hover)',
        },
        forge: {
          orange: 'rgb(var(--acento-rgb) / <alpha-value>)',
          dark: '#111111',
          bg: '#F5F5F0',
          text: '#0A0A0A',
          muted: '#6B6B6B',
        }
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
      boxShadow: {
        'card': '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 12px rgba(0,0,0,0.08)',
      }
    },
  },
  plugins: [],
}
