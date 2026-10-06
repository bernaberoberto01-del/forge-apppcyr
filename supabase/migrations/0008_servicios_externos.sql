-- Sesiones de fisioterapia y nutrición con cliente escrito a mano en la Agenda.
-- Solo AMPLÍA los valores permitidos: todas las filas existentes siguen siendo válidas.
--   clientes.estado  + 'externo'      (cliente creado solo para esa cita; no sale en listas ni cifras)
--   sesiones.tipo    + 'fisioterapia', 'nutricion'
alter table public.clientes drop constraint if exists clientes_estado_check;
alter table public.clientes add constraint clientes_estado_check
  check (estado = any (array['activo', 'pausado', 'baja', 'pendiente', 'rechazado', 'externo']));

alter table public.sesiones drop constraint if exists sesiones_tipo_check;
alter table public.sesiones add constraint sesiones_tipo_check
  check (tipo = any (array['presencial', 'pareja_grupo', 'clase_grupal', 'online', 'fisioterapia', 'nutricion']));
