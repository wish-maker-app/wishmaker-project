-- ===========================================================================
-- CORRECTIF DE SÉCURITÉ public.users — ÉTAPE 1/2 (applicable immédiatement)
--
-- Cette étape ferme les deux failles critiques SANS aucune dépendance au
-- front : le code actuellement en production continue de fonctionner tel quel.
-- La restriction de LECTURE des colonnes privées est dans l'étape 2
-- (security_users_columns_v2.sql), à lancer une fois le nouveau front déployé.
--
-- Contexte — deux failles confirmées sur le projet livxniiktxtexlwadqfi :
--
-- 1. WM-SUPA-001 (audit externe du 31/07/2026) — la policy
--    « Users can view all profiles » était posée sur le rôle `public`, qui
--    en PostgreSQL englobe `anon`. Résultat : la clé anon du bundle
--    permettait un SELECT sur les 89 profils (emails, GPS, jetons de
--    désinscription, drapeau is_admin). RLS était bien ACTIVÉE — c'est la
--    policy qui était trop permissive. Vérifié en base en rôle anon :
--    89 lignes, 89 emails, 89 jetons, 4 admins identifiables.
--
-- 2. Élévation de privilège (NON détectée par l'audit) — les policies UPDATE
--    ne contrôlaient que la LIGNE (auth.uid() = id), jamais les COLONNES, et
--    UPDATE était accordé sur toutes les colonnes à `authenticated`. Aucun
--    trigger sur la table. Donc :
--
--        PATCH /rest/v1/users?id=eq.<son_id>   {"is_admin": true}
--
--    réussissait pour n'importe quel compte connecté. Comme is_admin() est
--    SECURITY DEFINER et lit cette colonne, cela ouvrait admin_suspend_user,
--    admin_delete_wish, get_admin_stats, la lecture de TOUTES les
--    conversations et de toutes les transactions. Même mécanisme pour
--    wishes_quota / pack_slots (vœux payants) et is_suspended (auto-levée
--    de sanction). L'audit a conclu « élévation non observée » parce que le
--    testeur avait modifié is_admin dans l'état client via F12 — sans effet —
--    sans tester le PATCH direct sur l'API.
--
-- Les Edge Functions utilisent service_role : elles ne sont pas affectées.
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1. Policies : plus rien pour le rôle `public` (donc plus rien pour anon)
-- ---------------------------------------------------------------------------
drop policy if exists "Users can view all profiles"  on public.users;
drop policy if exists "Users can insert own profile" on public.users;
drop policy if exists "Users can update own profile" on public.users;
drop policy if exists users_select_all  on public.users;
drop policy if exists users_insert_own  on public.users;
drop policy if exists users_update_own  on public.users;

-- Lecture de toutes les LIGNES par les comptes connectés : nécessaire aux
-- embeds PostgREST `users!wisher_id(...)` (nom + avatar de l'auteur d'un vœu).
-- Ce sont les privilèges de COLONNES (étape 2) qui borneront ce qui est lisible.
create policy users_select_all on public.users
  for select to authenticated
  using (true);

create policy users_insert_own on public.users
  for insert to authenticated
  with check ((select auth.uid()) = id);

-- WITH CHECK explicite : interdit de réattribuer sa ligne à un autre id.
create policy users_update_own on public.users
  for update to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ---------------------------------------------------------------------------
-- 2. Privilèges d'ÉCRITURE par colonne — ferme l'élévation de privilège
-- ---------------------------------------------------------------------------
-- Supabase accorde par défaut TOUS les privilèges sur TOUTES les colonnes à
-- anon et authenticated : c'est ce qui rendait is_admin modifiable au PATCH.
-- On ne touche PAS au SELECT ici (étape 2) pour ne rien casser en production.
revoke insert, update, delete, truncate, references on table public.users from anon;
revoke insert, update, delete, truncate, references on table public.users from authenticated;

-- Colonnes MODIFIABLES par leur propriétaire : relevé exhaustif des payloads
-- .update() du front (EditProfile, Setup/*, Register, Login, useAuth, Profile).
-- Tout le reste — is_admin, is_suspended, suspended_until, suspension_type,
-- suspension_count, wishes_quota, wishes_used, monthly_free_used, pack_slots,
-- quota_reset_at, rating, rating_count, email, email_unsub_token, id,
-- created_at — n'est plus modifiable depuis le navigateur, sous aucun rôle
-- client. Ces colonnes restent pilotées par les triggers, les RPC
-- SECURITY DEFINER et les Edge Functions (service_role).
grant update (
  prenom, nom, pseudo, type_compte,
  ville, quartier, code_postal, latitude, longitude, langue,
  onboarding_completed, avatar_url, is_online, last_active_at,
  email_consent, email_consent_at, cgu_accepted_at, cgu_version
) on table public.users to authenticated;

-- INSERT : uniquement le filet de sécurité de useAuth.fetchProfile quand le
-- trigger handle_new_user n'a pas encore créé la ligne (course au 1er login
-- OAuth). `email` est volontairement exclu — il vient de auth.users via le
-- trigger, le client n'a pas à le fournir.
grant insert (
  id, prenom, nom, pseudo, type_compte, avatar_url
) on table public.users to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Accès à SES PROPRES données privées
-- ---------------------------------------------------------------------------
-- Les privilèges de colonnes sont globaux au rôle : ils ne savent pas
-- distinguer « ma ligne » de « la ligne d'un autre ». Après l'étape 2, un
-- select('*') sur users sera donc refusé. Cette RPC rend à l'utilisateur sa
-- ligne COMPLÈTE — et uniquement la sienne. Créée dès maintenant pour que le
-- front puisse l'utiliser AVANT que l'étape 2 ne soit appliquée.
create or replace function public.get_my_profile()
returns setof public.users
language sql
stable
security definer
set search_path = ''
as $$
  select * from public.users where id = (select auth.uid())
$$;

revoke all on function public.get_my_profile() from public;
grant execute on function public.get_my_profile() to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Accès admin aux données privées d'autrui (modération)
-- ---------------------------------------------------------------------------
-- Même raison : un admin reste le rôle `authenticated`, donc les privilèges
-- de colonnes s'appliqueront aussi à lui. La garde is_admin() est portée par
-- la fonction, comme les admin_* existantes.
create or replace function public.admin_list_suspended_users()
returns setof public.users
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin((select auth.uid())) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query select * from public.users where is_suspended = true;
end;
$$;

revoke all on function public.admin_list_suspended_users() from public;
grant execute on function public.admin_list_suspended_users() to authenticated;

-- Utilisé par l'onglet Signalements pour le badge « suspendu » : renvoie
-- seulement des identifiants, pas de données personnelles.
create or replace function public.admin_suspended_user_ids()
returns setof uuid
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin((select auth.uid())) then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  return query select id from public.users where is_suspended = true;
end;
$$;

revoke all on function public.admin_suspended_user_ids() from public;
grant execute on function public.admin_suspended_user_ids() to authenticated;
