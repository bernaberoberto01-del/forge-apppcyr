-- M2 F1 — PAR-Q y consentimiento RGPD en ficha del cliente
-- Tabla de consentimientos (RGPD, PAR-Q, contrato)
-- Aplicar también en Supabase de Pablo Rodríguez (focgysujvofpihjhvznl)

CREATE TABLE IF NOT EXISTS consentimientos_cliente (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  cliente_id uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  entrenador_id uuid NOT NULL,
  tipo text NOT NULL,  -- 'rgpd' | 'parq' | 'contrato'
  version text NOT NULL DEFAULT '1.0',
  aceptado boolean NOT NULL DEFAULT false,
  fecha_aceptacion timestamptz,
  ip_aceptacion text,
  datos_adicionales jsonb,  -- respuestas PAR-Q, nombre firmante, etc.
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_consentimientos_cliente_id ON consentimientos_cliente(cliente_id);
CREATE INDEX IF NOT EXISTS idx_consentimientos_entrenador_id ON consentimientos_cliente(entrenador_id);
CREATE INDEX IF NOT EXISTS idx_consentimientos_tipo ON consentimientos_cliente(tipo);

-- RLS
ALTER TABLE consentimientos_cliente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "entrenador_own_consentimientos" ON consentimientos_cliente
  FOR ALL USING (entrenador_id = auth.uid());

-- Permite lectura por el propio cliente (para su historial)
CREATE POLICY "cliente_read_own_consentimientos" ON consentimientos_cliente
  FOR SELECT USING (
    cliente_id IN (
      SELECT id FROM clientes WHERE auth_user_id = auth.uid()
    )
  );

COMMENT ON TABLE consentimientos_cliente IS 'Registro de consentimientos firmados por los clientes: RGPD, PAR-Q y contrato de servicios';
COMMENT ON COLUMN consentimientos_cliente.tipo IS 'rgpd | parq | contrato';
COMMENT ON COLUMN consentimientos_cliente.datos_adicionales IS 'PAR-Q: { respuestas: {q1: bool, q2: bool, ...}, observaciones: string }';
