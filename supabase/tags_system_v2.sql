-- ===========================================================================
-- Tags system V2 — nouveau modèle de catégorisation WishMaker
-- Migration ADDITIVE : ne modifie PAS l'existant (wish_tags legacy reste en place)
-- ===========================================================================

-- ── Table categories ──────────────────────────────────────────────────────
-- 7 catégories fixes émotionnelles (branding)
CREATE TABLE IF NOT EXISTS public.categories (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text NOT NULL UNIQUE,
  label        text NOT NULL,
  emoji        text NOT NULL,
  description  text,
  sort_order   integer NOT NULL DEFAULT 0,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ── Table tags ────────────────────────────────────────────────────────────
-- Catalogue plat, éditable via back-office
CREATE TABLE IF NOT EXISTS public.tags (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         text NOT NULL UNIQUE,
  label        text NOT NULL,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_tags_active ON public.tags(is_active) WHERE is_active = true;

-- ── Table category_tags (m2m category ↔ tag) ──────────────────────────────
-- Un tag peut être rattaché à plusieurs catégories (feature core du brief)
-- is_suggested_primary = affiché en haut de liste dans la catégorie
CREATE TABLE IF NOT EXISTS public.category_tags (
  category_id            uuid NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  tag_id                 uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  is_suggested_primary   boolean NOT NULL DEFAULT false,
  sort_order             integer NOT NULL DEFAULT 0,
  PRIMARY KEY (category_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_category_tags_tag ON public.category_tags(tag_id);

-- ── Colonne wishes.category_id ────────────────────────────────────────────
-- NULLABLE pour que les anciens vœux ne se cassent pas
ALTER TABLE public.wishes
  ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_wishes_category ON public.wishes(category_id);

-- ── Table wish_tag_links (nouvelle m2m wish ↔ tag) ────────────────────────
-- NOTE: on ne touche pas à wish_tags (legacy string-based)
-- Une fois la migration validée et les données migrées, on supprimera wish_tags
-- et on renommera wish_tag_links → wish_tags
CREATE TABLE IF NOT EXISTS public.wish_tag_links (
  wish_id    uuid NOT NULL REFERENCES public.wishes(id) ON DELETE CASCADE,
  tag_id     uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (wish_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_wish_tag_links_tag ON public.wish_tag_links(tag_id);
-- Pour la contrainte "1-3 tags par vœu" on la gère côté front (plus flexible pour bulk operations)

-- ── Table user_tag_subscriptions (m2m user ↔ tag pour makers pros) ────────
CREATE TABLE IF NOT EXISTS public.user_tag_subscriptions (
  user_id    uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tag_id     uuid NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, tag_id)
);
CREATE INDEX IF NOT EXISTS idx_user_tag_sub_tag ON public.user_tag_subscriptions(tag_id);

-- ── RLS policies ──────────────────────────────────────────────────────────
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.category_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wish_tag_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_tag_subscriptions ENABLE ROW LEVEL SECURITY;

-- Lecture publique sur catalogue (tout le monde peut voir les catégories et tags)
DROP POLICY IF EXISTS categories_read_all ON public.categories;
CREATE POLICY categories_read_all ON public.categories
  FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS tags_read_all ON public.tags;
CREATE POLICY tags_read_all ON public.tags
  FOR SELECT TO authenticated, anon USING (is_active = true);

DROP POLICY IF EXISTS category_tags_read_all ON public.category_tags;
CREATE POLICY category_tags_read_all ON public.category_tags
  FOR SELECT TO authenticated, anon USING (true);

-- Écriture sur le catalogue : admin only
DROP POLICY IF EXISTS tags_admin_write ON public.tags;
CREATE POLICY tags_admin_write ON public.tags
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS categories_admin_write ON public.categories;
CREATE POLICY categories_admin_write ON public.categories
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS category_tags_admin_write ON public.category_tags;
CREATE POLICY category_tags_admin_write ON public.category_tags
  FOR ALL TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- wish_tag_links : lecture publique (les vœux sont publics), écriture par owner du vœu
DROP POLICY IF EXISTS wish_tag_links_read_all ON public.wish_tag_links;
CREATE POLICY wish_tag_links_read_all ON public.wish_tag_links
  FOR SELECT TO authenticated, anon USING (true);

DROP POLICY IF EXISTS wish_tag_links_insert_own ON public.wish_tag_links;
CREATE POLICY wish_tag_links_insert_own ON public.wish_tag_links
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM wishes w WHERE w.id = wish_id AND w.wisher_id = auth.uid()));

DROP POLICY IF EXISTS wish_tag_links_delete_own ON public.wish_tag_links;
CREATE POLICY wish_tag_links_delete_own ON public.wish_tag_links
  FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM wishes w WHERE w.id = wish_id AND w.wisher_id = auth.uid()));

-- user_tag_subscriptions : chacun gère les siennes
DROP POLICY IF EXISTS user_tag_sub_select_own ON public.user_tag_subscriptions;
CREATE POLICY user_tag_sub_select_own ON public.user_tag_subscriptions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS user_tag_sub_insert_own ON public.user_tag_subscriptions;
CREATE POLICY user_tag_sub_insert_own ON public.user_tag_subscriptions
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS user_tag_sub_delete_own ON public.user_tag_subscriptions;
CREATE POLICY user_tag_sub_delete_own ON public.user_tag_subscriptions
  FOR DELETE TO authenticated USING (user_id = auth.uid());
