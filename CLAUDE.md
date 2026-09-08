# Forge Studio OS — Contexto para Claude Code

## Estado del proyecto (actualizar al inicio de cada sesión)
- **Producción**: https://forge-studio-os.vercel.app (Vercel, plan Hobby)
- **Repo**: github.com/bernaberoberto01-del/forge-apppcyr (rama `main` → autodeploy)
- **Supabase**: qdpqpbkppkhzcxpfypvf
- **Portal cliente activo**: `src/pages/PortalForge.jsx` (importado en App.jsx como PortalCliente)
- **Archivos obsoletos (no borrar, son backups)**: PortalCliente.jsx, PortalCliente.backup.jsx, PortalClienteNuevo.jsx

---

## Stack

| Capa | Tecnología |
|---|---|
| Frontend | React 19 + Vite + Tailwind CSS |
| Auth + DB | Supabase (qdpqpbkppkhzcxpfypvf) |
| Edge Functions | Deno en supabase/functions/ |
| Deploy | Vercel — push a main = deploy automático |
| Automatizaciones | n8n (rbernabe.app.n8n.cloud) |
| IA | Anthropic Claude API (claude-sonnet-4-6) |
| Pagos | Stripe |

---

## Dos apps en un repo

**App Admin** → rutas /dashboard, /clientes, /rutinas, /seguimiento, /agenda, /pagos, /nutricion, /mensajes, /configuracion
- Para el entrenador (Roberto, uid: 0b908e25-f69f-472c-9972-87bc93d67e65)

**Portal Cliente** → ruta /portal
- Para los clientes. Archivo: src/pages/PortalForge.jsx
- Detecta al cliente por: `clientes WHERE auth_user_id = auth.uid()`

---

## Base de datos — Esquema de tablas principales

### clientes
```
id, entrenador_id, nombre, email, tipo (presencial|online), estado,
peso_actual, peso_objetivo, objetivo, auth_user_id,
plan_online (entrenamiento|nutricion|completo),
stripe_customer_id, stripe_subscription_id, plan_activo
```

### rutinas
```
id, entrenador_id, cliente_id, nombre, semanas,
contenido (jsonb), borrador (jsonb), estado
```
- estado='publicada' → visible al cliente
- Estructura: contenido.dias[] o borrador.dias[]
- Cada día: { nombre, ejercicios: [{ nombre, series, reps, peso, descanso, notas, patron }] }

### planes_nutricion
```
id, entrenador_id, cliente_id, nombre, calorias_dia,
proteinas_g (alias proteinas_dia), carbohidratos_g (alias carbos_dia), grasas_g,
contenido (jsonb), borrador (jsonb), estado
```
- IMPORTANTE: filtrar SIEMPRE con .in('estado', ['publicado','publicada']) — inconsistencia en datos históricos
- Estructura: contenido.comidas[] → { nombre, hora, calorias, alimentos: [] }

### sesiones
```
id, entrenador_id, cliente_id, fecha (date), hora (text HH:MM),
tipo (presencial|online|grupo), completada (bool), cancelada (bool),
rpe (1-10), fatiga_post (1-5), sensaciones, duracion_minutos,
ejercicios (jsonb), recurrente_id
```
- Autocomplete: cron cada hora marca como completadas las sesiones pasadas
- Valoración: aparece en portal para sesiones completadas sin RPE, últimos 14 días

### checkins
```
id, cliente_id, entrenador_id, fecha, peso,
energia (1-5), sueno (1-5), fatiga (1-10), estres (1-10), comentario
```

### sesion_ejercicios
```
id, sesion_id, cliente_id, ejercicio_nombre, patron, orden,
sets (jsonb: [{peso, reps, completada}]), notas
```

### mensajes_cliente
```
id, cliente_id, entrenador_id, contenido, tipo (cliente|entrenador|sistema),
leido, leido_entrenador
```

### configuracion
```
entrenador_id, nombre_entrenador, nombre_negocio, foto_url, color_acento (#FF5C00 default), slug
```

### Otras tablas activas
```
pagos, planes_cobro, marcas_cliente, medidas_cliente, fotos_progreso,
alertas, grupos, grupo_clientes, tarifas, ejercicios_biblioteca
```

---

## Edge Functions

| Función | Qué hace |
|---|---|
| portal-accion | Acciones desde portal cliente (mensajes, etc.) |
| generar-rutina | IA genera rutina desde cuestionario |
| generar-nutricion / generar-plan-nutricional | IA genera plan nutricional |
| bienvenida-cliente | Envía magic link de acceso al cliente |
| completar-sesiones-auto | Marca sesiones pasadas como completadas |
| checkin-semanal | Recordatorio de check-in (cron domingo 9h) |
| detectar-alertas | Sin check-in, pagos vencidos (cron diario 8h) |
| analizar-cliente-mensual | Análisis IA mensual (cron domingo 20h) |
| stripe-webhook | Eventos de Stripe |
| vincular-cliente | Vincula auth_user_id a cliente |

### Crons activos
```
checkin-semanal-domingo      0 9 * * 0
detectar-alertas-diario      0 8 * * *
analisis-mensual-domingo     0 20 * * 0
completar-sesiones-cada-hora 0 * * * *
resumen-mensual-dia1         0 8 1 * *
```

---

## Convenciones de código

### Supabase — reglas críticas
```js
// Helpers estándar en PortalForge.jsx
const qa = p => p.then(r => r.data || []).catch(() => [])   // arrays
const q1 = p => p.then(r => r.data?.[0] || r.data || null).catch(() => null)  // objeto único

// NUNCA .catch() solo — siempre .then(() => {}).catch(() => {})
supabase.from('tabla').insert({...}).then(() => {}).catch(() => {})

// actividad_cliente SIEMPRE en setTimeout aislado — nunca en Promise.all principal
setTimeout(() => supabase.from('actividad_cliente').insert({...}).then(() => {}).catch(() => {}), 2000)

// nutricion: SIEMPRE los dos estados
.in('estado', ['publicado', 'publicada'])
```

### Diseño — sistema visual
```
Fondo app:     #F7F6F3
Fondo tarjeta: white
Bordes:        border-black/5 (tarjetas), border-black/4 (divisores internos)
Texto main:    text-[#0A0A0A]
Texto secondary: text-[#9B9B9B]
Texto disabled:  text-[#C0C0C0]
Acento:        color del entrenador (config.color_acento) || '#FF5C00'

Tarjetas:      rounded-2xl (estándar), rounded-3xl (hero/bienvenida)
Botones:       active:scale-95 transition-all (feedback táctil)
Urgente:       animate-pulse + gradiente rojo
Gradiente sesión hoy: linear-gradient(135deg, ${color}, ${color}dd)
Gradiente verde:      linear-gradient(135deg, #10b981, #059669)
Gradiente rojo:       linear-gradient(135deg, #ef4444, #dc2626)

Bottom bar móvil: min-h-[56px], indicador línea arriba del tab activo con color
```

---

## Estructura PortalForge.jsx

```
PortalForge()
├── cargarTodo() — Promise.all de TODAS las queries al inicio
├── enviarCheckin(), guardarValoracion(), enviarMensaje()
├── Modales globales: modalCI, valorando
├── LoginPortal — login si no hay sesión
├── Sidebar desktop (md:flex) + Header móvil + Bottom bar
└── Tabs:
    ├── TabInicio — agenda semanal + accesos rápidos + gráfica + checks
    ├── TabRutina — días con ejercicios completos
    ├── TabNutricion — macros + comidas + notas
    ├── TabProgreso — subtabs: peso/medidas/marcas/fotos
    ├── TabMensajes — chat con scroll automático
    ├── TabPagos — historial de pagos
    └── TabAjustes — datos + objetivo + cambiar contraseña
```

### Agenda semanal (TabInicio) — diferenciada por tipo
- **Presencial**: sesiones programadas por el entrenador (tabla sesiones, lun-sáb semana actual)
- **Online**: sesiones registradas por el cliente esta semana (sesionesEstaSemana)

---

## Decisiones técnicas — no revertir

1. **Carga completa al inicio** — cargarTodo() hace Promise.all de todo. Alternativa lazy descartada: los tabs condicionales (rutina/nutrición) desaparecían si se cargaban después del primer render.

2. **actividad_cliente en setTimeout** — Esta tabla puede lanzar excepción que mata toda la carga si va en el flujo principal. Siempre aislada.

3. **planes_nutricion con dos estados** — Inconsistencia histórica en los datos. Siempre `.in('estado', ['publicado','publicada'])`.

4. **Nunca push --force** — Rompió la integración automática Vercel↔GitHub. Los deploys se crean en READY pero no se promueven a producción.

5. **PortalForge.jsx es EL portal** — App.jsx lo importa como PortalCliente. No renombrar el archivo.

---

## Lo que NO tocar

- `src/pages/PortalCliente.jsx` — backup v1
- `src/pages/PortalCliente.backup.jsx` — backup v2
- `src/pages/PortalClienteNuevo.jsx` — intento descartado
- `src/hooks/useOnboardingPortal.js` — export eliminado, no importar
- `supabase/migrations/` — no modificar sin consenso
- Nunca `git push --force`

---

## Flujo de trabajo óptimo

### Arranque de sesión
Pega este bloque y actualiza las dos líneas:
```
FORGE SESSION START
Portal: PortalForge.jsx en producción ✓
Último cambio: [describir]
Pendiente: [describir]
Stack: React+Vite+Tailwind / Supabase / Vercel / n8n
```

### Prompts acotados — ejemplos
```
# Bien: específico
"En TabInicio de PortalForge.jsx, después del bloque de check-in urgente,
añadir una tarjeta que muestre el número de sesiones completadas esta semana"

"En cargarTodo() de PortalForge.jsx, cambiar el limit de checkins de 24 a 52"

"En la edge function completar-sesiones-auto, añadir log de cuántas sesiones
se completaron por entrenador"

# Mal: vago
"Mejora el portal"
"Arregla los check-ins"
"Haz la app más rápida"
```

### Antes de cada push
```bash
npm run build                    # Obligatorio — si falla, no push
npx playwright test tests/capturas-tabs.spec.ts  # Verificar portal
curl -s "https://forge-studio-os.vercel.app/" | grep -o 'index-[^"]*\.js'  # Bundle activo
```

---

## Clientes de prueba
| Cliente | Email | Pass | Tipo |
|---|---|---|---|
| Samuel | samuberu@gmail.com | Forge2024! | Online |
| Beatriz | beatrizar79@gmail.com | Forge2024! | Online |
| Fran | frangutival@gmail.com | Forge2024! | Online |
| Amalio | aj1997gs@icloud.com | Forge2024! | Online |
| Juan | juanbernabemadrona@hotmail.com | Forge2024! | Online |
| Admin | bernaberoberto01@gmail.com | Roberto72 | Admin |
