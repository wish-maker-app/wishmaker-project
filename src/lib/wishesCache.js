/**
 * Cache module-level pour les listes de vœux.
 *
 * Pourquoi : éviter "l'écran blanc" quand l'user navigue ailleurs et revient
 * sur Maker Home / Wisher Home. Sans cache, le composant remount → state
 * = [] → fetch en cours → rien n'est affiché. Si le fetch rate, ça reste vide.
 *
 * Avec cache : on affiche immédiatement les wishes connus pendant que le
 * refetch se fait en arrière-plan. Si le refetch rate, on garde les anciennes
 * data + on toast l'erreur. UX comme React Query / SWR mais en 30 lignes.
 *
 * Le cache vit en mémoire JS — perdu si l'user reload la page (c'est OK).
 */

const cache = new Map()

export function getCached(key) {
  return cache.get(key) || null
}

export function setCached(key, value) {
  cache.set(key, { value, ts: Date.now() })
}

export function getCachedFresh(key, maxAgeMs = 5 * 60 * 1000) {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.ts > maxAgeMs) return null
  return entry.value
}

export function clearWishesCache() {
  cache.clear()
}
