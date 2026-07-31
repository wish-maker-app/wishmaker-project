-- ===========================================================================
-- DURCISSEMENT DES AUTRES TABLES — policies posées sur le rôle `public`
--
-- Le rôle `public` de PostgreSQL englobe `anon` : toute policy posée sur
-- `public` avec `USING (true)` est ouverte à Internet via la clé anon. C'est
-- le même mécanisme que WM-SUPA-001 sur users.
--
-- Deux tables étaient réellement exposées :
--   • ratings          — « Anyone can read ratings », USING (true) : tous les
--                        avis et commentaires étaient lisibles anonymement.
--   • forbidden_words  — lecture publique, USING (true).
--
-- Les autres policies rôle `public` listées ici portent déjà une condition
-- sur auth.uid() (donc NULL en anonyme, aucune ligne renvoyée) : les
-- repositionner sur `authenticated` est de l'hygiène, pas un correctif.
--
-- NON MODIFIÉ volontairement :
--   • categories / tags / wish_tag_links — lecture anon assumée, données non
--     personnelles, utilisées avant connexion.
--   • client_logs — INSERT anon nécessaire (les logs partent parfois avant
--     l'authentification).
--
-- Sans impact sur le front : tous ces écrans sont derrière l'authentification.
-- ===========================================================================

-- ── ratings ────────────────────────────────────────────────────────────────
drop policy if exists "Anyone can read ratings" on public.ratings;
create policy ratings_select_authenticated on public.ratings
  for select to authenticated
  using (true);

drop policy if exists "Users can insert their own ratings" on public.ratings;
create policy ratings_insert_own on public.ratings
  for insert to authenticated
  with check ((select auth.uid()) = from_user);

-- ── forbidden_words ────────────────────────────────────────────────────────
drop policy if exists "lecture publique mots interdits" on public.forbidden_words;
create policy forbidden_words_select_authenticated on public.forbidden_words
  for select to authenticated
  using (true);

-- ── notification_log ───────────────────────────────────────────────────────
drop policy if exists "user voit ses notifs" on public.notification_log;
create policy notification_log_select_own on public.notification_log
  for select to authenticated
  using ((select auth.uid()) = user_id);

-- ── push_subscriptions ─────────────────────────────────────────────────────
drop policy if exists "user gere ses subscriptions" on public.push_subscriptions;
create policy push_subscriptions_all_own on public.push_subscriptions
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ── wish_packs ─────────────────────────────────────────────────────────────
drop policy if exists "user voit ses packs" on public.wish_packs;
create policy wish_packs_select_own on public.wish_packs
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "user cree ses packs" on public.wish_packs;
create policy wish_packs_insert_own on public.wish_packs
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

-- ── transactions ───────────────────────────────────────────────────────────
drop policy if exists "Users can view their transactions" on public.transactions;
create policy transactions_select_own on public.transactions
  for select to authenticated
  using ((select auth.uid()) = user_id);

drop policy if exists "admins_can_read_all_transactions" on public.transactions;
create policy transactions_select_admin on public.transactions
  for select to authenticated
  using (public.is_admin((select auth.uid())));

-- ── conversations / messages : gardes admin ────────────────────────────────
drop policy if exists "admins_can_read_all_conversations" on public.conversations;
create policy conversations_select_admin on public.conversations
  for select to authenticated
  using (public.is_admin((select auth.uid())));

drop policy if exists "admins_read_all_messages" on public.messages;
create policy messages_select_admin on public.messages
  for select to authenticated
  using (public.is_admin((select auth.uid())));

-- ── Retrait des privilèges de table pour anon ──────────────────────────────
-- Ceinture et bretelles : même sans policy applicable, anon n'a aucune raison
-- de conserver les GRANT par défaut de Supabase sur ces tables.
revoke all on table public.users              from anon;
revoke all on table public.ratings            from anon;
revoke all on table public.forbidden_words    from anon;
revoke all on table public.messages           from anon;
revoke all on table public.conversations      from anon;
revoke all on table public.transactions       from anon;
revoke all on table public.notification_log   from anon;
revoke all on table public.push_subscriptions from anon;
revoke all on table public.wish_packs         from anon;
revoke all on table public.search_history     from anon;
revoke all on table public.reports            from anon;
revoke all on table public.wishes             from anon;
revoke all on table public.wish_images        from anon;
revoke all on table public.wish_tags          from anon;
revoke all on table public.wish_favorites     from anon;
revoke all on table public.user_tag_subscriptions from anon;
