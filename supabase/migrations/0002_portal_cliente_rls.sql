-- ============================================================
-- FORGE — Migración 0002: cerrar último hueco + RLS del portal cliente
-- ============================================================
-- 1) Cierra sesion_ejercicios.sesion_ej_insert_anon (INSERT anónimo, CHECK true)
--    — se escapó de la migración 0001.
-- 2) Añade políticas para que el CLIENTE autenticado (auth_user_id) pueda
--    registrar entrenamientos y leer sus propios datos en el portal.
-- ============================================================

-- ── 1) Cerrar el último INSERT anónimo ─────────────────────
drop policy if exists sesion_ej_insert_anon on public.sesion_ejercicios;

-- ── 2) Políticas del cliente autenticado ───────────────────
-- helper: cliente_id in (select id from clientes where auth_user_id = auth.uid())

-- SESIONES: el cliente registra su entrenamiento
drop policy if exists sesiones_cliente_insert on public.sesiones;
create policy sesiones_cliente_insert on public.sesiones
  for insert to authenticated
  with check (cliente_id in (select id from public.clientes where auth_user_id = auth.uid()));

-- SESION_EJERCICIOS: leer e insertar las series de sus sesiones
drop policy if exists sesion_ej_cliente_select on public.sesion_ejercicios;
create policy sesion_ej_cliente_select on public.sesion_ejercicios
  for select to authenticated
  using (cliente_id in (select id from public.clientes where auth_user_id = auth.uid()));
drop policy if exists sesion_ej_cliente_insert on public.sesion_ejercicios;
create policy sesion_ej_cliente_insert on public.sesion_ejercicios
  for insert to authenticated
  with check (cliente_id in (select id from public.clientes where auth_user_id = auth.uid()));

-- PROGRESION_FUERZA: leer su propia progresión (para pesos recomendados)
drop policy if exists progresion_cliente_select on public.progresion_fuerza;
create policy progresion_cliente_select on public.progresion_fuerza
  for select to authenticated
  using (cliente_id in (select id from public.clientes where auth_user_id = auth.uid()));

-- CUESTIONARIOS: leer su propio cuestionario
drop policy if exists cuestionarios_cliente_select on public.cuestionarios;
create policy cuestionarios_cliente_select on public.cuestionarios
  for select to authenticated
  using (cliente_id in (select id from public.clientes where auth_user_id = auth.uid()));
