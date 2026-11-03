/**
 * push.js — Utilidades PWA/Push para el Portal Cliente
 *
 * Flujo:
 * 1. registerSW()        — registra el Service Worker (llamar al montar la app)
 * 2. subscribePush()     — suscribir al usuario a push (llamar tras primer valor: mensaje, sesión, etc.)
 * 3. savePushSub()       — guardar la suscripción en Supabase
 * 4. unsubscribePush()   — cancelar suscripción (en ajustes)
 *
 * VAPID Public Key — generada con Web Crypto API (P-256), par guardado en Supabase Secrets:
 * VAPID_PUBLIC_KEY  = BDN887ceyfmQ6vSFH8kQPBt9FJ4XE79NejQLJbPzi0TgpUcGfhAbEYmGBXSHZ8b0jVtWx-bLadKtfG9RaaV081Q
 * VAPID_PRIVATE_KEY = (en Supabase Secrets — no exponer en frontend)
 * VAPID_SUBJECT     = mailto:bernaberoberto01@gmail.com
 */

const VAPID_PUBLIC_KEY = 'BDN887ceyfmQ6vSFH8kQPBt9FJ4XE79NejQLJbPzi0TgpUcGfhAbEYmGBXSHZ8b0jVtWx-bLadKtfG9RaaV081Q'

/** Convierte una cadena base64url a Uint8Array (para applicationServerKey) */
function urlB64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

/** Registra el Service Worker. Retorna el registro o null si no soportado. */
export async function registerSW() {
  if (!('serviceWorker' in navigator)) return null
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' })
    return reg
  } catch (e) {
    console.warn('[Push] Error registrando SW:', e)
    return null
  }
}

/** ¿El navegador soporta push notifications? */
export function pushSupported() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/** Estado actual del permiso de notificaciones */
export function pushPermissionState() {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission // 'default' | 'granted' | 'denied'
}

/**
 * Solicitar permiso y suscribirse al push.
 * @returns { subscription: PushSubscription | null, permiso: string }
 */
export async function subscribePush() {
  if (!pushSupported()) return { subscription: null, permiso: 'unsupported' }

  // Pedir permiso si no se ha dado
  let permiso = Notification.permission
  if (permiso === 'default') {
    permiso = await Notification.requestPermission()
  }
  if (permiso !== 'granted') return { subscription: null, permiso }

  try {
    const reg = await navigator.serviceWorker.ready
    let subscription = await reg.pushManager.getSubscription()
    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY),
      })
    }
    return { subscription, permiso: 'granted' }
  } catch (e) {
    console.warn('[Push] Error suscribiendo:', e)
    return { subscription: null, permiso: 'error' }
  }
}

/**
 * Guarda la suscripción push en Supabase.
 * @param {object} supabase — cliente Supabase
 * @param {string} clienteId — UUID del cliente
 * @param {PushSubscription} subscription
 */
export async function savePushSub(supabase, clienteId, subscription) {
  if (!subscription) return false
  const { endpoint, keys } = subscription.toJSON()
  try {
    const { error } = await supabase.from('push_subscriptions').upsert({
      cliente_id: clienteId,
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
      activa: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'cliente_id,endpoint' })
    if (error) console.warn('[Push] Error guardando suscripción:', error)
    return !error
  } catch (e) {
    console.warn('[Push] Error guardando suscripción:', e)
    return false
  }
}

/**
 * Cancela la suscripción push y la borra de Supabase.
 * @param {object} supabase — cliente Supabase
 */
export async function unsubscribePush(supabase) {
  try {
    const reg = await navigator.serviceWorker.ready
    const subscription = await reg.pushManager.getSubscription()
    if (subscription) {
      const endpoint = subscription.endpoint
      await subscription.unsubscribe()
      await supabase.from('push_subscriptions').delete().eq('endpoint', endpoint)
    }
    return true
  } catch (e) {
    console.warn('[Push] Error cancelando suscripción:', e)
    return false
  }
}
