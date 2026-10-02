---
name: planificacion-cliente
description: Genera la planificación mensual de un cliente presencial de Forge (objetivo del mes, semanas 1-4 con días y ejercicios, métricas a medir, notas de seguimiento). Úsala cuando el usuario pida "planificar" a un cliente, generar su plan del mes, o mencione planificacion-cliente.
---

# Forge — Planificación mensual de cliente presencial

## 1. Identificar al cliente
Si el usuario no da el `cliente_id` o nombre exacto, pregúntalo. Si da un nombre, búscalo:
```sql
select id, nombre, entrenador_id, nivel, objetivo, lesiones, dias_semana, material
from clientes where nombre ilike '%<nombre>%' and estado = 'activo';
```

## 2. Reunir contexto real (nunca inventar datos del cliente)
En paralelo:
```sql
-- Rutina publicada actual (si existe) — para no repetir ejercicios del mes anterior
select nombre, notas_entrenador, borrador, contenido
from rutinas where cliente_id = '<id>' and estado = 'publicada'
order by created_at desc limit 1;

-- Check-ins último mes (si el cliente presencial también hace check-in)
select * from checkins where cliente_id = '<id>'
and fecha >= now() - interval '30 days' order by fecha desc;

-- Marcas personales recientes (referencia de cargas)
select ejercicio, valor, fecha from marcas_cliente
where cliente_id = '<id>' order by fecha desc limit 10;

-- Sesiones completadas último mes (adherencia real)
select fecha, completada from sesiones
where cliente_id = '<id>' and fecha >= now() - interval '30 days';
```
Si no hay checkins ni sesiones previas, es normal en un cliente nuevo — no lo trates como error, simplemente parte del cuestionario/nivel declarado.

## 3. Reglas de variación (igual que generar-rutina / actualizar-rutina-mensual)
Nunca repitas el mismo bloque de ejercicios en días distintos. Distribuye por patrón según `dias_semana`:
- 3 días: empuje + pierna dominante rodilla / tirón + pierna dominante cadera / full body + core
- 4 días: Upper/Lower/Upper/Lower
- 5 días: Push/Pull/Legs/Upper/Lower

Respeta `lesiones` del cliente — nunca prescribas un ejercicio contraindicado (p. ej. sentadilla profunda con lesión de rodilla).

## 4. Formato de salida (exacto, en este orden)

```
## Objetivo del mes
[1-2 frases concretas, ligadas al objetivo del cliente y a su progreso real si lo hay]

## Semana 1
### Día 1 — [patrón]
- Ejercicio | series x reps | descanso | nota
...
### Día 2 — [patrón]
...

## Semana 2
[igual estructura — progresión ligera en carga/reps respecto a semana 1]

## Semana 3
[progresión respecto a semana 2]

## Semana 4
[semana de descarga o pico, según objetivo y fatiga acumulada]

## Métricas a medir
- [lista de 3-5 métricas concretas: peso, medidas, marcas de ejercicios clave, etc.]

## Notas de seguimiento
- [qué vigilar: dolor, fatiga, adherencia — y cuándo ajustar antes de fin de mes]
```

## 5. Al terminar
Pregunta si quiere guardarlo como rutina en borrador:
```sql
insert into rutinas (cliente_id, entrenador_id, nombre, objetivo, semanas, dias_semana, borrador, notas_entrenador, estado)
values ('<id>', '<entrenador_id>', 'Rutina <mes> <año> — <cliente>', '<objetivo>', 4, <dias_semana>, '<json de días/ejercicios>', 'Notas de seguimiento: ...', 'borrador');
```
No lo guardes sin confirmación explícita del entrenador.
