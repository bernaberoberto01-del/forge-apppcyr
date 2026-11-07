-- M9 F3 — Branding avanzado y personalización del portal
-- Permite al entrenador personalizar colores de fondo/texto del portal
-- y los textos de bienvenida, pie y nombres de tabs
-- Aplicar también en Supabase de Pablo Rodríguez (focgysujvofpihjhvznl)

ALTER TABLE configuracion
  ADD COLUMN IF NOT EXISTS color_fondo text NOT NULL DEFAULT '#F7F6F3',
  ADD COLUMN IF NOT EXISTS color_texto text NOT NULL DEFAULT '#0A0A0A',
  ADD COLUMN IF NOT EXISTS portal_bienvenida text,
  ADD COLUMN IF NOT EXISTS portal_pie text,
  ADD COLUMN IF NOT EXISTS portal_nombre_rutinas text,
  ADD COLUMN IF NOT EXISTS portal_nombre_seguimiento text;

COMMENT ON COLUMN configuracion.color_fondo IS 'Color de fondo del portal cliente (hex). Default: #F7F6F3';
COMMENT ON COLUMN configuracion.color_texto IS 'Color de texto principal del portal cliente (hex). Default: #0A0A0A';
COMMENT ON COLUMN configuracion.portal_bienvenida IS 'Mensaje de bienvenida personalizado en el portal del cliente (nulo = texto por defecto)';
COMMENT ON COLUMN configuracion.portal_pie IS 'Texto del pie/footer del portal, ej: "© 2024 Pablo Rodríguez Center" (nulo = oculto)';
COMMENT ON COLUMN configuracion.portal_nombre_rutinas IS 'Nombre personalizado para el tab de rutinas en el portal, ej: "Entrena" (nulo = "Entrena")';
COMMENT ON COLUMN configuracion.portal_nombre_seguimiento IS 'Nombre personalizado para seguimiento/check-in en el portal (nulo = "Seguimiento")';
