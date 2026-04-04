import { supabase } from './supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null
  try {
    const registration = await navigator.serviceWorker.register('/sw.js')
    return registration
  } catch (err) {
    console.error('SW registration failed:', err)
    return null
  }
}

export async function requestPushPermission(userId) {
  if (!('Notification' in window) || !('PushManager' in window)) return false

  // Vérifier si déjà refusé
  if (localStorage.getItem('push_denied') === 'true') return false

  // Vérifier si déjà accordé et souscrit
  if (Notification.permission === 'granted') {
    await subscribeToPush(userId)
    return true
  }

  if (Notification.permission === 'denied') {
    localStorage.setItem('push_denied', 'true')
    return false
  }

  // Demander la permission
  const permission = await Notification.requestPermission()
  if (permission === 'granted') {
    await subscribeToPush(userId)
    return true
  } else {
    localStorage.setItem('push_denied', 'true')
    return false
  }
}

async function subscribeToPush(userId) {
  try {
    const registration = await navigator.serviceWorker.ready

    // Vérifier si déjà souscrit
    let subscription = await registration.pushManager.getSubscription()

    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })
    }

    const subJson = subscription.toJSON()

    // Sauvegarder dans Supabase
    await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      endpoint: subJson.endpoint,
      p256dh: subJson.keys?.p256dh || null,
      auth: subJson.keys?.auth || null,
    }, { onConflict: 'user_id,endpoint' })

    return true
  } catch (err) {
    console.error('Push subscription failed:', err)
    return false
  }
}
