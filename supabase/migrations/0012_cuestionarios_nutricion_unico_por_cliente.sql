-- ============================================================
-- Un cuestionario de nutrición por cliente (BUG-021 en Nutricion.jsx).
-- guardarCuest() usaba INSERT, creando una fila nueva cada vez que se
-- editaba el cuestionario de un cliente que ya lo tenía — las filas
-- antiguas quedaban huérfanas (nunca se borraban, solo se ignoraban
-- porque el resto del código siempre lee la más reciente por
-- created_at). Verificado antes de esta migración: cero duplicados
-- existentes en cliente_id, así que la restricción es segura.
-- ============================================================

alter table public.cuestionarios_nutricion
  add constraint cuestionarios_nutricion_cliente_id_key unique (cliente_id);
