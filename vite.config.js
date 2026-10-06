import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

// Rellena la marca de index.html (título, favicon, color del navegador) con las
// variables VITE_BRAND_* de la instancia. Por defecto, los valores de Forge.
function brandHtml(env) {
  const escape = s => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
  const color = /^#[0-9A-Fa-f]{6}$/.test(env.VITE_BRAND_COLOR || '') ? env.VITE_BRAND_COLOR : '#FF5C00'
  const icon = env.VITE_BRAND_ICON || '/favicon.svg'
  const vals = {
    BRAND_NAME: env.VITE_BRAND_NAME || 'Forge',
    BRAND_DESCRIPTION: env.VITE_BRAND_DESCRIPTION || 'Forge — Gestión inteligente para entrenadores personales',
    BRAND_COLOR: color,
    BRAND_ICON: icon,
    BRAND_ICON_TYPE: icon.endsWith('.svg') ? 'image/svg+xml' : icon.endsWith('.ico') ? 'image/x-icon' : 'image/png',
  }
  return {
    name: 'brand-html',
    transformIndexHtml: html => html.replace(/%(BRAND_[A-Z_]+)%/g, (m, k) => (k in vals ? escape(vals[k]) : m)),
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    plugins: [react(), brandHtml(env)],
    server: {
      port: Number(process.env.PORT) || 5173,
    },
  }
})
