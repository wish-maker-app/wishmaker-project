-- ===========================================================================
-- VERROUILLAGE DES DROITS D'EXÉCUTION DES FONCTIONS
--
-- Détecté via `get_advisors(security)` après le correctif users : 19 fonctions
-- SECURITY DEFINER étaient appelables par `anon` sur /rest/v1/rpc/<fn>.
--
-- ⚠️  Piège rencontré : PostgreSQL accorde EXECUTE à PUBLIC par défaut sur
-- toute fonction créée. `REVOKE ... FROM anon` ne change donc RIEN — anon
-- hérite du droit via PUBLIC. Il faut révoquer sur PUBLIC, puis ré-accorder
-- explicitement aux rôles qui en ont besoin.
--
-- Toutes les fonctions conservées pour `authenticated` portent leur propre
-- garde (is_admin(), auth.uid(), propriété du vœu) ou sont des fonctions de
-- trigger — PostgreSQL ne vérifie pas EXECUTE à l'exécution d'un trigger,
-- seulement à sa création.
--
-- Les 4 fonctions de maintenance sont retirées à tous les rôles clients :
-- cron.job montre qu'elles sont appelées par pg_cron sous le rôle `postgres`,
-- qui les possède. cleanup_old_expired_wishes fait un DELETE, les autres des
-- écritures de masse sur users/wishes — rien qui doive être déclenchable
-- depuis un navigateur.
-- ===========================================================================

do $$
declare
  f record;
  cron_only text[] := array[
    'mark_expired_wishes', 'cleanup_old_expired_wishes',
    'reconcile_wishes_used', 'reset_monthly_quota'
  ];
begin
  for f in
    select p.oid::regprocedure as sig, p.proname
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
  loop
    -- get_wish_config est appelée au démarrage de l'app, AVANT connexion
    -- (main.jsx → configStore.loadConfig) et ne renvoie que des durées
    -- publiques : elle reste accessible à anon.
    if f.proname = 'get_wish_config' then
      continue;
    end if;

    execute format('revoke execute on function %s from public', f.sig);
    execute format('revoke execute on function %s from anon',   f.sig);

    if f.proname = any(cron_only) then
      execute format('revoke execute on function %s from authenticated', f.sig);
    else
      execute format('grant execute on function %s to authenticated', f.sig);
    end if;

    execute format('grant execute on function %s to service_role', f.sig);
  end loop;
end $$;

-- ⚠️  Dépendances de get_wish_config().
--
-- Exclure get_wish_config() de la boucle ne suffit PAS : elle n'est pas
-- SECURITY DEFINER, donc elle s'exécute avec les droits de l'appelant et
-- appelle wish_duration() et urgent_duration(). Sans ces deux GRANT, l'appel
-- anonyme au démarrage de l'app renvoie 401 (constaté en production sur
-- POST /rest/v1/rpc/get_wish_config, 200 avant le verrouillage).
--
-- Ces deux fonctions ne renvoient que des constantes
-- (INTERVAL '7 days' / INTERVAL '24 hours') : aucune donnée exposée.
grant execute on function public.wish_duration()   to anon;
grant execute on function public.urgent_duration() to anon;
