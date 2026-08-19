-- ===========================================================================
-- FIX régression : upload d'avatar cassé ("new row violates RLS")
--
-- Cause : security_storage_buckets.sql a retiré TOUTE policy SELECT sur le
-- bucket `avatars` (pour bloquer le listing/énumération des uuid). Or l'upload
-- d'avatar utilise `upsert: true` (EditProfile.jsx / Setup/Profil.jsx), et un
-- upsert Supabase Storage EXIGE une policy SELECT (résolution du conflit
-- "l'objet existe déjà → remplacer"). Sans elle → échec RLS à chaque upload.
--
-- Correctif : on restaure une policy SELECT MAIS scopée au dossier de
-- l'utilisateur (avatars/<uid>/*). L'upsert de SON avatar fonctionne, mais
-- l'énumération des fichiers des AUTRES reste impossible (la faille d'origine
-- `using (bucket_id='avatars')` — sans restriction de dossier — n'est PAS
-- réintroduite). L'affichage public via getPublicUrl() n'est pas concerné
-- (un bucket public sert les objets sans consulter la RLS).
-- ===========================================================================

DROP POLICY IF EXISTS avatars_auth_select_own ON storage.objects;
CREATE POLICY avatars_auth_select_own ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = (SELECT auth.uid())::text
  );
