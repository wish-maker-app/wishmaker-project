/**
 * Suspension ACTIVE = définitive, sans date de fin, ou date de fin future.
 * Doit rester aligné avec public.is_currently_suspended() côté BDD (la RLS
 * est la vraie barrière ; ici c'est l'UX : écran dédié au lieu d'erreurs).
 */
export function isSuspendedActive(profile) {
  if (!profile?.is_suspended) return false
  if (profile.suspension_type === 'definitive') return true
  if (!profile.suspended_until) return true
  return new Date(profile.suspended_until) > new Date()
}
