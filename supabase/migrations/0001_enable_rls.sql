-- ============================================================
-- FORGE — Migración de seguridad: eliminar políticas RLS abiertas
-- ============================================================
-- Diagnóstico real: el RLS YA estaba activado, pero existían políticas
-- permisivas concedidas al rol `public` (incluye anon) con USING true /
-- WITH CHECK true, que abrían lectura/escritura anónima de toda la BD.
-- Además sesiones.entrenador_sesiones tenía "OR auth.uid() IS NULL"
-- (acceso total anónimo a sesiones).
--
-- Esta migración:
--   1) ELIMINA todas las políticas abiertas (portal/publico/anon).
--   2) Corrige entrenador_sesiones quitando la cláusula anónima.
--   3) Añade políticas limpias, SOLO para el rol `authenticated`, para que
--      el portal del cliente funcione tras iniciar sesión (auth_user_id).
--
-- Las políticas de entrenador existentes (auth.uid() = entrenador_id) se
-- mantienen: son correctas.
-- ============================================================

-- ── 1) ELIMINAR POLÍTICAS ABIERTAS ─────────────────────────
drop policy if exists alertas_cliente_insert            on public.alertas;
drop policy if exists checkin_config_public             on public.checkin_config;
drop policy if exists checkin_publico_insert            on public.checkins;
drop policy if exists checkins_portal_select            on public.checkins;
drop policy if exists clientes_portal_select            on public.clientes;
drop policy if exists configuracion_portal_select       on public.configuracion;
drop policy if exists cuestionario_publico_insert       on public.cuestionarios;
drop policy if exists cuestionario_publico_select       on public.cuestionarios;
drop policy if exists cuest_nutricion_publico           on public.cuestionarios_nutricion;
drop policy if exists cuest_nutricion_publico_select    on public.cuestionarios_nutricion;
drop policy if exists biblioteca_portal_select          on public.ejercicios_biblioteca;
drop policy if exists fotos_cliente_select              on public.fotos_progreso;
drop policy if exists fotos_insert_anon                 on public.fotos_progreso;
drop policy if exists invitaciones_select               on public.invitaciones_centro;
drop policy if exists invitaciones_update               on public.invitaciones_centro;
drop policy if exists medidas_insert_anon               on public.medidas_cliente;
drop policy if exists medidas_select_portal             on public.medidas_cliente;
drop policy if exists mensajes_cliente_insert           on public.mensajes_cliente;
drop policy if exists mensajes_publico_update           on public.mensajes_cliente;
drop policy if exists mensajes_publicos_select          on public.mensajes_cliente;
drop policy if exists pagos_portal_select               on public.pagos;
drop policy if exists planes_nutricion_select           on public.planes_nutricion;
drop policy if exists pf_publico_insert                 on public.progresion_fuerza;
drop policy if exists pf_publico_select                 on public.progresion_fuerza;
drop policy if exists progresion_publico_insert         on public.progresion_fuerza;
drop policy if exists progresion_publico_select         on public.progresion_fuerza;
drop policy if exists rutinas_publicas_select           on public.rutinas;
drop policy if exists sesiones_portal_select            on public.sesiones;
drop policy if exists sesiones_publico_insert           on public.sesiones;

-- ── 2) CORREGIR sesiones (quitar acceso anónimo total) ─────
drop policy if exists entrenador_sesiones on public.sesiones;
create policy entrenador_sesiones on public.sesiones
  for all to authenticated
  using (auth.uid() = entrenador_id)
  with check (auth.uid() = entrenador_id);

-- ── 3) POLÍTICAS LIMPIAS PARA EL PORTAL (cliente con login) ─
-- Solo rol authenticated; el cliente ve/inserta SUS datos vía auth_user_id.

-- clientes: el cliente lee su propia ficha
drop policy if exists clientes_self_select on public.clientes;
create policy clientes_self_select on public.clientes
  for select to authenticated
  using (auth_user_id = auth.uid());

-- configuracion: el cliente lee la config de su entrenador
drop policy if exists configuracion_cliente_select on public.configuracion;
create policy configuracion_cliente_select on public.configuracion
  for select to authenticated
  using (exists (select 1 from public.clientes c
                 where c.auth_user_id = auth.uid()
                   and c.entrenador_id = configuracion.entrenador_id));

-- ejercicios_biblioteca: el cliente lee la biblioteca de su entrenador
drop policy if exists ejbib_cliente_select on public.ejercicios_biblioteca;
create policy ejbib_cliente_select on public.ejercicios_biblioteca
  for select to authenticated
  using (exists (select 1 from public.clientes c
                 where c.auth_user_id = auth.uid()
                   and c.entrenador_id = ejercicios_biblioteca.entrenador_id));

-- helper repetido: cliente_id pertenece al usuario logueado
--   cliente_id in (select id from clientes where auth_user_id = auth.uid())

-- checkins: leer e insertar los propios
drop policy if exists checkins_cliente_select on public.checkins;
create policy checkins_cliente_select on public.checkins
  for select to authenticated
  using (cliente_id in (select id from public.clientes where auth_user_id = auth.uid()));
drop policy if exists checkins_cliente_insert on public.checkins;
create policy checkins_cliente_insert on public.checkins
  for insert to authenticated
  with check (cliente_id in (select id from public.clientes where auth_user_id = auth.uid()));

-- pagos: leer los propios
drop policy if exists pagos_cliente_select on public.pagos;
create policy pagos_cliente_select on public.pagos
  for select to authenticated
  using (cliente_id in (select id from public.clientes where auth_user_id = auth.uid()));

-- rutinas: leer las propias
drop policy if exists rutinas_cliente_select on public.rutinas;
create policy rutinas_cliente_select on public.rutinas
  for select to authenticated
  using (cliente_id in (select id from public.clientes where auth_user_id = auth.uid()));

-- planes_nutricion: leer los propios
drop policy if exists planes_cliente_select on public.planes_nutricion;
create policy planes_cliente_select on public.planes_nutricion
  for select to authenticated
  using (cliente_id in (select id from public.clientes where auth_user_id = auth.uid()));

-- sesiones: leer las propias
drop policy if exists sesiones_cliente_select on public.sesiones;
create policy sesiones_cliente_select on public.sesiones
  for select to authenticated
  using (cliente_id in (select id from public.clientes where auth_user_id = auth.uid()));

-- cuestionarios_nutricion: leer los propios
drop policy if exists cuestn_cliente_select on public.cuestionarios_nutricion;
create policy cuestn_cliente_select on public.cuestionarios_nutricion
  for select to authenticated
  using (cliente_id in (select id from public.clientes where auth_user_id = auth.uid()));

-- fotos_progreso: leer las visibles propias
drop policy if exists fotos_cliente_select on public.fotos_progreso;
create policy fotos_cliente_select on public.fotos_progreso
  for select to authenticated
  using (visible_cliente = true
         and cliente_id in (select id from public.clientes where auth_user_id = auth.uid()));

-- mensajes_cliente: leer, insertar y marcar leído los propios
drop policy if exists mensajes_cli_select on public.mensajes_cliente;
create policy mensajes_cli_select on public.mensajes_cliente
  for select to authenticated
  using (cliente_id in (select id from public.clientes where auth_user_id = auth.uid()));
drop policy if exists mensajes_cli_insert on public.mensajes_cliente;
create policy mensajes_cli_insert on public.mensajes_cliente
  for insert to authenticated
  with check (cliente_id in (select id from public.clientes where auth_user_id = auth.uid()));
drop policy if exists mensajes_cli_update on public.mensajes_cliente;
create policy mensajes_cli_update on public.mensajes_cliente
  for update to authenticated
  using (cliente_id in (select id from public.clientes where auth_user_id = auth.uid()))
  with check (cliente_id in (select id from public.clientes where auth_user_id = auth.uid()));
