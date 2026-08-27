-- ===========================================================================
-- Phase 2 Capacitor — push natif : colonne `platform` sur push_subscriptions
--
-- On réutilise la table existante pour stocker AUSSI les tokens natifs
-- (FCM Android / APNs iOS) : le token natif va dans `endpoint`, avec platform =
-- 'android' | 'ios'. Les abonnements Web Push existants restent 'web'.
--
-- L'Edge Function d'envoi distinguera ensuite :
--   • platform = 'web'              -> Web Push (VAPID), comme aujourd'hui
--   • platform IN ('android','ios') -> FCM (token dans endpoint)
--
-- Additif et sans risque : les lignes existantes prennent 'web' par défaut.
-- ===========================================================================

ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS platform text NOT NULL DEFAULT 'web';
