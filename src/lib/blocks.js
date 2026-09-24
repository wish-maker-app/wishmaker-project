import { supabase } from './supabase'

// Petit cache mémoire (30s) pour éviter de refetcher les IDs bloqués à chaque
// rendu de liste. Invalidé après un block/unblock.
let cache = { ids: null, ts: 0 }
const TTL = 30000

/**
 * Ensemble des IDs bloqués dans les DEUX sens (utilisateurs que j'ai bloqués
 * OU qui m'ont bloqué) → sert à masquer leurs vœux et conversations.
 */
export async function getBlockedIds(force = false) {
  if (!force && cache.ids && Date.now() - cache.ts < TTL) return cache.ids
  try {
    const { data, error } = await supabase.rpc('get_blocked_ids')
    if (error) throw error
    const ids = new Set((data || []).map(String))
    cache = { ids, ts: Date.now() }
    return ids
  } catch {
    return cache.ids || new Set()
  }
}

export function invalidateBlocksCache() { cache = { ids: null, ts: 0 } }

/** Bloquer un utilisateur. */
export async function blockUser(blockedId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('no-session')
  const { error } = await supabase
    .from('blocked_users')
    .insert({ blocker_id: user.id, blocked_id: blockedId })
  // Doublon (déjà bloqué) → on ignore
  if (error && !/duplicate|unique/i.test(error.message || '')) throw error
  invalidateBlocksCache()
}

/** Débloquer un utilisateur. */
export async function unblockUser(blockedId) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('no-session')
  const { error } = await supabase
    .from('blocked_users')
    .delete()
    .eq('blocker_id', user.id)
    .eq('blocked_id', blockedId)
  if (error) throw error
  invalidateBlocksCache()
}

/** Liste des profils que J'AI bloqués (pour l'écran « Utilisateurs bloqués »). */
export async function getMyBlockedList() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []
  const { data, error } = await supabase
    .from('blocked_users')
    .select('blocked_id, created_at, blocked:users!blocked_id(id, prenom, nom, pseudo, avatar_url)')
    .eq('blocker_id', user.id)
    .order('created_at', { ascending: false })
  if (error) return []
  return (data || []).map((r) => ({ id: r.blocked_id, created_at: r.created_at, profile: r.blocked }))
}
