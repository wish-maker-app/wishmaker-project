import { supabase, ensureFreshSession } from './supabase'

/**
 * Sonde « non-lus » SINGLETON, partagée par toute l'app (pastille de
 * useNotifications + déclencheur de refetch de l'Inbox).
 *
 * Pourquoi : le Realtime messages a des trous (canaux recréés ~160x/jour en
 * arrière-plan PWA + ~1 réveil sur 5 qui ne récupère pas la session). Sans
 * filet, un message arrivé pendant un trou n'apparaît qu'au changement de page.
 * On avait mis 2 polls séparés (10s pastille + 12s Inbox à 4 jointures) :
 * lourds, lents et redondants.
 *
 * Ici : UNE seule requête RPC `unread_probe()` (bornée à auth.uid(), ~0,16 ms,
 * 1 aller-retour) par tick, partagée par tous les abonnés. Elle sert de
 * DÉCLENCHEUR : si le compteur non-lus change ou qu'un message plus récent
 * apparaît, les abonnés rafraîchissent leur vraie source de vérité.
 *
 * Cadence ADAPTATIVE : 10 s quand le Realtime a l'air sain, 3 s pendant 20 s
 * après un « nudge » (signal que le Realtime est suspect : event reçu, canal
 * recréé, ou la sonde elle-même a vu du neuf que le Realtime avait raté).
 * Suspendue quand l'app est cachée. Jitter pour ne pas synchroniser les pics au
 * réveil de masse.
 */

const BASE_MS = 10000
const FAST_MS = 3000
const FAST_WINDOW_MS = 20000

let timer = null
let running = false
let inFlight = false
let fastUntil = 0
let userId = null
let last = { unread: 0, last_msg_at: null }
const subs = new Set()

const isVisible = () => typeof document === 'undefined' || document.visibilityState === 'visible'
// ±30 % de jitter sur l'intervalle pour désynchroniser les clients.
const jitter = (ms) => Math.round(ms * (0.7 + Math.random() * 0.6))
const interval = () => (Date.now() < fastUntil ? FAST_MS : BASE_MS)

async function probe() {
  if (inFlight || !isVisible()) return
  inFlight = true
  try {
    // Session valide obligatoire : sans elle, ne JAMAIS poser un faux 0
    // (la pastille s'effacerait à tort). On retentera au prochain tick.
    const session = await ensureFreshSession()
    if (!session) return
    const { data, error } = await supabase.rpc('unread_probe')
    if (error) return
    const row = Array.isArray(data) ? data[0] : data
    if (!row) return

    const prev = last
    last = { unread: row.unread ?? 0, last_msg_at: row.last_msg_at ?? null }

    const increased = last.unread > prev.unread
    const newer = !!last.last_msg_at &&
      (!prev.last_msg_at || new Date(last.last_msg_at) > new Date(prev.last_msg_at))
    // La sonde a vu du neuf → le Realtime l'a peut-être raté → on passe en
    // cadence rapide pour rattraper vite (auto-réparation du « 50/50 »).
    if (increased || newer) fastUntil = Date.now() + FAST_WINDOW_MS

    for (const cb of subs) {
      try { cb(last, prev) } catch { /* abonné best-effort */ }
    }
  } catch { /* réseau/timeout : on retentera */ } finally {
    inFlight = false
  }
}

function loop() {
  if (!running) return
  timer = setTimeout(async () => {
    await probe() // probe() ne fait rien si caché → on garde juste le rythme
    loop()
  }, jitter(interval()))
}

function start() {
  if (running || subs.size === 0) return
  running = true
  // 1re sonde immédiate (légèrement jitterée) puis boucle.
  setTimeout(() => { probe().finally(loop) }, Math.round(Math.random() * 400))
}

function stop() {
  running = false
  if (timer) { clearTimeout(timer); timer = null }
}

function onVisibility() {
  // Au retour au premier plan : sonde immédiate jitterée (la boucle continue).
  if (isVisible() && running) {
    setTimeout(() => { probe() }, Math.round(Math.random() * 400))
  }
}
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', onVisibility)
}

export const realtimeProbe = {
  // À appeler quand on soupçonne que le Realtime est en retard/suspect (event
  // reçu, canal recréé, ouverture de conversation) : cadence rapide + sonde tout
  // de suite.
  nudge() {
    fastUntil = Date.now() + FAST_WINDOW_MS
    if (running) probe()
  },
  // cb({unread, last_msg_at}, prev). Renvoie une fonction de désabonnement.
  subscribe(cb) {
    subs.add(cb)
    start()
    // Pousse immédiatement la dernière valeur connue (évite d'attendre 1 tick).
    if (last.last_msg_at !== null || last.unread > 0) {
      try { cb(last, last) } catch { /* best-effort */ }
    }
    return () => {
      subs.delete(cb)
      if (subs.size === 0) stop()
    }
  },
  // Reset à la connexion/déconnexion (évite de garder le compteur d'un autre user).
  setUser(id) {
    if (id === userId) return
    userId = id
    last = { unread: 0, last_msg_at: null }
    fastUntil = 0
  },
  get current() { return last },
}
