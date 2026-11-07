-- M9 F1 — Configuración avanzada: datos fiscales, logo, política cancelación, umbrales inactividad
-- Aplicar también en Supabase de Pablo Rodríguez (focgysujvofpihjhvznl)

ALTER TABLE configuracion
  ADD COLUMN IF NOT EXISTS nif text,
  ADD COLUMN IF NOT EXISTS razon_social text,
  ADD COLUMN IF NOT EXISTS direccion_fiscal text,
  ADD COLUMN IF NOT EXISTS cp_fiscal text,
  ADD COLUMN IF NOT EXISTS municipio_fiscal text,
  ADD COLUMN IF NOT EXISTS provincia_fiscal text,
  ADD COLUMN IF NOT EXISTS regimen_iva text NOT NULL DEFAULT 'exento',
  ADD COLUMN IF NOT EXISTS serie_facturas text NOT NULL DEFAULT 'F',
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS email_fiscal text,
  ADD COLUMN IF NOT EXISTS politica_cancelacion_horas integer NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS politica_cancelacion_consecuencia text NOT NULL DEFAULT 'ninguna',
  ADD COLUMN IF NOT EXISTS inactividad_alerta_dias integer NOT NULL DEFAULT 7,
  ADD COLUMN IF NOT EXISTS inactividad_riesgo_dias integer NOT NULL DEFAULT 14;

-- Restricciones de validación
ALTER TABLE configuracion
  ADD CONSTRAINT IF NOT EXISTS check_regimen_iva
    CHECK (regimen_iva IN ('exento', 'sujeto_21', 'recargo_equivalencia')),
  ADD CONSTRAINT IF NOT EXISTS check_politica_cancelacion_consecuencia
    CHECK (politica_cancelacion_consecuencia IN ('ninguna', 'descuenta_bono', 'penalizacion')),
  ADD CONSTRAINT IF NOT EXISTS check_inactividad_orden
    CHECK (inactividad_riesgo_dias > inactividad_alerta_dias);

COMMENT ON COLUMN configuracion.nif IS 'NIF o CIF del entrenador/empresa para facturación';
COMMENT ON COLUMN configuracion.razon_social IS 'Razón social legal (puede diferir de nombre_negocio)';
COMMENT ON COLUMN configuracion.regimen_iva IS 'exento (Art.20.1.13) | sujeto_21 | recargo_equivalencia';
COMMENT ON COLUMN configuracion.serie_facturas IS 'Prefijo de serie para numeración correlativa de facturas';
COMMENT ON COLUMN configuracion.logo_url IS 'Logo del centro para portal cliente, PDFs y facturas';
COMMENT ON COLUMN configuracion.politica_cancelacion_horas IS 'Horas mínimas de antelación para cancelar sin penalización';
COMMENT ON COLUMN configuracion.politica_cancelacion_consecuencia IS 'Consecuencia de cancelación tardía: ninguna | descuenta_bono | penalizacion';
COMMENT ON COLUMN configuracion.inactividad_alerta_dias IS 'Días sin check-in que disparan alerta amarilla';
COMMENT ON COLUMN configuracion.inactividad_riesgo_dias IS 'Días sin check-in que marcan cliente en riesgo de baja';
