-- M3 F2: Tabla para almacenar suscripciones push (Web Push API / VAPID)
-- Aplicar también en Pablo Rodríguez (focgysujvofpihjhvznl)

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id uuid NOT NULL REFERENCES clientes(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  activa boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (cliente_id, endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_cliente ON push_subscriptions(cliente_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_activa ON push_subscriptions(activa);

COMMENT ON TABLE push_subscriptions IS 'Suscripciones Web Push de clientes para notificaciones PWA';
COMMENT ON COLUMN push_subscriptions.endpoint IS 'URL del push service del navegador';
COMMENT ON COLUMN push_subscriptions.p256dh IS 'Clave pública del cliente para cifrado';
COMMENT ON COLUMN push_subscriptions.auth IS 'Secreto de autenticación del cliente';

-- RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- El cliente solo puede ver/insertar/borrar sus propias suscripciones
CREATE POLICY "cliente_push_own" ON push_subscriptions
  FOR ALL USING (
    cliente_id IN (SELECT id FROM clientes WHERE auth_user_id = auth.uid())
  );

-- El entrenador puede leer todas las suscripciones de sus clientes
CREATE POLICY "entrenador_push_read" ON push_subscriptions
  FOR SELECT USING (
    cliente_id IN (SELECT id FROM clientes WHERE entrenador_id = auth.uid())
  );
