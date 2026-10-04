-- ============================================================
-- Equipo que comparte clientes (opcional por centro)
-- ============================================================
-- Si centros.comparte_clientes = true, todos los miembros activos del centro
-- (y su owner) ven y gestionan los clientes de cualquiera de ellos.
-- Por defecto es false: sin activarlo, mi_equipo() devuelve solo al propio
-- usuario y las políticas nuevas equivalen exactamente a las que ya existen
-- (auth.uid() = entrenador_id). Las políticas se AÑADEN, no se sustituyen.
-- ============================================================

alter table public.centros
  add column if not exists comparte_clientes boolean not null default false;

-- Ids de entrenador cuyos datos puede ver `uid`: él mismo y, si su centro
-- comparte clientes, el owner y los miembros activos de ese centro.
create or replace function public.equipo_de(uid uuid)
returns setof uuid
language sql stable security definer
set search_path = public
as $$
  select uid
  union
  select m.user_id
  from public.centros c
  join public.miembros_centro m on m.centro_id = c.id and m.activo
  where c.comparte_clientes
    and (c.owner_id = uid
         or exists (select 1 from public.miembros_centro yo
                    where yo.centro_id = c.id and yo.user_id = uid and yo.activo))
  union
  select c.owner_id
  from public.centros c
  where c.comparte_clientes
    and exists (select 1 from public.miembros_centro yo
                where yo.centro_id = c.id and yo.user_id = uid and yo.activo)
$$;

-- El equipo del usuario autenticado (para RLS y para el frontend).
create or replace function public.mi_equipo()
returns setof uuid
language sql stable security definer
set search_path = public
as $$ select public.equipo_de(auth.uid()) $$;

-- Para edge functions (service role): ¿puede `a` gestionar los clientes de `b`?
create or replace function public.es_mismo_equipo(a uuid, b uuid)
returns boolean
language sql stable security definer
set search_path = public
as $$ select b in (select public.equipo_de(a)) $$;

-- equipo_de y es_mismo_equipo aceptan un uid arbitrario: solo el servidor.
revoke all on function public.equipo_de(uuid) from public, anon, authenticated;
revoke all on function public.es_mismo_equipo(uuid, uuid) from public, anon, authenticated;
grant execute on function public.equipo_de(uuid) to service_role;
grant execute on function public.es_mismo_equipo(uuid, uuid) to service_role;
revoke all on function public.mi_equipo() from public, anon;
grant execute on function public.mi_equipo() to authenticated;

-- Política de equipo en cada tabla con entrenador_id, salvo la configuración
-- personal de cada entrenador. Permisiva: se suma (OR) a las existentes.
do $$
declare t text;
begin
  for t in
    select c.table_name
    from information_schema.columns c
    join information_schema.tables tb
      on tb.table_schema = c.table_schema and tb.table_name = c.table_name
    where c.table_schema = 'public'
      and c.column_name = 'entrenador_id'
      and tb.table_type = 'BASE TABLE'
      and c.table_name not in ('configuracion', 'checkin_config')
  loop
    execute format('drop policy if exists equipo_comparte on public.%I', t);
    execute format(
      'create policy equipo_comparte on public.%I for all to authenticated '
      'using (entrenador_id in (select public.mi_equipo())) '
      'with check (entrenador_id in (select public.mi_equipo()))', t);
  end loop;
end $$;
