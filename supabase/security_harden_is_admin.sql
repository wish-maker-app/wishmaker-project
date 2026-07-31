-- ===========================================================================
-- DURCISSEMENT DE public.is_admin()
--
-- Défaut trouvé en écrivant la matrice de test RLS. La fonction était :
--
--   CREATE FUNCTION public.is_admin(user_id uuid) RETURNS boolean
--     LANGUAGE sql STABLE SECURITY DEFINER          -- pas de SET search_path
--   AS $$ SELECT COALESCE((SELECT is_admin FROM users WHERE id = user_id), false) $$;
--                                            ^^^^^ table non qualifiée
--
-- Deux problèmes :
--
-- 1. Fonctionnel — `users` étant non qualifiée et le search_path non figé, la
--    fonction résolvait la table selon le search_path de l'APPELANT. Appelée
--    depuis une fonction posant `search_path = ''` (recommandation Supabase,
--    suivie par admin_list_suspended_users), elle échouait sur
--    « relation "users" does not exist » — donc toute la modération.
--
-- 2. Sécurité — une fonction SECURITY DEFINER dont la résolution de noms
--    dépend de l'appelant est le schéma classique du search_path hijacking :
--    un rôle capable de poser son propre search_path peut faire pointer
--    `users` vers une table qu'il contrôle et faire renvoyer true à la
--    fonction, qui garde admin_suspend_user, admin_delete_wish,
--    get_admin_stats et les policies admin de messages / transactions.
--
-- Correctif : search_path figé à vide + référence pleinement qualifiée.
-- Signature et sémantique inchangées : les policies existantes qui appellent
-- is_admin() continuent de fonctionner sans modification.
-- ===========================================================================

create or replace function public.is_admin(user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((select u.is_admin from public.users u where u.id = user_id), false)
$$;
