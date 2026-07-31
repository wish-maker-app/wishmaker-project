-- ===========================================================================
-- BUCKETS STORAGE — retrait des policies de listing
--
-- Advisor Supabase `public_bucket_allows_listing`. Les buckets `avatars` et
-- `wish-images` sont publics (storage.buckets.public = true). Pour un bucket
-- public, la lecture d'un objet par son URL publique
-- (/object/public/<bucket>/<path>) ne consulte PAS la RLS de storage.objects.
--
-- Les policies SELECT larges posées sur le rôle `public` ne servaient donc
-- qu'à autoriser le LISTING : n'importe qui pouvait énumérer tous les
-- fichiers, donc tous les identifiants utilisateurs (les avatars sont rangés
-- dans un dossier par uuid) et tous les chemins d'images de vœux.
--
-- Vérifié côté code avant suppression : l'app ne construit ses URLs qu'avec
-- getPublicUrl() (useWishes.js, Profile/EditProfile.jsx,
-- CreateWish/EditWish.jsx, Setup/Profil.jsx) et n'appelle jamais .list() ni
-- .download(). L'affichage des images n'est pas affecté.
--
-- Rollback si besoin :
--   create policy avatars_public_read on storage.objects
--     for select using (bucket_id = 'avatars');
-- ===========================================================================

drop policy if exists "Avatars are publicly accessible" on storage.objects;
drop policy if exists "avatars_public_read"             on storage.objects;
drop policy if exists "wish_images_public_read"         on storage.objects;

-- Doublons hérités posés sur le rôle `public` (donc anon) alors que les
-- équivalents `authenticated` existaient déjà.
drop policy if exists "Users can upload their own avatar" on storage.objects;
drop policy if exists "Users can update their own avatar" on storage.objects;
drop policy if exists "Users can delete their own avatar" on storage.objects;

-- La suppression d'avatar n'avait pas d'équivalent `authenticated` : on le crée.
create policy avatars_auth_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
