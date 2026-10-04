#!/usr/bin/env node
// Arranca la app en local con la ficha de un centro (centros/<id>.json).
//   npm run centro forge
//   npm run centro centro-demo -- --port 5174
import fs from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'

const RAIZ = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const DIR_CENTROS = path.join(RAIZ, 'centros')
const disponibles = () => fs.readdirSync(DIR_CENTROS).filter(f => f.endsWith('.json')).map(f => f.slice(0, -5))

function salir(msg) {
  console.error(`\n✗ ${msg}\n\nFichas disponibles: ${disponibles().join(', ')}\n`)
  process.exit(1)
}

const args = process.argv.slice(2)
const id = args.find(a => !a.startsWith('--'))
const iPort = args.indexOf('--port')
const port = iPort >= 0 ? args[iPort + 1] : '5173'
if (!id) salir('Indica el centro: npm run centro <id>')

const fichero = path.join(DIR_CENTROS, `${id}.json`)
if (!fs.existsSync(fichero)) salir(`No existe la ficha centros/${id}.json`)

let ficha
try { ficha = JSON.parse(fs.readFileSync(fichero, 'utf8')) } catch (e) { salir(`centros/${id}.json no es JSON válido: ${e.message}`) }

// --- validación: mejor fallar aquí que ver la marca de Forge sin darse cuenta ---
const m = ficha.marca || {}
const errores = []
for (const k of ['nombre', 'eslogan', 'nombreCompleto', 'descripcion', 'color']) if (!m[k]) errores.push(`falta marca.${k}`)
if (m.color && !/^#[0-9A-Fa-f]{6}$/.test(m.color)) errores.push(`marca.color debe ser #RRGGBB (es "${m.color}")`)
for (const k of ['logo', 'icono']) {
  if (m[k] && m[k].startsWith('/') && !fs.existsSync(path.join(RAIZ, 'public', m[k]))) errores.push(`marca.${k}: no existe public${m[k]}`)
}
if (errores.length) salir(`Ficha centros/${id}.json incorrecta:\n  - ${errores.join('\n  - ')}`)

const env = {
  VITE_BRAND_NAME: m.nombre,
  VITE_BRAND_TAGLINE: m.eslogan,
  VITE_BRAND_FULLNAME: m.nombreCompleto,
  VITE_BRAND_DESCRIPTION: m.descripcion,
  VITE_BRAND_COLOR: m.color,
  VITE_BRAND_LOGO: m.logo || '',
  VITE_BRAND_ICON: m.icono || '',
}

// --- a qué base de datos se conecta: la de .env ---
const envLocal = fs.existsSync(path.join(RAIZ, '.env')) ? fs.readFileSync(path.join(RAIZ, '.env'), 'utf8') : ''
const refEnv = (envLocal.match(/^VITE_SUPABASE_URL=\s*["']?https:\/\/([a-z0-9]+)\.supabase\.co/m) || [])[1] || null
const refFicha = ficha.supabase?.proyecto || null

console.log(`\n  Centro:  ${m.nombreCompleto}  (centros/${id}.json)`)
console.log(`  Color:   ${m.color}`)
console.log(`  Logo:    ${m.logo || '(sin logo: se usa la "F")'}`)
console.log(`  URL:     http://localhost:${port}`)
if (!refFicha) {
  console.log(`\n  ⚠  Este centro no tiene base de datos propia todavía.`)
  console.log(`     Se conecta a la de .env (${refEnv || 'ninguna'}): verás los DATOS de ese proyecto con la MARCA de este centro.`)
} else if (refFicha !== refEnv) {
  console.log(`\n  ⚠  La ficha dice Supabase "${refFicha}" pero .env apunta a "${refEnv}". Se usa la de .env.`)
} else {
  console.log(`  Datos:   Supabase ${refFicha}`)
}
if (refEnv === 'qdpqpbkppkhzcxpfypvf') console.log(`\n  ⚠  Base de datos de PRODUCCIÓN de Forge: lo que guardes es real.`)
console.log('')

const vite = spawn('npx', ['vite', '--port', port, '--strictPort'], { cwd: RAIZ, stdio: 'inherit', env: { ...process.env, ...env } })
vite.on('exit', code => process.exit(code ?? 0))
