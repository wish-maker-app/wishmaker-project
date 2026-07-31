-- ===========================================================================
-- CORRECTIF DE SÉCURITÉ public.users — ÉTAPE 2/2
--
-- ⚠️  À N'APPLIQUER QU'UNE FOIS LE NOUVEAU FRONT DÉPLOYÉ EN PRODUCTION.
--
-- Cette étape retire au rôle `authenticated` la lecture des colonnes privées.
-- Le code AVANT correctif fait `select('*')` sur users : appliqué trop tôt,
-- ce script casserait le chargement du profil en production (« permission
-- denied for table users »). Le nouveau front passe par la RPC
-- get_my_profile() et ne lit que PUBLIC_USER_COLUMNS sur les autres
-- utilisateurs (src/lib/userProfile.js) : il fonctionne AVANT comme APRÈS
-- cette étape, ce qui permet de déployer d'abord, puis de verrouiller.
--
-- Objectif : après l'étape 1, `anon` n'a plus rien, mais un compte connecté
-- pouvait encore lire les 89 emails et les coordonnées GPS de tout le monde.
-- Comme l'inscription est ouverte et auto-confirmée (WM-AUTH-002), c'était à
-- peine mieux qu'un accès anonyme. C'est cette étape qui ferme réellement la
-- fuite de données personnelles.
--
-- Vérification après application : supabase/tests/rls_users_matrix.sql
-- ===========================================================================

revoke select on table public.users from anon;
revoke select on table public.users from authenticated;

-- Colonnes PUBLIQUES : strictement l'identité d'affichage effectivement lue
-- par l'UI sur les AUTRES utilisateurs (embeds `users!wisher_id(...)` des
-- vœux, messagerie, avis). Relevé exhaustif dans le code : aucun écran
-- n'affiche l'email, les coordonnées, la ville ni la langue d'autrui.
-- Doit rester alignée avec PUBLIC_USER_COLUMNS (src/lib/userProfile.js).
grant select (
  id, prenom, nom, pseudo, avatar_url,
  is_online, rating, rating_count, type_compte
) on table public.users to authenticated;

-- Restent PRIVÉES (lisibles seulement via get_my_profile() pour soi-même,
-- via les RPC admin_* pour la modération, et via service_role pour les
-- Edge Functions) :
--   email, latitude, longitude, quartier, code_postal,
--   is_admin, is_suspended, suspended_until, suspension_type, suspension_count,
--   wishes_quota, wishes_used, monthly_free_used, pack_slots, quota_reset_at,
--   email_consent, email_consent_at, cgu_accepted_at, cgu_version,
--   last_active_at, created_at, langue, ville, email_unsub_token
