const KEY = 'post_auth_redirect'

/**
 * Mémorise une destination INTERNE à rejoindre après inscription/connexion
 * (ex. un vœu partagé ouvert sans compte via /w/:id).
 */
export function setPostAuthRedirect(path) {
  try { if (path) localStorage.setItem(KEY, path) } catch { /* ignore */ }
}

/**
 * Lit ET efface la destination mémorisée (one-shot : on n'y revient qu'une
 * fois, pas aux visites suivantes). Renvoie `fallback` si rien de valide.
 * Garde anti-open-redirect : uniquement un chemin interne (un seul '/').
 */
export function consumePostAuthRedirect(fallback = '/maker') {
  try {
    const v = localStorage.getItem(KEY)
    localStorage.removeItem(KEY)
    if (v && /^\/(?!\/)/.test(v)) return v
  } catch { /* ignore */ }
  return fallback
}
