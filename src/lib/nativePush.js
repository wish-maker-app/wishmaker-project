import { Capacitor } from '@capacitor/core'
import { supabase } from './supabase'

/**
 * Notifications push NATIVES (Capacitor / APNs + FCM).
 *
 * ⚠️ GUARDÉ : tout est no-op hors app native (iOS/Android). Sur le web/PWA, on
 * garde le Web Push (VAPID) existant — voir pushNotifications.js qui délègue ici
 * uniquement quand Capacitor.isNativePlatform() est vrai.
 *
 * Le token natif (FCM sur Android, APNs relayé par FCM sur iOS) est stocké dans
 * push_subscriptions.endpoint, avec platform = 'android' | 'ios'. L'Edge Function
 * d'envoi distingue ensuite web (Web Push) vs natif (FCM) via la colonne platform.
 */

let listenersReady = false
let currentUserId = null

export async function registerNativePush(userId) {
  if (!Capacitor.isNativePlatform()) return false
  currentUserId = userId || currentUserId
  if (!currentUserId) return false

  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')

    // Listeners posés UNE SEULE FOIS. Le token arrive de façon asynchrone via
    // l'event 'registration' (après register()).
    if (!listenersReady) {
      listenersReady = true

      PushNotifications.addListener('registration', async (token) => {
        try {
          if (!currentUserId) return
          await supabase.from('push_subscriptions').upsert({
            user_id: currentUserId,
            endpoint: token.value,               // token FCM/APNs
            platform: Capacitor.getPlatform(),   // 'android' | 'ios'
          }, { onConflict: 'user_id,endpoint' })
        } catch (e) {
          console.warn('[nativePush] enregistrement token échoué:', e?.message)
        }
      })

      PushNotifications.addListener('registrationError', (err) => {
        console.warn('[nativePush] erreur registration:', err?.error)
      })

      // Tap sur une notification → navigation vers l'URL portée par la notif
      // (même mécanique SPA que main.jsx pour rester dans la WebView).
      PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        const url = action?.notification?.data?.url
        if (!url) return
        if (url.startsWith('/')) {
          history.pushState(null, '', url)
          window.dispatchEvent(new PopStateEvent('popstate'))
        } else {
          window.location.href = url
        }
      })
    }

    // Demande de permission puis enregistrement auprès d'APNs/FCM.
    const perm = await PushNotifications.requestPermissions()
    if (perm.receive !== 'granted') {
      try { localStorage.setItem('push_denied', 'true') } catch { /* ignore */ }
      return false
    }
    await PushNotifications.register() // déclenche l'event 'registration'
    return true
  } catch (e) {
    console.warn('[nativePush] register échoué:', e?.message)
    return false
  }
}
