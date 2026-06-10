import { supabase, ensureFreshSession } from './supabase'

/**
 * Souscription realtime AUTO-RÉPARANTE.
 *
 * Pourquoi : les canaux realtime mouraient définitivement quand la PWA passait
 * en arrière-plan (l'OS tue le websocket, le serveur ferme les canaux au JWT
 * expiré). Sémantique realtime-js 2.99 vérifiée :
 *  - CLOSED subi = TERMINAL : la lib retire le canal de socket.channels et ne
 *    le rejoint JAMAIS seule. Re-subscribe sur le même objet est cassé (les
 *    réponses ne sont plus routées) → il FAUT recréer via supabase.channel().
 *  - CHANNEL_ERROR / TIMED_OUT = transitoires : la lib re-joint déjà toute
 *    seule avec backoff (1/2/5/10 s) tant que le canal n'est pas CLOSED.
 *  - setAuth(mêmeToken) est un no-op ; l'app est en mode « manual token » →
 *    le join payload n'est rafraîchi QUE par un setAuth(token) explicite.
 *  - unsubscribe() d'un canal joined sur un socket ZOMBIE (TCP mort sans close
 *    frame) laisse le canal en state 'leaving' DANS la liste jusqu'au timeout
 *    du leave (10 s) — et supabase.channel(topic) DÉDUPLIQUE par topic : il
 *    rendrait ce zombie, sur lequel subscribe() est un no-op silencieux.
 *
 * Stratégie :
 *  - CLOSED non volontaire → recréation (token frais + canal neuf) avec backoff.
 *  - CHANNEL_ERROR/TIMED_OUT → on laisse la lib réparer, mais un watchdog
 *    recrée tout si le canal n'est pas revenu 'joined' en 15 s.
 *  - Retour au premier plan (visibilitychange / pageshow / focus) → recréation
 *    si le canal n'est pas 'joined', ou proactivement après un long gel
 *    (l'état 'joined' peut être un zombie : socket TCP mort sans aucun
 *    événement délivré → realtime mort ~50 s sinon, le temps du heartbeat).
 *  - À chaque RE-jointe réussie → onResubscribed() (refetch de rattrapage :
 *    le realtime ne rejoue pas les événements manqués pendant le trou).
 *
 * Usage :
 *   const sub = subscribeResilient({
 *     topic: 'mon-canal',
 *     build: (ch) => ch.on('postgres_changes', {...}, handler),
 *     onResubscribed: () => refetch(),
 *   })
 *   // cleanup : sub.dispose()
 */

const RETRY_DELAYS = [1000, 2000, 5000, 10000, 30000]
const LONG_HIDE_MS = 5 * 60 * 1000 // gel > 5 min → canal considéré zombie
const WATCHDOG_MS = 15000 // erreurs persistantes au-delà → recréation complète

export function subscribeResilient({ topic, build, onResubscribed, label = topic }) {
  let channel = null
  let disposed = false
  let recreating = false
  let retryIdx = 0
  let retryTimer = null
  let watchdogTimer = null
  let joinCount = 0
  let hiddenAt = null

  const dbg = (...a) => { if (import.meta.env.DEV) console.log(`[rt:${label}]`, ...a) }

  function clearTimers() {
    if (retryTimer) { clearTimeout(retryTimer); retryTimer = null }
    if (watchdogTimer) { clearTimeout(watchdogTimer); watchdogTimer = null }
  }

  // Purge l'ancien canal SANS attendre l'ack du leave : unsubscribe() envoie le
  // phx_leave (auto-acquitté si socket mort), puis _remove() le retire
  // IMMÉDIATEMENT de la liste client — la lib ne le fait qu'à l'ack/timeout du
  // leave (jusqu'à 10 s sur socket zombie), pendant lesquels channel(topic)
  // dédupliquerait sur ce zombie. _remove est interne mais vérifié en 2.99.2
  // (c'est exactement ce que la lib appelle au close) ; le `?.` + la garde
  // anti-zombie de create() couvrent une éventuelle disparition future.
  function purgeChannel() {
    const old = channel
    channel = null
    if (!old) return
    try { old.unsubscribe() } catch { /* déjà mort */ }
    try { supabase.realtime._remove?.(old) } catch { /* API interne, best-effort */ }
  }

  // Recréation complète : purge, token frais dans le join payload, canal NEUF,
  // re-attache les .on(), subscribe.
  async function recreate(reason) {
    if (disposed || recreating) return
    recreating = true
    clearTimers()
    dbg('recreate:', reason)
    try {
      purgeChannel()
      try {
        const session = await ensureFreshSession()
        if (!disposed && session?.access_token) await supabase.realtime.setAuth(session.access_token)
      } catch { /* best-effort : la lib re-joindra avec l'ancien payload */ }
      if (disposed) return
      create()
    } finally {
      recreating = false
    }
  }

  function scheduleRecreate(reason) {
    if (disposed || retryTimer) return
    const delay = RETRY_DELAYS[Math.min(retryIdx, RETRY_DELAYS.length - 1)]
    retryIdx++
    retryTimer = setTimeout(() => {
      retryTimer = null
      // Caché → inutile de recréer maintenant (le socket remourra) ; le retour
      // au premier plan déclenchera la recréation.
      if (document.visibilityState !== 'visible') return
      recreate(reason)
    }, delay)
  }

  function create() {
    if (disposed) return
    const ch = supabase.channel(topic)
    // Garde anti-zombie : si la dédup par topic a rendu un canal recyclé pas
    // encore retiré (state 'leaving' / déjà joint), subscribe() serait un
    // no-op silencieux → on retente après backoff (le leave finit par tomber).
    if (ch.joinedOnce || ch.state === 'leaving') {
      dbg('canal zombie récupéré par la dédup topic, retry')
      scheduleRecreate('zombie leaving')
      return
    }
    channel = ch
    build(ch)
    ch.subscribe((status) => {
      // ch !== channel : statut d'un canal REMPLACÉ (le CLOSED déclenché en
      // synchrone par notre propre purge arrivait ici avec disposed=false et
      // armait des recréations parasites en boucle).
      if (disposed || ch !== channel) return
      dbg(status)
      if (status === 'SUBSCRIBED') {
        retryIdx = 0
        clearTimers()
        joinCount++
        // Rattrapage UNIQUEMENT sur les re-jointes (au 1er join la page vient
        // de fetcher ses données, inutile de refetcher).
        if (joinCount > 1) { try { onResubscribed?.() } catch { /* refetch best-effort */ } }
      } else if (status === 'CLOSED') {
        // Fermeture SUBIE (les fermetures volontaires sont filtrées par
        // disposed / ch !== channel). Canal retiré de la liste par la lib →
        // ne reviendra jamais seul.
        scheduleRecreate('CLOSED subi (serveur)')
      } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        // Transitoire : la lib re-joint déjà avec backoff. On arme UNE fois un
        // watchdog (sans le repousser à chaque erreur, sinon il ne tire jamais) :
        // si toujours pas 'joined' dans 15 s → recréation avec token frais.
        if (!watchdogTimer) {
          watchdogTimer = setTimeout(() => {
            watchdogTimer = null
            if (disposed) return
            if (channel?.state !== 'joined' && document.visibilityState === 'visible') {
              recreate('watchdog: erreurs persistantes')
            }
          }, WATCHDOG_MS)
        }
      }
    })
  }

  function checkAlive(source) {
    if (disposed) return
    const longHide = hiddenAt !== null && Date.now() - hiddenAt > LONG_HIDE_MS
    hiddenAt = null
    if (!channel || channel.state !== 'joined' || longHide) {
      retryIdx = 0
      recreate(longHide ? `${source}: long gel` : `${source}: canal pas joined`)
    }
  }

  function onVisibility() {
    if (document.visibilityState === 'hidden') { hiddenAt = Date.now(); return }
    checkAlive('visible')
  }
  // iOS Safari/PWA : restauration depuis le bfcache → pageshow(persisted) sans
  // forcément de visibilitychange.
  function onPageshow(e) { if (e.persisted) checkAlive('pageshow') }
  // Desktop : bascule d'app sans changer la visibilité de l'onglet → seul
  // window focus est émis (même raison que le handler focus de useAuth).
  function onFocus() { checkAlive('focus') }

  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pageshow', onPageshow)
  window.addEventListener('focus', onFocus)

  // Création initiale via recreate() : garantit un token frais dans le join
  // payload même si la souscription part avant le setAuth global de useAuth.
  recreate('initial')

  return {
    dispose() {
      disposed = true
      clearTimers()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('pageshow', onPageshow)
      window.removeEventListener('focus', onFocus)
      // removeChannel (et pas purgeChannel) : gère aussi la déconnexion du
      // socket si c'était le dernier canal de l'app.
      if (channel) { try { supabase.removeChannel(channel) } catch { /* déjà mort */ } channel = null }
    },
  }
}
