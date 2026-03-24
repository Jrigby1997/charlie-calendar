/** Shared push notification utilities (client-side safe). */

/**
 * Converts a URL-safe base64 VAPID public key string to a Uint8Array
 * suitable for PushManager.subscribe({ applicationServerKey }).
 */
export function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0))) as Uint8Array<ArrayBuffer>
}
