-- ===========================================================================
-- Remapping des données legacy vers le nouveau système tags V2
-- À exécuter APRÈS que tags_system_v2.sql + tags_system_seed.sql soient appliqués
-- Idempotent : ON CONFLICT DO NOTHING sur les insert de wish_tag_links
-- ===========================================================================

-- Tags legacy historiques à créer s'ils ne sont pas déjà dans le seed
INSERT INTO public.tags (slug, label) VALUES
  ('aide-domicile',          'Aide à domicile'),
  ('entretien-jardin',       'Entretien jardin'),
  ('maconnerie',             'Maçonnerie'),
  ('peinture',               'Peinture'),
  ('plomberie',              'Plomberie'),
  ('promenade-chien',        'Promenade chien'),
  ('sport',                  'Sport'),
  ('transport-personnes',    'Transport de personnes'),
  ('deplacement',            'Déplacement')
ON CONFLICT (slug) DO NOTHING;

-- Rattacher ces tags legacy aux catégories appropriées
-- (on les met dans les 7 nouvelles catégories en gardant le sens)

-- Aide à domicile → "Prends soin de moi" + "Fais-le pour moi"
INSERT INTO public.category_tags (category_id, tag_id, sort_order)
SELECT c.id, t.id, 999
FROM public.categories c, public.tags t
WHERE c.slug = 'soin' AND t.slug = 'aide-domicile'
ON CONFLICT DO NOTHING;
INSERT INTO public.category_tags (category_id, tag_id, sort_order)
SELECT c.id, t.id, 999
FROM public.categories c, public.tags t
WHERE c.slug = 'delegue' AND t.slug = 'aide-domicile'
ON CONFLICT DO NOTHING;

-- Entretien jardin → "Fais-le pour moi"
INSERT INTO public.category_tags (category_id, tag_id, sort_order)
SELECT c.id, t.id, 999
FROM public.categories c, public.tags t
WHERE c.slug = 'delegue' AND t.slug = 'entretien-jardin'
ON CONFLICT DO NOTHING;

-- Maçonnerie, Peinture, Plomberie → "Fais-le pour moi" (et plomberie aussi dans Sauve-moi)
INSERT INTO public.category_tags (category_id, tag_id, sort_order)
SELECT c.id, t.id, 999
FROM public.categories c, public.tags t
WHERE c.slug = 'delegue' AND t.slug IN ('maconnerie', 'peinture', 'plomberie')
ON CONFLICT DO NOTHING;

-- Promenade chien → "Prends soin de moi" (avec garde-animaux déjà là)
INSERT INTO public.category_tags (category_id, tag_id, sort_order)
SELECT c.id, t.id, 999
FROM public.categories c, public.tags t
WHERE c.slug = 'soin' AND t.slug = 'promenade-chien'
ON CONFLICT DO NOTHING;

-- Sport → "Divertis-moi" (inclut sport-collectif déjà là)
INSERT INTO public.category_tags (category_id, tag_id, sort_order)
SELECT c.id, t.id, 999
FROM public.categories c, public.tags t
WHERE c.slug = 'divertis' AND t.slug = 'sport'
ON CONFLICT DO NOTHING;

-- Transport de personnes + Déplacement → "Transporte-moi"
INSERT INTO public.category_tags (category_id, tag_id, sort_order)
SELECT c.id, t.id, 999
FROM public.categories c, public.tags t
WHERE c.slug = 'transport' AND t.slug IN ('transport-personnes', 'deplacement')
ON CONFLICT DO NOTHING;

-- ===========================================================================
-- MAPPING des wish_tags (legacy strings) vers wish_tag_links (nouveau)
-- Mapping case-insensitive sur le label du tag
-- ===========================================================================

-- Table de correspondance label legacy → slug V2
WITH legacy_to_v2 AS (
  SELECT * FROM (VALUES
    ('Aide à domicile',        'aide-domicile'),
    ('Cours particuliers',     'cours-particulier'),
    ('Courses',                'courses'),
    ('Déplacement',            'deplacement'),
    ('Entretien jardin',       'entretien-jardin'),
    ('Garde animaux',          'garde-animaux'),
    ('Maçonnerie',             'maconnerie'),
    ('Ménage',                 'menage'),
    ('Montage de meubles',     'montage-meuble'),
    ('Peinture',               'peinture'),
    ('Plomberie',              'plomberie'),
    ('Promenade chien',        'promenade-chien'),
    ('Sport',                  'sport'),
    ('Transport de personnes', 'transport-personnes'),
    ('Baby-sitting',           'garde-enfant'),
    ('Musique',                'cours-particulier'),
    ('Informatique',           'cours-particulier'),
    ('Langues',                'cours-particulier'),
    ('Soutien scolaire',       'coaching-scolaire'),
    ('Électricité',            'bricolage'),
    ('Serrurerie',             'depannage-serrurier'),
    ('Carrelage',              'bricolage'),
    ('Meubles',                'montage-meuble'),
    ('Décoration d''intérieur','bricolage'),
    ('Déménagement',           'demenagement'),
    ('Rangement',              'menage'),
    ('Repassage',              'menage'),
    ('Nettoyage',              'menage'),
    ('Cuisine',                'bien-etre'),
    ('Jardinage',              'jardinage'),
    ('Vétérinaire',            'garde-animaux'),
    ('Livraison',              'livraison'),
    ('Transport',              'covoiturage')
  ) AS t(legacy_label, v2_slug)
)
INSERT INTO public.wish_tag_links (wish_id, tag_id)
SELECT wt.wish_id, t.id
FROM public.wish_tags wt
JOIN legacy_to_v2 map ON LOWER(wt.tag) = LOWER(map.legacy_label)
JOIN public.tags t    ON t.slug = map.v2_slug
ON CONFLICT (wish_id, tag_id) DO NOTHING;

-- ===========================================================================
-- AUTO-ASSIGN de category_id pour les vœux qui n'en ont pas
-- Basé sur la première catégorie du premier tag V2 rattaché au vœu
-- ===========================================================================

UPDATE public.wishes w
SET category_id = sub.category_id
FROM (
  SELECT DISTINCT ON (wtl.wish_id)
    wtl.wish_id,
    ct.category_id
  FROM public.wish_tag_links wtl
  JOIN public.category_tags ct ON ct.tag_id = wtl.tag_id
  ORDER BY wtl.wish_id, ct.is_suggested_primary DESC, ct.sort_order
) AS sub
WHERE w.id = sub.wish_id AND w.category_id IS NULL;

-- Vœux sans aucun tag V2 mappé → on les laisse avec category_id = NULL
-- Ils seront visibles pour tous les makers (pas de restriction de tag)
