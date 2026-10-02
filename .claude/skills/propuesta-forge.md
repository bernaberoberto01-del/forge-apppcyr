---
name: propuesta-forge
description: Genera una propuesta comercial personalizada de Forge para un centro boutique interesado. Pregunta primero nombre del centro, nº de entrenadores, nº de clientes y problema principal a resolver. Úsala cuando el usuario pida una "propuesta comercial", "propuesta para un centro", o mencione propuesta-forge.
---

# Forge — Propuesta comercial para centro boutique

## 1. Preguntar SIEMPRE antes de generar nada
No generes la propuesta hasta tener estos 4 datos. Si el usuario no los dio todos en su mensaje, pregúntalos (puedes usar AskUserQuestion si faltan varios a la vez):
1. Nombre del centro
2. Número de entrenadores
3. Número de clientes (actuales o estimados)
4. Problema principal que quieren resolver (p. ej. seguimiento desorganizado, falta de retención, cobros manuales, falta de visibilidad del progreso del cliente, etc.)

## 2. Adaptar el enfoque al problema declarado
No generes una propuesta genérica — el problema principal debe ser el eje de la propuesta:
- Seguimiento/organización → enfatizar portal cliente, check-ins automáticos, rutinas con progresión IA
- Retención → enfatizar check-ins, alertas de fatiga/abandono, mensajería directa entrenador-cliente
- Cobros → enfatizar planes_cobro, Stripe, recordatorios automáticos de pago
- Visibilidad del progreso → enfatizar TabProgreso (peso/medidas/fotos/fuerza), informes mensuales con IA
- Escalar con varios entrenadores → enfatizar multi-entrenador/centros, roles, invitaciones de equipo

## 3. Formato de salida (exacto, en este orden)

```
# Propuesta Forge para [Nombre del centro]

## Situación actual
[2-3 frases que reflejan el problema principal declarado, en sus propios términos]

## Qué resuelve Forge
[3-5 puntos concretos, ligados directamente al problema — no un listado genérico de features]

## Cómo funcionaría con [nº entrenadores] entrenadores y [nº clientes] clientes
[1 párrafo de encaje práctico: tiempo de puesta en marcha, quién hace qué, qué ve cada entrenador]

## Próximos pasos
[2-3 pasos concretos para arrancar — demo, onboarding, periodo de prueba]
```

## 4. Al terminar
Ofrece publicarla como documento (Artifact) ya que es contenido pensado para compartir con el centro — no la generes solo en el chat si el usuario parece ir a enviarla. Nunca inventes precios ni condiciones comerciales que no estén ya definidas en el negocio de Roberto; si hace falta un precio y no se conoce, pregúntalo en vez de inventarlo.
