-- ===========================================================================
-- Trigger handle_new_user V2 — gère proprement Google OAuth (given_name/family_name)
-- + Apple OAuth (plus tard) + email/password
--
-- Philosophie: on NE force PAS le profil complet au signup. Le minimum est
-- créé (prénom + nom + email + avatar si dispo), le reste (pseudo, ville,
-- type_compte) est renseigné dans le tunnel /setup/*.
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_meta   jsonb := NEW.raw_user_meta_data;
  v_prenom text;
  v_nom    text;
  v_avatar text;
BEGIN
  -- PRÉNOM : priorité flow email > Google given_name > 1er mot de full_name
  v_prenom := COALESCE(
    NULLIF(v_meta->>'prenom', ''),
    NULLIF(v_meta->>'given_name', ''),
    NULLIF(split_part(v_meta->>'full_name', ' ', 1), ''),
    NULLIF(split_part(v_meta->>'name', ' ', 1), '')
  );

  -- NOM : priorité flow email > Google family_name > reste de full_name après le 1er mot
  v_nom := COALESCE(
    NULLIF(v_meta->>'nom', ''),
    NULLIF(v_meta->>'family_name', ''),
    NULLIF(
      TRIM(SUBSTRING(v_meta->>'full_name' FROM POSITION(' ' IN v_meta->>'full_name') + 1)),
      ''
    ),
    NULLIF(
      TRIM(SUBSTRING(v_meta->>'name' FROM POSITION(' ' IN v_meta->>'name') + 1)),
      ''
    )
  );

  -- AVATAR : flow email > Google picture (OAuth)
  v_avatar := COALESCE(
    NULLIF(v_meta->>'avatar_url', ''),
    NULLIF(v_meta->>'picture', '')
  );

  INSERT INTO public.users (id, email, prenom, nom, pseudo, type_compte, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    v_prenom,
    v_nom,
    NULLIF(v_meta->>'pseudo', ''),
    COALESCE(NULLIF(v_meta->>'type_compte', ''), 'particulier'),
    v_avatar
  )
  ON CONFLICT (id) DO UPDATE SET
    -- On NE écrase PAS les champs déjà renseignés en BDD (cas edge : login second OAuth)
    email       = EXCLUDED.email,
    prenom      = COALESCE(public.users.prenom, EXCLUDED.prenom),
    nom         = COALESCE(public.users.nom, EXCLUDED.nom),
    pseudo      = COALESCE(public.users.pseudo, EXCLUDED.pseudo),
    avatar_url  = COALESCE(public.users.avatar_url, EXCLUDED.avatar_url);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
