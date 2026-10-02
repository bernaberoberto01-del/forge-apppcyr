---
name: informe-progreso
description: Genera el informe mensual de un cliente online de Forge (resumen de adherencia, evolución de métricas, ajustes del mes siguiente, mensaje motivacional para el cliente). Úsala cuando el usuario pida el "informe mensual", "resumen del mes" de un cliente, o mencione informe-progreso.
---

# Forge — Informe mensual de cliente online

## 1. Identificar al cliente
Si falta `cliente_id` o nombre exacto, pregúntalo.

## 2. Reunir datos reales del último mes (nunca inventar cifras)
```sql
select * from checkins where cliente_id = '<id>'
and fecha >= now() - interval '30 days' order by fecha desc;

select fecha, completada from sesiones where cliente_id = '<id>'
and fecha >= now() - interval '30 days';

select ejercicio, valor, fecha from marcas_cliente
where cliente_id = '<id>' order by fecha desc limit 8;

select nombre, notas_entrenador from rutinas
where cliente_id = '<id>' and estado = 'publicada'
order by created_at desc limit 1;
```

## 3. Calcular (escalas correctas — todo /5, nunca /10)
- `energia_media`, `fatiga_media`, `sueno_media`, `estres_media` = media de checkins del mes
- `adherencia_pct` = `round((sesiones_semana_media / sesiones_planificadas_media) * 100)`, tope 100
- `cambio_peso` = peso del check-in más reciente − peso del primero del mes
- Señales: fatiga media ≥4 y energía media ≤2 → posible sobrecarga; adherencia <50% → riesgo de abandono; cargas mayoritariamente "muy_facil"/"muy_duro" → ajuste de intensidad necesario

## 4. Formato de salida (exacto, en este orden)

```
## Resumen de adherencia
[nº sesiones completadas / planificadas, % adherencia, check-ins enviados/esperados — con cifras reales]

## Evolución de métricas
- Peso: [inicio] → [fin] kg ([+/-X] kg)
- Energía media: X/5 | Fatiga media: X/5 | Sueño medio: X/5 | Estrés medio: X/5
- Marcas destacadas: [ejercicio: peso, si hay progreso frente al mes anterior]

## Ajustes del mes siguiente
- [2-4 ajustes concretos y accionables: volumen, intensidad, frecuencia, nutrición si aplica]

## Mensaje para el cliente
[80-100 palabras, tono cercano y directo, en español natural. Reconoce un dato concreto del mes
(logro o esfuerzo), explica el ajuste de forma simple, termina con una frase motivadora. Nunca
mencionar escalas numéricas crudas en el mensaje al cliente — traducirlas a lenguaje natural.]
```

## 5. Al terminar
Pregunta si quiere guardar el informe en `analisis_mensual` y/o enviar el mensaje al cliente desde Seguimiento → IA. No lo envíes ni lo guardes sin confirmación.
