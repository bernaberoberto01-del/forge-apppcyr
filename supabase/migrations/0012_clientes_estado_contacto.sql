-- ============================================================
-- Estado 'contacto' en clientes
-- ============================================================
-- aceptarLead() (Dashboard.jsx) pasaba leads directamente a estado='activo'
-- antes de que pagaran, mezclándolos con clientes reales activos en todos los
-- filtros .eq('estado','activo') del resto de la app. Ahora pasan a 'contacto'
-- y stripe-webhook los sube a 'activo' solo cuando checkout.session.completed
-- confirma el pago.

ALTER TABLE "public"."clientes" DROP CONSTRAINT "clientes_estado_check";
ALTER TABLE "public"."clientes" ADD CONSTRAINT "clientes_estado_check"
  CHECK (("estado" = ANY (ARRAY['activo'::"text", 'pausado'::"text", 'baja'::"text", 'pendiente'::"text", 'rechazado'::"text", 'contacto'::"text"])));
