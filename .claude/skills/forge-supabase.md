---
name: forge-supabase
description: Referencia de Supabase para Forge. Úsala cuando el usuario pregunte por tablas, queries, RLS, edge functions, crons, o cualquier cosa relacionada con la base de datos o backend de Forge.
---

# Forge — Supabase Reference

## Proyecto
- ID: qdpqpbkppkhzcxpfypvf
- URL: https://qdpqpbkppkhzcxpfypvf.supabase.co
- Admin UID: 0b908e25-f69f-472c-9972-87bc93d67e65

## Tablas activas (filas actuales)

| Tabla | Filas | Notas |
|---|---|---|
| clientes | 74 | tipo: presencial/online |
| sesiones | 632 | completada, rpe, fatiga_post |
| checkins | 321 | energia/sueno/fatiga/estres (1-5 o 1-10) |
| rutinas | 107 | contenido+borrador jsonb, estado='publicada' |
| planes_nutricion | 34 | estado='publicado' O 'publicada' — SIEMPRE .in() |
| pagos | 160 | estado: cobrado/pendiente |
| mensajes_cliente | 141 | tipo: cliente/entrenador/sistema |
| planes_cobro | 61 | activo, proximo_cobro |
| ejercicios_biblioteca | 162 | biblioteca compartida |
| sesion_ejercicios | 193 | sets jsonb: [{peso,reps,completada}] |
| marcas_cliente | 2 | PR automáticos al registrar sesión |
| medidas_cliente | 5 | circunferencias en cm |
| fotos_progreso | 25 | visible_cliente boolean |
| alertas | 187 | tipo: sin_checkin, pago_vencido, etc. |

## Relaciones clave

```
clientes.entrenador_id → auth.users.id (entrenador)
clientes.auth_user_id  → auth.users.id (cliente para portal)
rutinas.cliente_id     → clientes.id
sesiones.cliente_id    → clientes.id
sesion_ejercicios.sesion_id → sesiones.id
```

## RLS — políticas importantes

```sql
-- rutinas: entrenador ve todo, cliente solo SELECT
-- Política cliente: cliente_id IN (SELECT id FROM clientes WHERE auth_user_id = auth.uid())

-- planes_nutricion: igual que rutinas

-- actividad_cliente: tiene política pero puede fallar
-- SIEMPRE en setTimeout aislado, nunca en Promise.all principal

-- sesion_ejercicios: sin política clara — siempre con .catch(() => [])
```

## Queries frecuentes

```js
// Rutina publicada de un cliente
await supabase.from('rutinas')
  .select('id,nombre,semanas,contenido,borrador')
  .eq('cliente_id', cid)
  .eq('estado', 'publicada')
  .order('created_at', { ascending: false })
  .limit(1)

// Nutrición — SIEMPRE con ambos estados
await supabase.from('planes_nutricion')
  .select('*')
  .eq('cliente_id', cid)
  .in('estado', ['publicado', 'publicada'])
  .order('created_at', { ascending: false })
  .limit(1)

// Sesiones pendientes de valorar (últimos 14 días)
await supabase.from('sesiones')
  .select('*')
  .eq('cliente_id', cid)
  .eq('completada', true)
  .eq('cancelada', false)
  .is('rpe', null)
  .gte('fecha', hace(14))  // función: new Date(Date.now()-days*864e5).toISOString().split('T')[0]
  .order('fecha', { ascending: false })
  .limit(3)
```

## Edge Functions — deploy

```bash
# Desde la raíz del repo con MCP de Supabase conectado
# O via API directa:
curl -s -X POST "https://qdpqpbkppkhzcxpfypvf.supabase.co/functions/v1/FUNCION" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Crons activos

```
checkin-semanal-domingo      0 9 * * 0   → checkin-semanal
detectar-alertas-diario      0 8 * * *   → detectar-alertas
analisis-mensual-domingo     0 20 * * 0  → analizar-cliente-mensual
completar-sesiones-cada-hora 0 * * * *   → completar-sesiones-auto
resumen-mensual-dia1         0 8 1 * *   → resumen-mensual
```

## Estructura jsonb de rutinas

```json
{
  "dias": [
    {
      "nombre": "Día 1 - Empuje",
      "ejercicios": [
        {
          "nombre": "Press banca",
          "patron": "empuje",
          "series": "4",
          "reps": "8-10",
          "peso": "70kg",
          "descanso": "90s",
          "notas": "Técnica perfecta"
        }
      ]
    }
  ]
}
```

## Estructura jsonb de planes_nutricion

```json
{
  "comidas": [
    {
      "nombre": "Desayuno",
      "hora": "08:00",
      "calorias": 500,
      "alimentos": [
        { "nombre": "Avena", "cantidad": "80g" },
        { "nombre": "Leche", "cantidad": "200ml" }
      ],
      "notas": "Opcional: añadir canela"
    }
  ],
  "notas": "Notas generales del entrenador"
}
```
