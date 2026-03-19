-- Storage : bucket "avatars" pour les photos de profil
-- À exécuter dans Supabase Dashboard → SQL Editor

-- 1. Créer le bucket (public pour que les URLs soient accessibles)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Policy : tout le monde peut VOIR les avatars (bucket public)
DROP POLICY IF EXISTS "Avatars are publicly accessible" ON storage.objects;
CREATE POLICY "Avatars are publicly accessible" ON storage.objects
  FOR SELECT USING (bucket_id = 'avatars');

-- 3. Policy : un user peut UPLOAD dans son propre dossier (avatars/{user_id}/*)
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 4. Policy : un user peut REMPLACER son avatar (upsert)
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- 5. Policy : un user peut SUPPRIMER son avatar
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;
CREATE POLICY "Users can delete their own avatar" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
