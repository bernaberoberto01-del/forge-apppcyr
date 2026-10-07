-- ============================================================
-- Áreas de cliente, modalidad de cobro, bonos e historial clínico
-- ============================================================
-- Funciones opcionales por centro: el frontend solo las muestra si la ficha del
-- centro las activa (servicios / funciones). En un centro que no las usa:
--   - clientes.areas queda en '{entrenamiento}' para todos (valor por defecto),
--   - las tablas nuevas quedan vacías,
--   - el trigger de sesiones no encuentra bonos ni modalidades y no hace nada.
-- Idempotente.
-- ============================================================

-- 1. Áreas del cliente: un cliente puede estar en varias.
alter table public.clientes
  add column if not exists areas text[] not null default '{entrenamiento}';
alter table public.clientes drop constraint if exists clientes_areas_check;
alter table public.clientes add constraint clientes_areas_check
  check (cardinality(areas) > 0 and areas <@ array['entrenamiento', 'fisioterapia', 'nutricion']);

-- Área a la que pertenece una sesión según su tipo.
create or replace function public.area_de_sesion(tipo text)
returns text language sql immutable
as $$ select case tipo when 'fisioterapia' then 'fisioterapia'
                       when 'nutricion'    then 'nutricion'
                       else 'entrenamiento' end $$;

-- 2. Modalidad de cobro por cliente y área.
--    tarifa: cuota mensual (precio = €/mes) · bono: paquete de sesiones · suelta: precio por sesión
create table if not exists public.modalidades_cobro (
  id uuid primary key default gen_random_uuid(),
  entrenador_id uuid not null,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  area text not null check (area in ('entrenamiento', 'fisioterapia', 'nutricion')),
  modalidad text not null check (modalidad in ('tarifa', 'bono', 'suelta')),
  precio numeric(8,2),
  created_at timestamptz default now(),
  unique (cliente_id, area)
);

-- 3. Bonos de sesiones.
create table if not exists public.bonos (
  id uuid primary key default gen_random_uuid(),
  entrenador_id uuid not null,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  area text not null check (area in ('entrenamiento', 'fisioterapia', 'nutricion')),
  sesiones_total integer not null check (sesiones_total > 0),
  precio numeric(8,2),
  fecha_compra date not null default current_date,
  caduca date,
  notas text,
  activo boolean not null default true,
  created_at timestamptz default now()
);
create index if not exists bonos_cliente_idx on public.bonos (cliente_id, area);

-- Cada sesión consumida de un bono (automática desde sesiones o manual).
create table if not exists public.bono_usos (
  id uuid primary key default gen_random_uuid(),
  entrenador_id uuid not null,
  bono_id uuid not null references public.bonos(id) on delete cascade,
  sesion_id uuid unique references public.sesiones(id) on delete cascade,
  fecha date not null default current_date,
  manual boolean not null default false,
  created_at timestamptz default now()
);
create index if not exists bono_usos_bono_idx on public.bono_usos (bono_id);

-- 4. Pagos ligados a una sesión suelta y a un área.
alter table public.pagos add column if not exists area text;
alter table public.pagos add column if not exists sesion_id uuid
  references public.sesiones(id) on delete set null;
create unique index if not exists pagos_sesion_idx on public.pagos (sesion_id) where sesion_id is not null;

-- 5. Historial clínico y observaciones.
create table if not exists public.historial_clinico (
  id uuid primary key default gen_random_uuid(),
  entrenador_id uuid not null,
  cliente_id uuid not null references public.clientes(id) on delete cascade,
  fecha date not null default current_date,
  tipo text not null default 'observacion' check (tipo in ('observacion', 'medico')),
  area text check (area in ('entrenamiento', 'fisioterapia', 'nutricion')),
  texto text not null check (length(trim(texto)) > 0),
  autor_id uuid default auth.uid(),
  autor_nombre text,
  created_at timestamptz default now()
);
create index if not exists historial_clinico_cliente_idx on public.historial_clinico (cliente_id, fecha desc);

-- 6. RLS: solo el equipo del entrenador (mi_equipo incluye al propio usuario).
--    Sin política para clientes del portal: no ven nada de esto.
do $$
declare t text;
begin
  foreach t in array array['modalidades_cobro', 'bonos', 'bono_usos', 'historial_clinico'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists equipo_comparte on public.%I', t);
    execute format(
      'create policy equipo_comparte on public.%I for all to authenticated '
      'using (entrenador_id in (select public.mi_equipo())) '
      'with check (entrenador_id in (select public.mi_equipo()))', t);
  end loop;
end $$;

-- 7. Cobro automático al completar una sesión.
--    Cuenta una sesión completada, no cancelada, ya ocurrida y de un tipo que se
--    cobra (las 'online' las registra el propio cliente y no consumen bono).
--    Primero intenta un bono del área con sesiones libres (el que caduca antes);
--    si no hay y la modalidad del área es 'suelta', crea un pago pendiente.
--    Si la sesión deja de contar, se deshace: se borra el uso del bono y el pago
--    si sigue pendiente (uno ya cobrado no se toca).
create or replace function public.sesion_cuenta_para_cobro(s public.sesiones)
returns boolean language sql stable
as $$ select coalesce(s.completada, false)
         and not coalesce(s.cancelada, false)
         and s.tipo in ('presencial', 'pareja_grupo', 'clase_grupal', 'fisioterapia', 'nutricion')
         and s.fecha <= (now() at time zone 'Europe/Madrid')::date $$;

create or replace function public.sesion_deshacer_cobro(sesion uuid)
returns void language sql security definer set search_path = public
as $$
  delete from public.bono_usos where sesion_id = sesion;
  delete from public.pagos where sesion_id = sesion and estado = 'pendiente';
$$;

create or replace function public.sesion_aplicar_cobro(s public.sesiones)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_area text := public.area_de_sesion(s.tipo);
  v_bono public.bonos;
  v_mod public.modalidades_cobro;
  v_cli public.clientes;
begin
  if exists (select 1 from public.bono_usos where sesion_id = s.id)
     or exists (select 1 from public.pagos where sesion_id = s.id) then
    return;
  end if;

  select b.* into v_bono
  from public.bonos b
  where b.cliente_id = s.cliente_id and b.area = v_area and b.activo
    and (b.caduca is null or b.caduca >= s.fecha)
    and (select count(*) from public.bono_usos u where u.bono_id = b.id) < b.sesiones_total
  order by b.caduca nulls last, b.fecha_compra, b.created_at
  limit 1
  for update;

  if found then
    insert into public.bono_usos (entrenador_id, bono_id, sesion_id, fecha)
    values (v_bono.entrenador_id, v_bono.id, s.id, s.fecha);
    return;
  end if;

  select * into v_mod from public.modalidades_cobro
  where cliente_id = s.cliente_id and area = v_area;
  if found and v_mod.modalidad = 'suelta' and coalesce(v_mod.precio, 0) > 0 then
    select * into v_cli from public.clientes where id = s.cliente_id;
    insert into public.pagos (entrenador_id, cliente_id, importe, concepto, fecha_pago, estado, area, sesion_id, centro_id)
    values (v_cli.entrenador_id, s.cliente_id, v_mod.precio,
            'Sesión suelta · ' || initcap(v_area) || ' ' || to_char(s.fecha, 'DD/MM'),
            s.fecha, 'pendiente', v_area, s.id, s.centro_id);
  end if;
end $$;

create or replace function public.sesiones_cobro_trigger()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if tg_op = 'DELETE' then
    perform public.sesion_deshacer_cobro(old.id);
    return old;
  end if;
  if tg_op = 'UPDATE' and public.sesion_cuenta_para_cobro(old)
     and (not public.sesion_cuenta_para_cobro(new)
          or old.cliente_id is distinct from new.cliente_id
          or public.area_de_sesion(old.tipo) <> public.area_de_sesion(new.tipo)) then
    perform public.sesion_deshacer_cobro(new.id);
  end if;
  if public.sesion_cuenta_para_cobro(new) then
    perform public.sesion_aplicar_cobro(new);
  end if;
  return new;
end $$;

drop trigger if exists sesiones_cobro on public.sesiones;
create trigger sesiones_cobro
  after insert or update of completada, cancelada, cliente_id, tipo, fecha on public.sesiones
  for each row execute function public.sesiones_cobro_trigger();

drop trigger if exists sesiones_cobro_borrar on public.sesiones;
create trigger sesiones_cobro_borrar
  before delete on public.sesiones
  for each row execute function public.sesiones_cobro_trigger();

-- Las funciones de cobro solo las usa el trigger.
revoke all on function public.sesion_deshacer_cobro(uuid) from public, anon, authenticated;
revoke all on function public.sesion_aplicar_cobro(public.sesiones) from public, anon, authenticated;
