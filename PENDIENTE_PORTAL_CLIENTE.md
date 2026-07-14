# Plan de ejecución — Portal del cliente seguro (handoff para Sonnet)

Este documento detalla, paso a paso, el trabajo que queda para dejar el portal del
cliente **funcional y seguro** (modelo elegido: **email + contraseña con confirmación de email**).
Está pensado para ejecutarse de arriba abajo.

---

## 0. Contexto: qué YA está hecho (no rehacer)

- **RLS cerrado** (migraciones `supabase/migrations/0001_enable_rls.sql` y `0002_portal_cliente_rls.sql`,
  ya aplicadas en la BD). Cero políticas abiertas. El acceso anónimo a la BD está bloqueado.
- **Edge Functions aseguradas** (validan JWT + autorizan, `verify_jwt=true`, ya desplegadas):
  - `portal-accion` — cancelar sesión (solo el cliente dueño).
  - `generar-nutricion` — generar plan (solo el entrenador dueño).
  - `vincular-cliente` — vincula cuenta↔ficha **por coincidencia de email** (elimina el IDOR).
    Exige `email_confirmed_at`. Códigos de error: `sin_ficha`, `ficha_vinculada_a_otra_cuenta`,
    `email_no_confirmado`.
- **Frontend ya adaptado**: `LoginPortal.jsx` vincula vía `vincular-cliente`; `PortalCliente.jsx`
  ya no auto-vincula y carga datos solo con sesión.

## Credenciales y herramientas

- **Token admin de Supabase** (Management API): en `.secrets.local` (raíz, gitignored),
  variable `SUPABASE_ACCESS_TOKEN`. Project ref: `qdpqpbkppkhzcxpfypvf`.
- **Ejecutar SQL/DDL**: `POST https://api.supabase.com/v1/projects/{ref}/database/query`.
  IMPORTANTE: construir el JSON del payload con **python** y enviarlo con **curl**
  (`python-urllib` lo bloquea Cloudflare con error 1010; `curl` pasa). Ver ejemplos en el historial.
- **Desplegar una Edge Function**:
  `POST https://api.supabase.com/v1/projects/{ref}/functions/deploy?slug={slug}`
  con multipart: `-F "metadata=<meta.json;type=application/json" -F "file=@index.ts;type=application/typescript"`.
  El archivo subido **debe llamarse `index.ts`**. `meta.json` = `{"name":"{slug}","entrypoint_path":"index.ts","verify_jwt":true}`.
- **NO hacer `git push`** salvo que el usuario lo pida explícitamente (regla del proyecto, ver `CLAUDE.md`).

---

## 1. Configurar SMTP (Resend) + activar confirmación de email  ← BLOQUEA la seguridad final

**Requiere del usuario**: el valor de `RESEND_API_KEY` (el proyecto ya tiene ese secreto pero no se
puede leer su valor por API), o que el usuario lo ponga en el panel. Y el **dominio de producción**.

Opción A — el usuario lo hace en el panel (más seguro):
Supabase Dashboard → Authentication → Emails → SMTP Settings → activar y rellenar:
- Host: `smtp.resend.com`  ·  Port: `465`  ·  User: `resend`  ·  Pass: la API key de Resend
- Sender email: un remitente verificado en Resend  ·  Sender name: el nombre del negocio
Luego Dashboard → Authentication → Providers → Email → **desactivar "Confirm email" = OFF** significa
autoconfirm; hay que **activar la confirmación** (que SÍ pida confirmar). En la config eso es
`mailer_autoconfirm = false`.

Opción B — vía Management API (si el usuario pasa la key). PATCH del config de auth:
```bash
PAT="<SUPABASE_ACCESS_TOKEN de .secrets.local>"; REF="qdpqpbkppkhzcxpfypvf"
RESEND_KEY="<la key que pase el usuario>"
python - <<PY > /tmp/authcfg.json
import json
json.dump({
  "smtp_admin_email": "<remitente_verificado@dominio>",
  "smtp_host": "smtp.resend.com",
  "smtp_port": 465,
  "smtp_user": "resend",
  "smtp_pass": "$RESEND_KEY",
  "smtp_sender_name": "Forge",
  "mailer_autoconfirm": False,          # activa la confirmación de email
  "site_url": "https://<DOMINIO_REAL>", # ver paso 2
}, open("/tmp/authcfg.json","w"))
PY
curl -s -X PATCH "https://api.supabase.com/v1/projects/$REF/config/auth" \
  -H "Authorization: Bearer $PAT" -H "Content-Type: application/json" \
  --data-binary @/tmp/authcfg.json
```
**Verificar** después: `GET /v1/projects/$REF/config/auth` → `mailer_autoconfirm` debe ser `false`
y `smtp_host` = `smtp.resend.com`.

⚠️ Tras activar la confirmación, al registrarse ya NO hay sesión inmediata: el cliente debe confirmar
el email. `LoginPortal.jsx` ya maneja ese caso (muestra "Revisa tu email...").

## 2. Corregir `site_url` y redirect URLs

`site_url` está en `http://localhost:3000` (mal). Preguntar al usuario el dominio real (Vercel).
Ponerlo en el PATCH del paso 1 (`site_url`) y añadir en `uri_allow_list` las URLs de redirección
permitidas (el dominio de prod + `http://localhost:4000` para desarrollo), separadas por coma:
```
"uri_allow_list": "https://<DOMINIO_REAL>/**,http://localhost:4000/**"
```

## 3. Hacer que "Registrar entreno" y "Check-in" exijan login

Ambas páginas son hoy anónimas y, con el RLS cerrado, muestran "Enlace no válido". Hay que meterles
el mismo patrón de sesión que `PortalCliente.jsx`. **La seguridad la da el RLS** (un cliente logueado
solo puede leer/escribir lo suyo), así que basta con exigir sesión.

### 3a. `src/pages/SesionCliente.jsx`
1. Importar el login: `import LoginPortal from './LoginPortal'`
2. Añadir estado de sesión y su carga (copiar el patrón de `PortalCliente.jsx` líneas ~34-42):
   ```jsx
   const [clienteSession, setClienteSession] = useState(undefined)
   useEffect(() => {
     supabase.auth.getSession().then(({ data: { session } }) => setClienteSession(session?.user || null))
     const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setClienteSession(s?.user || null))
     return () => subscription.unsubscribe()
   }, [])
   ```
3. En el `useEffect` que hace `cargar()`: añadir `clienteSession` a las dependencias y salir si no hay sesión:
   ```jsx
   useEffect(() => {
     if (clienteSession === undefined) return
     if (!clienteSession) { setLoading(false); return }
     async function cargar() { /* ...igual... */ }
     cargar()
   }, [clienteId, clienteSession])
   ```
4. Antes del `return` principal, añadir los guards de sesión (después de los de `loading`/`!cliente`):
   ```jsx
   if (clienteSession === undefined) return <Spinner/>   // el mismo spinner que ya usa
   if (clienteSession === null) return (
     <LoginPortal clienteId={clienteId} onLogin={u => setClienteSession(u)} colorAccento="#FF5C00" />
   )
   ```
   (Ordenar los guards: `loading` primero solo si hay sesión; cuidado de no mostrar el spinner de
   `loading` para siempre cuando no hay sesión — igual que se resolvió en `PortalCliente.jsx`.)
5. `guardar()` NO cambia: inserta en `sesiones` y `sesion_ejercicios`; el RLS (migración 0002) ya
   permite esos INSERT al cliente dueño. El campo `entrenador_id` que se inserta debe seguir viniendo
   de `cliente.entrenador_id` (ya es así).

### 3b. `src/pages/CheckinPublico.jsx`
Mismo patrón que 3a:
1. `import LoginPortal from './LoginPortal'`
2. Añadir `clienteSession` + su `useEffect` de carga de sesión.
3. El `useEffect` que carga `clientes` → depende de `[clienteId, clienteSession]` y sale si no hay sesión.
4. Guards antes del render: spinner / `<LoginPortal .../>` si no hay sesión.
5. `enviar()` NO cambia: inserta en `checkins`; el RLS ya permite el INSERT al cliente dueño
   (política `checkins_cliente_insert`).

### 3c. Build
`npm run build` debe pasar sin errores tras 3a y 3b.

## 4. Verificar de punta a punta (con un usuario de prueba REAL)

OJO: `clientes.auth_user_id` tiene FK a `auth.users`, así que NO se puede simular con un uuid falso
(da error 23503). Para probar el camino feliz hay que crear un usuario de auth real de prueba:

1. Elegir un cliente de prueba y su email:
   `select id, email from clientes order by created_at limit 1;`
2. Crear un usuario de auth con ESE email vía Admin API (auto-confirmado para la prueba):
   `POST /auth/v1/admin/users` (necesita la SERVICE_ROLE key, que está en los secretos del proyecto;
   el usuario puede pasarla, o usar el panel Authentication → Add user).
3. Iniciar sesión con ese usuario (email+password) para obtener un `access_token`, y con él:
   - Llamar a `POST /functions/v1/vincular-cliente` (Authorization: Bearer <access_token>) →
     esperar `{ ok:true, cliente_id }`.
   - Con ese token, `GET /rest/v1/clientes?select=*` → debe devolver **solo esa ficha** (no las 67).
   - Insertar una sesión de prueba en `/rest/v1/sesiones` con su `cliente_id` → debe funcionar (201).
   - Insertar una sesión con OTRO `cliente_id` → debe fallar (RLS, 403/empty).
4. **Limpiar**: borrar el usuario de prueba (`DELETE /auth/v1/admin/users/{id}`), poner
   `auth_user_id=null` en el cliente de prueba, y borrar la sesión de prueba insertada.

Alternativa no destructiva para verificar SOLO el RLS (sin crear usuarios): envolver en transacción
con `rollback`, pero hay que insertar primero un usuario real en `auth.users` dentro de la misma
transacción (por la FK). Es más frágil; preferible el usuario de prueba real + limpieza.

## 5. Revisar las otras 14 Edge Functions (seguridad)

Hay 14 funciones desplegadas con `verify_jwt=False` cuyo código NO está en este repo:
`crear-checkout`, `stripe-webhook`, `generar-rutina`, `actualizar-rutina-mensual`, `detectar-alertas`,
`resumen-mensual`, `revision-fuerza-mensual`, `progresion-mensual`, `generar-plan-nutricional`,
`checkin-semanal`, `alerta-pago-vencido`, `bienvenida-cliente`, `crear-demo`, `poblar-demo`.

Para cada una: descargar su código (`GET /v1/projects/{ref}/functions/{slug}/body`), revisar si usa
`service_role` sin validar quién llama. Distinguir dos tipos:
- **Invocadas por usuarios** (desde el frontend): deben validar JWT + autorizar (como hicimos con las 3).
- **Invocadas por cron/webhooks** (`stripe-webhook`, `*-mensual`, `detectar-alertas`, etc.): NO llevan
  JWT de usuario; se protegen con un **secreto compartido** (firma del webhook para Stripe; una cabecera
  secreta para las de cron) — NO ponerles `verify_jwt=true` sin más o el cron dejará de funcionar.
`crear-checkout` y `crear-demo`/`poblar-demo` son las más sensibles (pagos / creación masiva de datos):
priorizarlas.

---

## Orden recomendado de ejecución
1. ~~Paso 3 (SesionCliente + CheckinPublico)~~ ✅ HECHO — ambas páginas ahora exigen login
   (mismo patrón `clienteSession` + `<LoginPortal/>` que PortalCliente.jsx). Build OK.
   Verificado en navegador: `/sesion/:id` y `/seguimiento/:id` muestran el login (antes daban
   "Enlace no válido" por el RLS cerrado). Sin errores de consola.
2. **DECISIÓN DEL USUARIO (2026-07-14): NO activar confirmación de email por ahora.**
   Motivo: no hay dominio propio (solo `forge-studio-os.vercel.app`, subdominio de Vercel no
   verificable en Resend). Sin dominio verificado, Resend solo entrega al email de la cuenta de
   Resend — activar confirmación bloquearía el registro de TODOS los clientes reales. Se deja
   `mailer_autoconfirm=true` (estado actual) hasta que el usuario tenga dominio propio.
   Riesgo aceptado conscientemente: sin confirmación, alguien que ya conozca el email exacto de un
   cliente podría registrarse con ese email antes que él y robarle el vínculo (vincular-cliente
   matchea por email). Riesgo bajo en la práctica (requiere conocer el email exacto), pero real.
   Usuario podría añadir el PIN como mitigación futura (columnas `pin_portal`/`portal_pin` ya
   existen sin usar, 0 valores rellenados) — NO implementado, descartado por ahora a favor de
   "que funcione ya". Revisar cuando haya dominio propio (paso 1 sigue vigente entonces).
3. ✅ **VERIFICADO E2E el 2026-07-14** con un cliente y usuario de auth DESECHABLES (creados y
   borrados sin dejar rastro — 0 restos verificados tras limpieza). Resultado: TODO FUNCIONA:
   - `signUp` con email+password → sesión inmediata (autoconfirm) ✅
   - `vincular-cliente` (Edge Function) → vincula por email → 200 `{ok:true, cliente_id}` ✅
   - Cliente autenticado ve SOLO su ficha (`GET /clientes` → 1 fila, no las 67) ✅
   - Cliente autenticado registra entreno (`POST /sesiones`) → 201 ✅
   - Cliente autenticado NO puede insertar sesión para OTRO cliente → 403 RLS ✅
   - Cliente autenticado NO puede leer datos de OTRO cliente (`checkins`) → `[]` vacío ✅
   El sistema de login+registro+registrar-entreno para clientes está FUNCIONAL Y AISLADO tal
   como está ahora mismo, sin depender de email/dominio.
4. Paso 5 (auditar las otras 14 Edge Functions sin código en repo) — pendiente, no urgente.

## Bug encontrado y arreglado (2026-07-14, tras entrega al usuario)

El usuario probó `/portal/:id` en su navegador real y crasheó: "Cannot read properties of null
(reading 'nombre')". Causa: race condition en `PortalCliente.jsx` — en ciertas condiciones (sesión
de un usuario/entrenador AJENO al cliente de la URL, cuya lectura de `clientes` es bloqueada por
RLS) el componente podía llegar a renderizar la vista principal con `cliente` aún `null` antes de
que `notFound`/`loading` reflejaran el estado real, y el JSX accedía a `cliente.nombre` sin optional
chaining. Reproducido de forma determinista inyectando una sesión de otro entrenador
(`demo@forge-studio.es`) en localStorage y visitando la ficha de un cliente ajeno.

Arreglo (ya aplicado): en `PortalCliente.jsx`
1. Guard defensivo añadido: `if (!cliente) return <spinner/>` justo antes del `return` principal
   (después del guard de `clienteSession === undefined`) — garantiza que el JSX que usa
   `cliente.nombre` nunca se ejecuta con `cliente` a `null`, sea cual sea la causa de la carrera.
2. En el efecto de carga, al iniciar `cargar()` se resetea `setNotFound(false); setCliente(null)`
   antes del `setLoading(true)` — evita arrastrar estado de una ficha anterior si el componente no
   se desmonta entre navegaciones internas (cambio de `clienteId` sin recarga completa).

Verificado en navegador (build OK, sin errores de consola) en dos escenarios:
- Sesión de entrenador AJENO al cliente → "Enlace no válido" (correcto, sin crash).
- Sesión de la cuenta de prueba correctamente vinculada → portal carga bien, sin errores.
