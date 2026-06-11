import { supabase } from './supabase'
import { APP_VERSION } from './version'

/**
 * Boîte noire diagnostic : enregistre les événements de réveil/chargement dans
 * public.client_logs (lisible admin uniquement, auto-purgée à 7 jours).
 * Objectif : voir ce qui se passe SUR le téléphone d'un testeur au moment
 * exact d'un bug (« 0 vœux au retour », spinner bloqué...) au lieu de deviner.
 *
 * Best-effort ABSOLU : ne throw jamais, ne bloque rien, re-tente au prochain
 * événement si l'insert échoue (réseau mort au réveil = cas nominal ici).
 * À retirer une fois les bugs de réveil réglés.
 */

const DEVICE_KEY = 'wm-device-id'
function deviceId() {
  try {
    let id = localStorage.getItem(DEVICE_KEY)
    if (!id) {
      id = Math.random().toString(36).slice(2, 10)
      localStorage.setItem(DEVICE_KEY, id)
    }
    return id
  } catch {
    return 'unknown'
  }
}

let queue = []
let flushing = false

export function logEvent(event, data = {}) {
  try {
    queue.push({
      event,
      data: {
        ...data,
        v: APP_VERSION,
        path: typeof location !== 'undefined' ? location.pathname : '',
        vis: typeof document !== 'undefined' ? document.visibilityState : '',
        online: typeof navigator !== 'undefined' ? navigator.onLine : null,
        dev: deviceId(),
      },
    })
    // Cap dur : jamais plus de 40 événements en attente (anti-emballement)
    if (queue.length > 40) queue = queue.slice(-40)
    void flush()
  } catch { /* jamais bloquant */ }
}

async function flush() {
  if (flushing || queue.length === 0) return
  flushing = true
  const batch = queue
  queue = []
  try {
    const { error } = await supabase.from('client_logs').insert(batch)
    if (error) throw error
  } catch {
    // Réseau/RLS indisponible (typique au réveil) → on remet en file ET on
    // re-tente tout seul dans 3s (avant : le lot restait coincé jusqu'au
    // prochain logEvent, qui pouvait ne jamais venir → événements perdus).
    queue = [...batch, ...queue].slice(-40)
    setTimeout(() => { void flush() }, 3000)
  } finally {
    flushing = false
  }
}
