# Forge Studio OS

App de gestión para entrenadores personales.

## Stack
- React + Vite + Tailwind CSS
- Supabase (auth + base de datos)
- Vercel (deploy)

## Setup

1. Clona el repositorio
2. `npm install`
3. Crea `.env.local` con:
   ```
   VITE_SUPABASE_URL=https://qdpqpbkppkhzcxpfypvf.supabase.co
   VITE_SUPABASE_ANON_KEY=tu-anon-key
   ```
4. `npm run dev`

## Deploy en Vercel

1. Conecta el repositorio en vercel.com
2. Añade las variables de entorno en el panel de Vercel
3. Deploy automático en cada push

## Crear usuario administrador

En Supabase → Authentication → Users → Add user
