-- Trigger : crée automatiquement un profil dans public.users
-- quand un nouvel utilisateur s'inscrit dans auth.users
--
-- À exécuter dans Supabase Dashboard → SQL Editor

-- 1. Fonction trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.users (id, email, prenom, nom, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'prenom', NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'nom', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', NULL)
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    prenom = COALESCE(NULLIF(EXCLUDED.prenom, ''), public.users.prenom),
    nom = COALESCE(NULLIF(EXCLUDED.nom, ''), public.users.nom),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url);
  RETURN NEW;
END;
$$;

-- 2. Trigger sur auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. RLS policies pour public.users (remplace les existantes si besoin)
-- Permet à chaque user de lire tous les profils (pour voir les wishers/makers)
DROP POLICY IF EXISTS "Users can view all profiles" ON public.users;
CREATE POLICY "Users can view all profiles" ON public.users
  FOR SELECT USING (true);

-- Permet à chaque user de modifier SON profil uniquement
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- L'insert est géré par le trigger (SECURITY DEFINER), pas besoin de policy INSERT côté client
-- Mais on en ajoute une au cas où pour ne pas bloquer
DROP POLICY IF EXISTS "Users can insert own profile" ON public.users;
CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);
