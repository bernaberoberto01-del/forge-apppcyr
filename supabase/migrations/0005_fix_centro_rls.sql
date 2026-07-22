-- Cierra dos políticas INSERT abiertas en el sistema de equipo/centro.
-- Sin esto, cualquier usuario autenticado podía añadirse como admin de
-- cualquier centro ajeno, o crear invitaciones en nombre de otro centro.

-- ─── miembros_centro ─────────────────────────────────────────────────────────
-- Antes: INSERT sin with_check → cualquiera podía insertar cualquier fila
-- Ahora: solo el owner del centro (al crearlo) o un invitado con token válido
DROP POLICY IF EXISTS miembros_insert ON public.miembros_centro;
CREATE POLICY miembros_insert ON public.miembros_centro FOR INSERT WITH CHECK (
  -- El owner del centro se añade a sí mismo al crear el centro
  (user_id = auth.uid() AND centro_id IN (
    SELECT id FROM public.centros WHERE owner_id = auth.uid()
  ))
  OR
  -- Un usuario acepta una invitación vigente (token sin usar, email coincide)
  (user_id = auth.uid() AND EXISTS (
    SELECT 1 FROM public.invitaciones_centro
    WHERE centro_id = miembros_centro.centro_id
      AND email = (SELECT email FROM auth.users WHERE id = auth.uid())
      AND usado = false
  ))
);

-- ─── invitaciones_centro ──────────────────────────────────────────────────────
-- Antes: INSERT sin with_check → cualquiera podía crear invitaciones para
--        cualquier centro ajeno
-- Ahora: solo el owner del centro o un miembro admin activo
DROP POLICY IF EXISTS invitaciones_insert ON public.invitaciones_centro;
CREATE POLICY invitaciones_insert ON public.invitaciones_centro FOR INSERT WITH CHECK (
  centro_id IN (SELECT id FROM public.centros WHERE owner_id = auth.uid())
  OR
  centro_id IN (
    SELECT centro_id FROM public.miembros_centro
    WHERE user_id = auth.uid() AND rol = 'admin' AND activo = true
  )
);
