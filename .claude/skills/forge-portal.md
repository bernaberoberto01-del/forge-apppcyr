---
name: forge-portal
description: Guía específica para trabajar en el portal cliente de Forge (PortalForge.jsx). Úsala cuando el usuario quiera modificar el portal del cliente, tabs del portal, inicio del cliente, rutina del cliente, nutrición del cliente, progreso, mensajes, check-in, valoración de sesión, agenda semanal, o cualquier parte de la experiencia del cliente final.
---

# Forge Portal Cliente — Guía de trabajo

## Archivo: src/pages/PortalForge.jsx

### Estructura de componentes (con líneas aproximadas)

```
PortalForge()                    L1-512
├── cargarTodo()                 L55-90   — Promise.all de TODO al inicio
├── enviarCheckin()              L92-107  — Guarda en tabla checkins
├── guardarValoracion()          L109-118 — Actualiza sesiones.rpe + fatiga_post
├── enviarMensaje()              L120-131 — Via edge function portal-accion
├── LoginPortal                  L190-250 — Pantalla de login
└── Render principal             L251-512
    ├── Sidebar desktop
    ├── Header móvil
    ├── Bottom bar (5 tabs)
    └── Modales: modalCI, valorando

TabInicio()                      L513-750
TabRutina()                      L752-820
TabNutricion()                   L822-900
TabProgreso()                    L902-960
├── SubPeso()
├── SubMedidas()
├── SubMarcas()
└── SubFotos()
TabMensajes()                    L1030-1075
TabPagos()                       L1077-1100
TabAjustes()                     L1102-1151
```

### Datos disponibles en cada Tab

Todos los datos se cargan en `cargarTodo()` y se pasan como props:

```js
const { rutina, nutricion, checkins, sesiones, sesionesHoy, pendientes,
        mensajes, pagos, marcas, medidas, fotos, cuest, sesionesEstaSemana } = datos
```

### Cómo añadir un campo nuevo al cargarTodo

```js
// En el Promise.all de cargarTodo(), añadir la query
const [..., nuevosDatos] = await Promise.all([
  // ... queries existentes
  qa(supabase.from('nueva_tabla').select('*').eq('cliente_id', cid)),
])
// Añadir al setDatos
setDatos({ ...existentes, nuevosDatos })
// Añadir al destructuring en el render
const { ..., nuevosDatos } = datos
// Pasar como prop al Tab correspondiente
<TabInicio ... nuevosDatos={nuevosDatos} />
```

### Agenda semanal — lógica diferenciada

```js
// Presencial: sesiones programadas por entrenador
sesionsDia = (sesiones || []).filter(s => s.fecha === fechaStr)

// Online: sesiones registradas por el cliente esta semana
sesionsDia = (sesionesEstaSemana || []).filter(s => s.fecha === fechaStr)
```

### Colores dinámicos del entrenador

```js
const color = config?.color_acento || '#FF5C00'
// Usar siempre `color` en lugar de hardcodear naranja
// Para gradientes: `linear-gradient(135deg, ${color}, ${color}dd)`
```

### Añadir un nuevo modal global

1. Declarar estado: `const [modalX, setModalX] = useState(false)`
2. Añadir JSX del modal al final del render principal (antes del cierre `</main>`)
3. Pasar `setModalX` como prop al Tab que lo necesita
4. En el Tab, llamar `setModalX(true)` en el onClick

### Test rápido visual

```bash
npx playwright test tests/capturas-tabs.spec.ts
# Ver resultados en /tmp/tab*.png
```
