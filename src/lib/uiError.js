/**
 * Traduit les erreurs techniques internes en messages utilisateur.
 *
 * NO_SESSION / *_TIMEOUT sont des codes internes (cf. lib/supabase.js) qui
 * signifient « la session/connexion se rétablit, réessaie » — ils ne doivent
 * JAMAIS s'afficher bruts dans un toast (retour client : « NO_SESSION » affiché
 * en voulant réaliser un vœu).
 */
const TECH_CODES = {
  NO_SESSION: 'Connexion en cours de rétablissement… réessaie dans quelques secondes.',
  QUERY_TIMEOUT: 'Réseau lent, réessaie.',
  SESSION_TIMEOUT: 'Connexion en cours de rétablissement… réessaie dans quelques secondes.',
  REFRESH_TIMEOUT: 'Connexion en cours de rétablissement… réessaie dans quelques secondes.',
}

export function errorMessage(err, fallback = 'Une erreur est survenue') {
  const m = err?.message || ''
  if (TECH_CODES[m]) return TECH_CODES[m]
  // Violation RLS (ex: compte suspendu qui tente d'écrire malgré les gardes
  // client) : le message PostgREST brut est incompréhensible pour l'utilisateur.
  if (/row-level security/i.test(m)) return 'Action non autorisée sur ce compte.'
  return m || fallback
}
