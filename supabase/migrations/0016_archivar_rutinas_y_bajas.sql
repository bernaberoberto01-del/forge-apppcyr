-- ============================================================
-- Rutinas antiguas archivadas y cuotas de clientes de baja
-- ============================================================
-- 1. Al publicar una rutina, las anteriores del mismo cliente (otras publicadas y
--    borradores más antiguos) pasan a 'archivada'. No se borra nada: se consultan
--    en el Historial de Rutinas. El portal ya solo lee la publicada más reciente.
-- 2. Al pasar un cliente a 'baja' o 'pausado', se desactiva su plan de cobro, así
--    deja de contar en pendientes, vencidos e ingresos previstos. Sus pagos
--    históricos se conservan. Al reactivarlo, la app ofrece reactivar el plan.
-- Va en un trigger para que se cumpla se cambie desde donde se cambie.
-- Idempotente.
-- ============================================================

create or replace function public.rutinas_archivar_anteriores()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.estado = 'publicada' and (tg_op = 'INSERT' or old.estado is distinct from 'publicada') then
    update public.rutinas
       set estado = 'archivada'
     where cliente_id = new.cliente_id
       and id <> new.id
       and (estado = 'publicada' or (estado = 'borrador' and created_at < new.created_at));
  end if;
  return new;
end $$;

drop trigger if exists rutinas_archivar_anteriores on public.rutinas;
create trigger rutinas_archivar_anteriores
  after insert or update of estado on public.rutinas
  for each row execute function public.rutinas_archivar_anteriores();

create or replace function public.clientes_baja_desactiva_planes()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.estado in ('baja', 'pausado') and old.estado is distinct from new.estado then
    update public.planes_cobro set activo = false where cliente_id = new.id and activo;
  end if;
  return new;
end $$;

drop trigger if exists clientes_baja_desactiva_planes on public.clientes;
create trigger clientes_baja_desactiva_planes
  after update of estado on public.clientes
  for each row execute function public.clientes_baja_desactiva_planes();

revoke all on function public.rutinas_archivar_anteriores() from public, anon, authenticated;
revoke all on function public.clientes_baja_desactiva_planes() from public, anon, authenticated;

-- Limpieza de lo ya acumulado: por cliente se queda la publicada más reciente;
-- el resto de publicadas y los borradores anteriores a ella se archivan.
with ultima as (
  select distinct on (cliente_id) cliente_id, id, created_at
  from public.rutinas where estado = 'publicada'
  order by cliente_id, created_at desc
)
update public.rutinas r
   set estado = 'archivada'
  from ultima u
 where r.cliente_id = u.cliente_id
   and r.id <> u.id
   and (r.estado = 'publicada' or (r.estado = 'borrador' and r.created_at < u.created_at));

-- Planes de cobro que siguen activos en clientes ya de baja o pausados.
update public.planes_cobro pc
   set activo = false
  from public.clientes c
 where c.id = pc.cliente_id and pc.activo and c.estado in ('baja', 'pausado');
