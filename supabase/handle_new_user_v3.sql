-- ===========================================================================
-- Trigger handle_new_user V3 — persiste le consentement CGU/emails
--
-- Nouveauté vs V2 : le consentement (CGU/CGV/Privacy + emails) est désormais
-- transmis dans raw_user_meta_data au signUp et écrit ICI, côté serveur, par
-- le trigger SECURITY DEFINER. Avantages :
--   • marche même sans session (flux « confirmation email » activé, où signUp
--     ne renvoie pas de session) → l'écriture client (users.update) devenait
--     impossible ;
--   • retire une écriture client sur public.users (durcissement) ;
--   • horodatage posé par le serveur (now()), pas par le client.
--
-- Compatible avec l'ancien flux (métadonnées absentes → colonnes laissées NULL).
-- ===========================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_meta          jsonb := NEW.raw_user_meta_data;
  v_prenom        text;
  v_nom           text;
  v_avatar        text;
  v_cgu_ok        boolean := (v_meta->>'cgu_accepted' = 'true');
  v_email_consent boolean := (v_meta->>'email_consent' = 'true');
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

  INSERT INTO public.users (
    id, email, prenom, nom, pseudo, type_compte, avatar_url,
    cgu_accepted_at, cgu_version, email_consent, email_consent_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    v_prenom,
    v_nom,
    NULLIF(v_meta->>'pseudo', ''),
    COALESCE(NULLIF(v_meta->>'type_compte', ''), 'particulier'),
    v_avatar,
    CASE WHEN v_cgu_ok THEN now() END,
    NULLIF(v_meta->>'cgu_version', ''),
    v_email_consent,
    CASE WHEN v_email_consent THEN now() END
  )
  ON CONFLICT (id) DO UPDATE SET
    -- On NE écrase PAS les champs déjà renseignés en BDD (cas edge : login second OAuth)
    email            = EXCLUDED.email,
    prenom           = COALESCE(public.users.prenom, EXCLUDED.prenom),
    nom              = COALESCE(public.users.nom, EXCLUDED.nom),
    pseudo           = COALESCE(public.users.pseudo, EXCLUDED.pseudo),
    avatar_url       = COALESCE(public.users.avatar_url, EXCLUDED.avatar_url),
    -- Consentement : on garde la 1re acceptation enregistrée (ne pas réécraser)
    cgu_accepted_at  = COALESCE(public.users.cgu_accepted_at, EXCLUDED.cgu_accepted_at),
    cgu_version      = COALESCE(public.users.cgu_version, EXCLUDED.cgu_version),
    email_consent    = COALESCE(public.users.email_consent, EXCLUDED.email_consent),
    email_consent_at = COALESCE(public.users.email_consent_at, EXCLUDED.email_consent_at);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
