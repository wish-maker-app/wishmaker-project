import { supabase, withTimeout } from './supabase'

// ───────────────────────────────────────────────────────────────────────────
// Accès au profil utilisateur — public vs privé
// ───────────────────────────────────────────────────────────────────────────
// Depuis le correctif de sécurité (supabase/security_users_rls_v2.sql), la
// table public.users n'accorde au rôle `authenticated` qu'un SELECT sur les
// colonnes d'identité d'affichage. Un `select('*')` est refusé par PostgreSQL
// (« permission denied for table users ») : les privilèges de colonnes sont
// globaux au rôle, ils ne distinguent pas « ma ligne » de celle d'un autre.
//
// Conséquence pratique :
//   • lire les AUTRES utilisateurs  → PUBLIC_USER_COLUMNS, en direct sur la table
//   • lire SES PROPRES données      → fetchMyProfile() (RPC SECURITY DEFINER)
//
// Ne jamais réintroduire de `select('*')` sur users : ça casserait en prod
// dès que l'étape 2 des privilèges est appliquée.

// Colonnes lisibles sur N'IMPORTE QUEL utilisateur. Doit rester strictement
// alignée avec le GRANT SELECT de supabase/security_users_columns_v2.sql.
export const PUBLIC_USER_COLUMNS =
  'id, prenom, nom, pseudo, avatar_url, is_online, rating, rating_count, type_compte'

/**
 * Retourne la ligne COMPLÈTE du profil de l'utilisateur connecté (colonnes
 * privées incluses : email, quotas, consentements, état de suspension,
 * is_admin, coordonnées). Passe par la RPC get_my_profile(), qui filtre
 * elle-même sur auth.uid() — il n'y a donc aucun moyen de lire le profil
 * complet de quelqu'un d'autre.
 *
 * @returns {Promise<object|null>} le profil, ou null si pas de session.
 */
export async function fetchMyProfile() {
  const { data, error } = await withTimeout(
    supabase.rpc('get_my_profile').maybeSingle()
  )
  if (error) throw error
  return data || null
}
