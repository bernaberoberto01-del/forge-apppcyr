/**
 * enviar-push — Edge Function para Web Push Notifications
 *
 * Implementa Web Push Protocol (RFC 8030 + RFC 8292 VAPID + RFC 8291 encryption)
 * usando Web Crypto API nativa de Deno.
 *
 * Payload POST:
 * {
 *   cliente_id?: string,    // UUID del cliente destinatario
 *   auth_user_id?: string,  // Alternativa a cliente_id
 *   tipo: 'mensaje' | 'sesion' | 'checkin' | 'pago' | 'general',
 *   titulo?: string,
 *   cuerpo: string,
 *   url?: string
 * }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const CORS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// ── Utilidades base64url ──
function b64uDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - s.length % 4)
  return Uint8Array.from(atob((s + pad).replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0))
}

function b64uEncode(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf)
  let s = ''
  bytes.forEach(b => s += String.fromCharCode(b))
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((n, a) => n + a.length, 0)
  const out = new Uint8Array(total)
  let i = 0
  for (const a of arrays) { out.set(a, i); i += a.length }
  return out
}

// ── JWT VAPID (ES256) ──
async function vapidJwt(audience: string, subject: string, privKeyB64: string, pubKeyB64: string): Promise<string> {
  // Importar clave privada P-256
  const privRaw = b64uDecode(privKeyB64)
  // PKCS8 wrapper para EC P-256 (secp256r1) con clave de 32 bytes
  const pkcs8Header = new Uint8Array([
    0x30, 0x41, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86, 0x48,
    0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d, 0x03,
    0x01, 0x07, 0x04, 0x27, 0x30, 0x25, 0x02, 0x01, 0x01, 0x04, 0x20,
  ])
  const pkcs8 = concat(pkcs8Header, privRaw)
  const privKey = await crypto.subtle.importKey('pkcs8', pkcs8.buffer, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign'])

  const now = Math.floor(Date.now() / 1000)
  const hdr = b64uEncode(new TextEncoder().encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const pld = b64uEncode(new TextEncoder().encode(JSON.stringify({ aud: audience, exp: now + 43200, sub: subject })))
  const sigInput = `${hdr}.${pld}`
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, privKey, new TextEncoder().encode(sigInput))

  return `${sigInput}.${b64uEncode(sig)}`
}

// ── Cifrado RFC 8291 (aes128gcm) ──
async function encryptWebPush(
  p256dhB64: string,
  authB64: string,
  body: string,
): Promise<{ data: Uint8Array; salt: Uint8Array; dh: Uint8Array }> {
  const receiverPub = b64uDecode(p256dhB64)
  const authSecret = b64uDecode(authB64)

  // Par de claves efímero del servidor
  const senderPair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits'])
  const senderPubRaw = new Uint8Array(await crypto.subtle.exportKey('raw', senderPair.publicKey))

  // Importar clave pública del receptor
  const receiverKey = await crypto.subtle.importKey('raw', receiverPub, { name: 'ECDH', namedCurve: 'P-256' }, false, [])

  // Shared secret via ECDH
  const ecdhBits = await crypto.subtle.deriveBits({ name: 'ECDH', public: receiverKey }, senderPair.privateKey, 256)
  const ecdhKey = await crypto.subtle.importKey('raw', ecdhBits, 'HKDF', false, ['deriveBits'])

  const salt = crypto.getRandomValues(new Uint8Array(16))

  // PRK = HKDF-Extract(auth_secret, ecdh_secret) con info = "Content-Encoding: auth\0"
  const prkBits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt: authSecret, info: new TextEncoder().encode('Content-Encoding: auth\0') },
    ecdhKey, 256,
  )
  const prkKey = await crypto.subtle.importKey('raw', prkBits, 'HKDF', false, ['deriveBits'])

  // keyinfo = "Content-Encoding: aes128gcm\0" || 0x00 || 0x10 || "P-256\0" || len(recv_pub) || recv_pub || len(sender_pub) || sender_pub
  const keyLabel = new TextEncoder().encode('Content-Encoding: aes128gcm\0')
  const nonceLabel = new TextEncoder().encode('Content-Encoding: nonce\0')
  const curveName = new TextEncoder().encode('P-256\0')
  const recvLen = new Uint8Array([0, receiverPub.length])
  const sendLen = new Uint8Array([0, senderPubRaw.length])
  const zero1 = new Uint8Array([0])
  const len16 = new Uint8Array([0, 16])
  const len12 = new Uint8Array([0, 12])

  const keyInfo = concat(keyLabel, zero1, len16, curveName, recvLen, receiverPub, sendLen, senderPubRaw)
  const nonceInfo = concat(nonceLabel, zero1, len12, curveName, recvLen, receiverPub, sendLen, senderPubRaw)

  const cekBits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: keyInfo }, prkKey, 128)
  const nonceBits = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info: nonceInfo }, prkKey, 96)

  const aesKey = await crypto.subtle.importKey('raw', cekBits, 'AES-GCM', false, ['encrypt'])
  const plaintext = concat(new TextEncoder().encode(body), new Uint8Array([2])) // padding delim

  const ciphertext = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonceBits }, aesKey, plaintext))

  return { data: ciphertext, salt, dh: senderPubRaw }
}

// ── Enviar un push ──
async function sendWebPush(
  sub: { endpoint: string; p256dh: string; auth: string },
  payload: object,
  vapidPub: string,
  vapidPriv: string,
  appUrl: string,
): Promise<{ ok: boolean; status: number; expired?: boolean }> {
  const origin = new URL(sub.endpoint).origin
  const jwt = await vapidJwt(origin, appUrl, vapidPriv, vapidPub)
  const vapidAuth = `vapid t=${jwt},k=${vapidPub}`

  const bodyStr = JSON.stringify(payload)

  try {
    const { data: ciphertext, salt, dh } = await encryptWebPush(sub.p256dh, sub.auth, bodyStr)

    // aes128gcm record header: salt (16) + rs (4, big-endian, 4096) + idlen (1) + dh (65)
    const rs = new Uint8Array(4)
    new DataView(rs.buffer).setUint32(0, 4096, false)
    const header = concat(salt, rs, new Uint8Array([dh.length]), dh)
    const body = concat(header, ciphertext)

    const resp = await fetch(sub.endpoint, {
      method: 'POST',
      headers: {
        Authorization: vapidAuth,
        'Content-Type': 'application/octet-stream',
        'Content-Encoding': 'aes128gcm',
        TTL: '86400',
        Urgency: 'normal',
      },
      body,
    })

    return { ok: resp.ok || resp.status === 201, status: resp.status, expired: resp.status === 410 }
  } catch (e) {
    console.error('sendWebPush error:', e)
    return { ok: false, status: 0 }
  }
}

// ── Supabase client ──
const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY') || ''
    const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY') || ''
    const APP_URL = Deno.env.get('APP_URL') || 'https://forge-studio-os.vercel.app'

    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
      return new Response(JSON.stringify({ ok: false, motivo: 'VAPID_PUBLIC_KEY y VAPID_PRIVATE_KEY no configurados en secrets' }), { headers: CORS })
    }

    // Auth: JWT de entrenador o service role implícito
    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    const { data: { user } } = await sb.auth.getUser(token || '')
    if (!user) return new Response(JSON.stringify({ error: 'No autorizado' }), { status: 401, headers: CORS })

    const { cliente_id, auth_user_id: targetUserId, tipo = 'general', titulo, cuerpo, url } = await req.json()

    // Resolver auth_user_id
    let resolvedUserId = targetUserId
    if (!resolvedUserId && cliente_id) {
      const { data: cli } = await sb.from('clientes').select('auth_user_id').eq('id', cliente_id).single()
      resolvedUserId = cli?.auth_user_id
    }
    if (!resolvedUserId) return new Response(JSON.stringify({ error: 'cliente_id o auth_user_id requerido' }), { status: 400, headers: CORS })

    // Cargar suscripciones activas del usuario
    const { data: subs } = await sb.from('push_subscriptions').select('id, endpoint, p256dh, auth').eq('auth_user_id', resolvedUserId)
    if (!subs?.length) return new Response(JSON.stringify({ ok: true, enviados: 0, motivo: 'Sin suscripciones push' }), { headers: CORS })

    const titles: Record<string, string> = {
      mensaje: '💬 Nuevo mensaje',
      sesion: '💪 Recordatorio de sesión',
      checkin: '📊 Check-in pendiente',
      pago: '💳 Aviso de pago',
      general: 'Forge Studio',
    }

    const pushPayload = {
      title: titulo || titles[tipo] || 'Forge Studio',
      body: cuerpo || '',
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      tag: tipo,
      url: url || '/portal',
    }

    // Enviar a todas las suscripciones en paralelo
    const resultados = await Promise.allSettled(
      subs.map(sub => sendWebPush(sub, pushPayload, VAPID_PUBLIC, VAPID_PRIVATE, APP_URL))
    )

    // Limpiar suscripciones expiradas (410 Gone)
    const expired = subs.filter((_, i) => {
      const r = resultados[i]
      return r.status === 'fulfilled' && (r.value as { expired?: boolean }).expired
    }).map(s => s.id)

    if (expired.length) {
      await sb.from('push_subscriptions').delete().in('id', expired)
    }

    const enviados = resultados.filter(r => r.status === 'fulfilled' && (r.value as { ok: boolean }).ok).length
    return new Response(JSON.stringify({ ok: true, enviados, total: subs.length }), { headers: CORS })
  } catch (err) {
    console.error('enviar-push:', err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: CORS })
  }
})
