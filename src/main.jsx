import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { BRAND } from './lib/brand'
import { aplicarColor } from './hooks/useConfig'

aplicarColor(BRAND.color)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
// Wed Sep  9 19:30:55 UTC 2026
