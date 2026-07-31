-- ===========================================================================
-- ROTATION DES JETONS DE DÉSABONNEMENT (email_unsub_token)
--
-- Les 89 jetons étaient lisibles anonymement via l'API REST (WM-SUPA-001).
-- Ce sont des capacités de type « bearer » : l'Edge Function
-- email-unsubscribe (verify_jwt=false) désabonne quiconque présente le jeton,
-- sans autre authentification. Contrairement à ce qu'indique l'audit
-- (« usage non testé »), l'exploitation est directe : le endpoint accepte
-- n'importe quel jeton valide. Ils doivent donc être considérés comme
-- compromis et régénérés.
--
-- ⚠️  EFFET DE BORD ASSUMÉ : les liens « se désabonner » présents dans les
-- e-mails DÉJÀ ENVOYÉS cesseront de fonctionner. Les e-mails suivants
-- porteront les nouveaux jetons. C'est le prix de l'invalidation ; laisser
-- des jetons publiquement connus serait pire.
--
-- Script idempotent au sens sécurité : le relancer régénère simplement de
-- nouveaux jetons.
-- ===========================================================================

update public.users
   set email_unsub_token = gen_random_uuid();
