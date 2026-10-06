-- Columna añadida directamente en producción de Forge para la cuenta demo del
-- entrenador (PortalForge la lee). Se versiona aquí para que otras instancias la
-- tengan; en Forge no hace nada porque ya existe.
alter table public.clientes add column if not exists is_demo boolean default false;
