# Edge functions desplegadas sin código en el repo

Detectado el 2026-09-21 en un diagnóstico de drift: estas 12 funciones están
**ACTIVE en producción** (proyecto `qdpqpbkppkhzcxpfypvf`) pero no tienen
carpeta correspondiente en `supabase/functions/`. Si se necesita tocar
cualquiera de ellas, primero descargar su código real con
`mcp__claude_ai_Supabase__get_edge_function` (o `supabase functions download`
una vez el CLI esté autenticado) antes de editar — no reescribirlas a ciegas.

Descripciones inferidas por nombre + punto de invocación en el frontend
(grep en `src/`), no por lectura completa del código de cada una.

| Función | Descripción | Invocada desde |
|---|---|---|
| `generar-evaluacion` | Genera una evaluación de progreso del cliente (inicial o numerada) con IA. | `Rutinas.jsx` (`generarEvaluacion`) |
| `notificar-mensaje` | Envía notificación (push/email) cuando el entrenador manda un mensaje al cliente. | `Mensajes.jsx`, `PortalEntrenador.jsx` |
| `clientes-entrenador` | Devuelve la lista de clientes del entrenador para el portal-entrenador. | `PortalEntrenador.jsx` |
| `gestionar-suscripcion` | Cancela/modifica una suscripción de cobro de un cliente. | `Pagos.jsx` |
| `stripe-portal-cliente` | Crea una sesión del Customer Portal de Stripe para que el cliente gestione su método de pago. | `PortalCliente.jsx`, `PortalCliente.backup.jsx`, `PortalClienteNuevo.jsx` |
| `procesar-plan-online` | Dispara la generación IA del plan (rutina/nutrición) al activar un cliente online con `plan_online` asignado. | `Clientes.jsx` |
| `analizar-diagnostico` | Analiza con IA el cuestionario de diagnóstico de un lead antes de convertirlo en cliente. | `RegistroCliente.jsx` |
| `analizar-checkin` | Análisis IA de un check-in individual (distinto del análisis mensual agregado). | `Seguimiento.jsx` |
| `datos-cuestionario` | Devuelve los datos de un cuestionario por `cliente_id`/`entrenador_id` vía query params (GET directo, no `functions.invoke`). | `NutricionCuestionario.jsx` |
| `portal-entrenador-datos` | Sin punto de invocación encontrado en `src/` — verificar si sigue en uso o es código muerto antes de tocar. | No encontrada |
| `resumen-semanal-cliente` | Sin punto de invocación encontrado en `src/` — probablemente ligada a un cron o email semanal no localizado. | No encontrada |
| `setup-stripe-productos` | Sin punto de invocación encontrado en `src/` — parece un script de configuración inicial de Stripe (crear Products/Prices), ejecutado manualmente una vez. | No encontrada |

**No se ha tocado ni redesplegado ninguna de estas 12 funciones.** Este
archivo es solo un recordatorio para no perderlas de vista.
