---
name: forge-context
description: Contexto completo de Forge Studio OS. Úsala SIEMPRE al inicio de cualquier sesión de desarrollo, cuando el usuario mencione Forge, portal, clientes, rutinas, sesiones, check-in, nutrición, Supabase, Vercel, edge functions o cualquier parte del stack del proyecto. También cuando el usuario diga "seguimos", "continúa", "arrancamos" o "sesión".
---

# Forge Studio OS — Contexto de sesión

Lee el archivo CLAUDE.md en la raíz del repo primero. Contiene el esquema completo de BD, arquitectura y convenciones. Este skill complementa con el estado operativo actual.

## Carga rápida de contexto

Antes de cualquier cambio, ejecutar:
```bash
# Ver estado del repo
git log --oneline -5
# Ver qué bundle sirve Vercel ahora
curl -s "https://forge-studio-os.vercel.app/" | grep -o 'index-[^"]*\.js'
# Verificar build limpio
npm run build 2>&1 | tail -1
```

## Archivos que importan en cada sesión

| Archivo | Propósito |
|---|---|
| `src/pages/PortalForge.jsx` | Portal cliente activo — EL archivo |
| `src/App.jsx` | Router — importa PortalForge como PortalCliente |
| `src/pages/Dashboard.jsx` | Panel admin principal |
| `src/pages/Seguimiento.jsx` | Vista de seguimiento + sesiones |
| `supabase/functions/*/index.ts` | Edge functions |

## Reglas que no se negocian

1. `npm run build` antes de cualquier push — si falla, no push
2. `actividad_cliente` siempre en setTimeout 2s aislado
3. `planes_nutricion` siempre con `.in('estado', ['publicado','publicada'])`
4. Nunca `git push --force`
5. `.then(() => {}).catch(() => {})` en operaciones fire-and-forget

## Tests rápidos post-cambio

```bash
# Portal cliente (Beatriz)
npx playwright test tests/capturas-tabs.spec.ts

# Admin completo
npx playwright test tests/audit-forge.spec.ts

# Verificar bundle en producción
curl -s "https://forge-studio-os.vercel.app/" | grep -o 'index-[^"]*\.js'
```

## Supabase — conexión directa

```bash
# Ver estado de una tabla
curl -s "https://qdpqpbkppkhzcxpfypvf.supabase.co/rest/v1/TABLA?select=*&limit=3" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -H "Authorization: Bearer TOKEN_ADMIN"

# Ejecutar edge function manualmente
curl -s -X POST "https://qdpqpbkppkhzcxpfypvf.supabase.co/functions/v1/FUNCION" \
  -H "Content-Type: application/json"
```
