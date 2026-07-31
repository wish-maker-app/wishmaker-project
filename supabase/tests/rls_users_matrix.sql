-- ===========================================================================
-- MATRICE DE TEST RLS — public.users
--
-- Reprend la « matrice de test minimale » exigée par le rapport d'audit
-- (page 8) et y ajoute les cas d'élévation de privilège que l'audit avait
-- manqués.
--
-- Exécution : coller dans le SQL Editor Supabase, ou via l'outil MCP
-- execute_sql. Le script simule les rôles avec SET LOCAL ROLE +
-- request.jwt.claims.
--
-- ⚠️  Le script se termine TOUJOURS par un RAISE EXCEPTION : c'est
-- volontaire. Cela force le ROLLBACK de la transaction (les tests d'écriture
-- ne laissent donc AUCUNE trace) et affiche le rapport dans le message
-- d'erreur. Un « ERROR: RAPPORT RLS » n'est pas un échec du script.
--
-- Attendu une fois les étapes 1 ET 2 appliquées : tous les tests en OK.
-- Avant l'étape 2 (security_users_columns_v2.sql), les tests 4, 5 et 12
-- ressortent en ECHEC : c'est le comportement attendu, ils se ferment avec
-- cette étape.
-- ===========================================================================

do $$
declare
  v_a uuid; v_b uuid; v_admin uuid;
  r   text := '';
  n   int;
begin
  select id into v_a     from public.users where is_admin = false order by created_at limit 1;
  select id into v_b     from public.users where is_admin = false and id <> v_a order by created_at limit 1;
  select id into v_admin from public.users where is_admin = true  limit 1;

  -- ── 1. anon ne lit plus AUCUN profil (constat WM-SUPA-001) ───────────────
  execute 'set local role anon';
  perform set_config('request.jwt.claims', null, true);
  begin
    execute 'select count(*) from public.users' into n;
    r := r || case when n = 0 then '1) OK anon/users = 0 ligne'
                   else '1) ECHEC anon/users = ' || n || ' lignes' end;
  exception when insufficient_privilege then r := r || '1) OK anon/users refuse';
  end;

  -- ── 2. anon ne lit plus les avis ─────────────────────────────────────────
  begin
    execute 'select count(*) from public.ratings' into n;
    r := r || case when n = 0 then ' | 2) OK anon/ratings = 0'
                   else ' | 2) ECHEC anon/ratings = ' || n end;
  exception when insufficient_privilege then r := r || ' | 2) OK anon/ratings refuse';
  end;
  reset role;

  -- ── Contexte utilisateur A ───────────────────────────────────────────────
  execute 'set local role authenticated';
  perform set_config('request.jwt.claims', json_build_object('sub', v_a)::text, true);

  -- ── 3. A lit bien l'identite publique des autres (embeds vœux) ───────────
  begin
    execute 'select count(*) from (select id, prenom, pseudo, avatar_url, rating from public.users) t' into n;
    r := r || case when n > 0 then ' | 3) OK colonnes publiques lisibles (' || n || ')'
                   else ' | 3) ECHEC aucune ligne' end;
  exception when others then r := r || ' | 3) ECHEC ' || sqlerrm;
  end;

  -- ── 4. A ne lit PAS l'email des autres ───────────────────────────────────
  begin
    execute format('select count(*) from (select email from public.users where id = %L) t', v_b) into n;
    r := r || ' | 4) ECHEC email lisible (etape 2 non appliquee ?)';
  exception when insufficient_privilege then r := r || ' | 4) OK email refuse';
  when others then r := r || ' | 4) ? ' || sqlerrm;
  end;

  -- ── 5. A ne lit PAS les jetons de desabonnement ──────────────────────────
  begin
    execute 'select count(*) from (select email_unsub_token from public.users) t' into n;
    r := r || ' | 5) ECHEC jetons lisibles (etape 2 non appliquee ?)';
  exception when insufficient_privilege then r := r || ' | 5) OK jetons refuses';
  when others then r := r || ' | 5) ? ' || sqlerrm;
  end;

  -- ── 6. ELEVATION DE PRIVILEGE : A ne peut pas devenir admin ──────────────
  --      (cas manque par l'audit : PATCH direct, pas la modif F12)
  begin
    execute format('update public.users set is_admin = true where id = %L', v_a);
    r := r || ' | 6) ECHEC CRITIQUE is_admin modifiable';
  exception when insufficient_privilege then r := r || ' | 6) OK is_admin refuse';
  when others then r := r || ' | 6) ? ' || sqlerrm;
  end;

  -- ── 7. A ne peut pas s'octroyer des vœux payants ─────────────────────────
  begin
    execute format('update public.users set wishes_quota = 999, pack_slots = 999 where id = %L', v_a);
    r := r || ' | 7) ECHEC quota modifiable';
  exception when insufficient_privilege then r := r || ' | 7) OK quota refuse';
  when others then r := r || ' | 7) ? ' || sqlerrm;
  end;

  -- ── 8. A ne peut pas lever sa propre sanction ────────────────────────────
  begin
    execute format('update public.users set is_suspended = false, suspended_until = null where id = %L', v_a);
    r := r || ' | 8) ECHEC suspension modifiable';
  exception when insufficient_privilege then r := r || ' | 8) OK suspension refusee';
  when others then r := r || ' | 8) ? ' || sqlerrm;
  end;

  -- ── 9. A modifie bien son propre profil (non-regression) ─────────────────
  begin
    execute format('update public.users set prenom = prenom, ville = ville where id = %L', v_a);
    r := r || ' | 9) OK update profil autorise';
  exception when others then r := r || ' | 9) REGRESSION ' || sqlerrm;
  end;

  -- ── 10. A ne modifie pas le profil de B ──────────────────────────────────
  begin
    execute format('update public.users set prenom = ''pirate'' where id = %L', v_b);
    get diagnostics n = row_count;
    r := r || case when n = 0 then ' | 10) OK 0 ligne modifiee chez B'
                   else ' | 10) ECHEC ' || n || ' ligne(s) modifiee(s) chez B' end;
  exception when insufficient_privilege then r := r || ' | 10) OK refuse';
  end;

  -- ── 11. A recupere bien SON profil complet via la RPC ────────────────────
  begin
    select count(*) into n from public.get_my_profile();
    r := r || case when n = 1 then ' | 11) OK get_my_profile = 1 ligne'
                   else ' | 11) ECHEC get_my_profile = ' || n end;
  exception when others then r := r || ' | 11) ECHEC ' || sqlerrm;
  end;

  -- ── 12. A n'accede pas aux RPC admin ─────────────────────────────────────
  begin
    perform public.admin_list_suspended_users();
    r := r || ' | 12) ECHEC RPC admin accessible a un non-admin';
  exception when others then r := r || ' | 12) OK RPC admin refusee';
  end;
  reset role;

  -- ── 13. Un admin garde bien l'acces modération ───────────────────────────
  if v_admin is not null then
    execute 'set local role authenticated';
    perform set_config('request.jwt.claims', json_build_object('sub', v_admin)::text, true);
    begin
      select count(*) into n from public.admin_list_suspended_users();
      r := r || ' | 13) OK admin lit la moderation (' || n || ')';
    exception when others then r := r || ' | 13) REGRESSION admin : ' || sqlerrm;
    end;
    reset role;
  end if;

  -- RAISE volontaire : force le ROLLBACK et affiche le rapport.
  raise exception 'RAPPORT RLS >> %', r;
end $$;
