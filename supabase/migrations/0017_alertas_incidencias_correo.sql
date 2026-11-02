-- ============================================================
-- Tipos de alerta para los fallos de envío de correo
-- ============================================================
-- checkin-semanal avisa en el panel cuando no puede enviar los recordatorios.
-- Sin estos tipos la restricción rechaza la alerta y el fallo pasa desapercibido.
-- Idempotente.
-- ============================================================

alter table public.alertas drop constraint if exists alertas_tipo_check;
alter table public.alertas add constraint alertas_tipo_check check (tipo = any (array[
  'fatiga_alta', 'abandono', 'pago_vencido', 'rutina_lista', 'resumen_listo',
  'cancelacion_sesion', 'sin_checkin', 'mensaje_nuevo', 'nuevo_cuestionario', 'error_ia',
  'pago_recibido', 'pago_fallido', 'suscripcion_cancelada', 'cuestionario_pendiente',
  'error_smtp_config', 'error_smtp_cliente'
]));
