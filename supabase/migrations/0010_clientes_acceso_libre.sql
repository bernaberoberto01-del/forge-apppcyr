-- clientes.acceso_libre: exime de cobro sin pasar por Stripe (commit 30988cf).
-- En Forge la columna ya se creó a mano; esta migración la deja registrada
-- para el resto de centros. Idempotente.
alter table public.clientes
  add column if not exists acceso_libre boolean default false;
