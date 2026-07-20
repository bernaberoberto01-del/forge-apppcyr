-- Tablas creadas por Roberto directamente en Supabase.
-- Esta migración documenta su esquema y políticas RLS para que queden
-- versionadas en el repositorio. Ejecutar solo si las tablas no existen aún.

-- ─── marcas_cliente ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.marcas_cliente (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id  uuid REFERENCES public.clientes(id) ON DELETE CASCADE,
  entrenador_id uuid REFERENCES auth.users(id),
  ejercicio   text NOT NULL,
  peso_kg     numeric,
  reps        integer,
  fecha       date NOT NULL DEFAULT CURRENT_DATE,
  notas       text,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE public.marcas_cliente ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS marcas_entrenador       ON public.marcas_cliente FOR ALL    USING (entrenador_id = auth.uid());
CREATE POLICY IF NOT EXISTS marcas_cliente_select   ON public.marcas_cliente FOR SELECT USING (cliente_id IN (SELECT id FROM public.clientes WHERE auth_user_id = auth.uid()));
CREATE POLICY IF NOT EXISTS marcas_cliente_insert   ON public.marcas_cliente FOR INSERT WITH CHECK (cliente_id IN (SELECT id FROM public.clientes WHERE auth_user_id = auth.uid()));

-- ─── medidas_cliente ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.medidas_cliente (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id  uuid REFERENCES public.clientes(id) ON DELETE CASCADE,
  entrenador_id uuid REFERENCES auth.users(id),
  fecha       date NOT NULL DEFAULT CURRENT_DATE,
  peso_kg     numeric,
  grasa_pct   numeric,
  musculo_kg  numeric,
  cintura_cm  numeric,
  cadera_cm   numeric,
  pecho_cm    numeric,
  notas       text,
  created_at  timestamptz DEFAULT now()
);
ALTER TABLE public.medidas_cliente ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS medidas_entrenador      ON public.medidas_cliente FOR ALL    USING (entrenador_id = auth.uid());
CREATE POLICY IF NOT EXISTS medidas_cliente_select  ON public.medidas_cliente FOR SELECT USING (cliente_id IN (SELECT id FROM public.clientes WHERE auth_user_id = auth.uid()));
CREATE POLICY IF NOT EXISTS medidas_cliente_insert  ON public.medidas_cliente FOR INSERT WITH CHECK (cliente_id IN (SELECT id FROM public.clientes WHERE auth_user_id = auth.uid()));

-- ─── sesion_ejercicios ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.sesion_ejercicios (
  id                uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  sesion_id         uuid REFERENCES public.sesiones(id) ON DELETE CASCADE,
  cliente_id        uuid REFERENCES public.clientes(id),
  entrenador_id     uuid REFERENCES auth.users(id),
  ejercicio_nombre  text NOT NULL,
  orden             integer,
  sets              jsonb,
  notas             text,
  created_at        timestamptz DEFAULT now()
);
ALTER TABLE public.sesion_ejercicios ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS sesion_ej_entrenador    ON public.sesion_ejercicios FOR ALL    USING (entrenador_id = auth.uid());
CREATE POLICY IF NOT EXISTS sesion_ej_cliente_select ON public.sesion_ejercicios FOR SELECT USING (cliente_id IN (SELECT id FROM public.clientes WHERE auth_user_id = auth.uid()));
CREATE POLICY IF NOT EXISTS sesion_ej_cliente_insert ON public.sesion_ejercicios FOR INSERT WITH CHECK (cliente_id IN (SELECT id FROM public.clientes WHERE auth_user_id = auth.uid()));
