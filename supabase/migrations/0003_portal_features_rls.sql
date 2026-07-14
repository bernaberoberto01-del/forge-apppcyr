-- ============================================================
-- FORGE — Migración 0003: RLS para las features nuevas del portal
-- (mensajes bidireccionales, fotos de progreso, medidas corporales)
-- ============================================================
-- Añade las políticas de cliente autenticado que faltaban para que
-- las features nuevas funcionen con el RLS ya cerrado, y elimina un
-- hueco de subida anónima a Storage.
-- ============================================================

-- ── MEDIDAS_CLIENTE: el cliente lee e inserta sus medidas ──
alter table public.medidas_cliente enable row level security;
drop policy if exists medidas_cliente_select on public.medidas_cliente;
create policy medidas_cliente_select on public.medidas_cliente
  for select to authenticated
  using (cliente_id in (select id from public.clientes where auth_user_id = auth.uid()));
drop policy if exists medidas_cliente_insert on public.medidas_cliente;
create policy medidas_cliente_insert on public.medidas_cliente
  for insert to authenticated
  with check (cliente_id in (select id from public.clientes where auth_user_id = auth.uid()));

-- ── FOTOS_PROGRESO: el cliente inserta sus fotos (el SELECT ya existe) ──
drop policy if exists fotos_cliente_insert on public.fotos_progreso;
create policy fotos_cliente_insert on public.fotos_progreso
  for insert to authenticated
  with check (cliente_id in (select id from public.clientes where auth_user_id = auth.uid()));

-- ── STORAGE: cerrar subida anónima al bucket progress-photos ──
-- Existía 'progress_photos_public_insert' con CHECK (bucket_id='progress-photos')
-- sin requerir usuario -> cualquiera podía subir ficheros. Se elimina.
-- Queda 'photos_upload', que exige auth.uid() IS NOT NULL (cliente logueado).
drop policy if exists progress_photos_public_insert on storage.objects;
