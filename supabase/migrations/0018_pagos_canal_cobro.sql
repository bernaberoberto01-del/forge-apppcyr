-- M1 F2: Canal de cobro en cada pago
-- Permite registrar si el cobro fue por Stripe, Datáfono, Efectivo o Transferencia
-- Aplicar también en Pablo Rodríguez (focgysujvofpihjhvznl)

ALTER TABLE pagos
  ADD COLUMN IF NOT EXISTS canal_cobro text;

COMMENT ON COLUMN pagos.canal_cobro IS 'Canal de cobro: Stripe | Datáfono | Efectivo | Transferencia';

-- Stripe es el default histórico para pagos online ya existentes (los que tienen stripe_subscription_id en clientes)
-- No hacemos UPDATE masivo para no asumir: se rellenan cuando el entrenador edita o registra pagos nuevos
