-- Borrar una rutina (p. ej. un borrador "por revisar") fallaba si un análisis
-- mensual la referenciaba: la FK estaba en NO ACTION. Ahora el análisis se
-- conserva y pierde la referencia. (PR #5; en Forge se aplicó a mano.)
-- Idempotente.
alter table public.analisis_mensual
  drop constraint if exists analisis_mensual_rutina_generada_id_fkey;
alter table public.analisis_mensual
  add constraint analisis_mensual_rutina_generada_id_fkey
  foreign key (rutina_generada_id) references public.rutinas(id) on delete set null;
