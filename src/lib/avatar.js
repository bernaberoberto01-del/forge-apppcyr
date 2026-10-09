import { BRAND } from './brand'

// Iniciales para el círculo de avatar (hasta 2 letras, de las dos primeras palabras del nombre).
export const ini = n => (n || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

// Color por nombre — el primero es el acento de marca del centro, el resto fijo.
export const AVATAR_COLORS = [BRAND.color, '#6366f1', '#10b981', '#f59e0b', '#ec4899', '#0ea5e9', '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4']
export const avatarColor = nombre => AVATAR_COLORS[(nombre || '').charCodeAt(0) % AVATAR_COLORS.length]
