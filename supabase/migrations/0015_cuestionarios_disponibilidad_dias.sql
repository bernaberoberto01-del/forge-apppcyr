-- ============================================================
-- Columna disponibilidad_dias en cuestionarios
-- ============================================================
-- BUG-093: el formulario de RegistroCliente.jsx tenía dos preguntas distintas
-- (Bloque 3 "días que entrenas ahora" y Bloque 5 "días disponibles para
-- entrenar") que se guardaban ambas bajo la columna dias_semana, perdiendo
-- siempre el valor del Bloque 3. Esta columna separa el dato del Bloque 5.

ALTER TABLE "public"."cuestionarios"
  ADD COLUMN IF NOT EXISTS "disponibilidad_dias" integer DEFAULT 3;
