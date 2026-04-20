-- ===========================================================================
-- Seed initial du nouveau système de catégories/tags
-- Idempotent : relançable sans dupliquer grâce aux ON CONFLICT
-- ===========================================================================

-- ── 7 catégories émotionnelles validées par Christophe ────────────────────
INSERT INTO public.categories (slug, label, emoji, description, sort_order) VALUES
  ('exauce',      'Exauce mon rêve',        '🌟', 'Aspiration, plaisir, expériences uniques',                     1),
  ('divertis',    'Divertis-moi',           '🎉', 'Fun, social, spontané',                                        2),
  ('sauve',       'Sauve-moi',              '🚨', 'Urgence, besoin critique',                                     3),
  ('delegue',     'Fais-le pour moi',       '💼', 'Délégation : courses, ménage, admin, bricolage, ou trouver un objet', 4),
  ('apprends',    'Apprends-moi / Aide-moi', '🧠', 'Conseil, expertise, formation',                                5),
  ('soin',        'Prends soin de moi',     '❤️', 'Bien-être, humain',                                            6),
  ('transport',   'Transporte-moi',         '🚗', 'Mobilité, livraison, logistique',                              7)
ON CONFLICT (slug) DO UPDATE SET
  label       = EXCLUDED.label,
  emoji       = EXCLUDED.emoji,
  description = EXCLUDED.description,
  sort_order  = EXCLUDED.sort_order;

-- ── Catalogue de tags initial ─────────────────────────────────────────────
-- Convention : slug en kebab-case ASCII, label en français lisible
INSERT INTO public.tags (slug, label) VALUES
  -- Exauce mon rêve
  ('cadeau-surprise',        'Cadeau surprise'),
  ('experience-insolite',    'Expérience insolite'),
  ('voyage',                 'Voyage'),
  ('rencontre',              'Rencontre'),
  ('moment-special',         'Moment spécial'),
  -- Divertis-moi
  ('sortie-bar',             'Sortie bar'),
  ('cinema',                 'Cinéma'),
  ('sport-collectif',        'Sport collectif'),
  ('decouverte-locale',      'Découverte locale'),
  ('soiree',                 'Soirée'),
  -- Sauve-moi
  ('depannage-serrurier',    'Dépannage serrurier'),
  ('depannage-auto',         'Dépannage auto'),
  ('urgence-autre',          'Autre urgence'),
  ('plomberie-urgence',      'Plomberie urgence'),
  -- Fais-le pour moi (délégation)
  ('courses',                'Courses'),
  ('menage',                 'Ménage'),
  ('administratif',          'Administratif'),
  ('recherche-objet',        'Recherche d''objet'),
  ('bricolage',              'Bricolage'),
  ('jardinage',              'Jardinage'),
  ('montage-meuble',         'Montage de meuble'),
  -- Apprends-moi
  ('cours-particulier',      'Cours particulier'),
  ('coaching-scolaire',      'Coaching scolaire'),
  ('conseil-expert',         'Conseil expert'),
  ('relecture',              'Relecture'),
  ('formation-pro',          'Formation pro'),
  -- Prends soin de moi
  ('massage',                'Massage'),
  ('coaching-sportif',       'Coaching sportif'),
  ('bien-etre',              'Bien-être'),
  ('soutien-moral',          'Soutien moral'),
  ('garde-animaux',          'Garde d''animaux'),
  -- Transporte-moi
  ('livraison',              'Livraison'),
  ('covoiturage',            'Covoiturage'),
  ('demenagement',           'Déménagement'),
  ('transport-courses',      'Transport de courses'),
  ('transport-encombrant',   'Transport encombrant'),
  -- Tags transverses additionnels cités dans le brief
  ('garde-enfant',           'Garde d''enfant'),
  ('garde-enfant-urgence',   'Garde enfant (urgence)')
ON CONFLICT (slug) DO UPDATE SET label = EXCLUDED.label, is_active = true;

-- ── Associations category_tags ────────────────────────────────────────────
-- Un tag peut apparaître dans plusieurs catégories (tags transverses)
-- is_suggested_primary = affiché en premier dans la liste de la catégorie

-- Exauce mon rêve
INSERT INTO public.category_tags (category_id, tag_id, is_suggested_primary, sort_order)
SELECT c.id, t.id, primary_flag, ord FROM (VALUES
  ('exauce', 'cadeau-surprise',     true,  1),
  ('exauce', 'experience-insolite', false, 2),
  ('exauce', 'voyage',              false, 3),
  ('exauce', 'rencontre',           false, 4),
  ('exauce', 'moment-special',      false, 5)
) AS data(cat_slug, tag_slug, primary_flag, ord)
JOIN public.categories c ON c.slug = data.cat_slug
JOIN public.tags t       ON t.slug = data.tag_slug
ON CONFLICT (category_id, tag_id) DO UPDATE SET
  is_suggested_primary = EXCLUDED.is_suggested_primary,
  sort_order           = EXCLUDED.sort_order;

-- Divertis-moi (inclut sport-collectif + coaching-sportif comme transverse)
INSERT INTO public.category_tags (category_id, tag_id, is_suggested_primary, sort_order)
SELECT c.id, t.id, primary_flag, ord FROM (VALUES
  ('divertis', 'sortie-bar',         true,  1),
  ('divertis', 'cinema',             false, 2),
  ('divertis', 'sport-collectif',    false, 3),
  ('divertis', 'decouverte-locale',  false, 4),
  ('divertis', 'soiree',             false, 5),
  ('divertis', 'coaching-sportif',   false, 6)
) AS data(cat_slug, tag_slug, primary_flag, ord)
JOIN public.categories c ON c.slug = data.cat_slug
JOIN public.tags t       ON t.slug = data.tag_slug
ON CONFLICT (category_id, tag_id) DO UPDATE SET
  is_suggested_primary = EXCLUDED.is_suggested_primary,
  sort_order           = EXCLUDED.sort_order;

-- Sauve-moi (urgences + garde-enfant-urgence + livraison pour les urgences)
INSERT INTO public.category_tags (category_id, tag_id, is_suggested_primary, sort_order)
SELECT c.id, t.id, primary_flag, ord FROM (VALUES
  ('sauve', 'depannage-serrurier',  true,  1),
  ('sauve', 'depannage-auto',       false, 2),
  ('sauve', 'plomberie-urgence',    false, 3),
  ('sauve', 'garde-enfant-urgence', false, 4),
  ('sauve', 'urgence-autre',        false, 5)
) AS data(cat_slug, tag_slug, primary_flag, ord)
JOIN public.categories c ON c.slug = data.cat_slug
JOIN public.tags t       ON t.slug = data.tag_slug
ON CONFLICT (category_id, tag_id) DO UPDATE SET
  is_suggested_primary = EXCLUDED.is_suggested_primary,
  sort_order           = EXCLUDED.sort_order;

-- Fais-le pour moi (délégation, inclut bricolage + jardinage + livraison transverse)
INSERT INTO public.category_tags (category_id, tag_id, is_suggested_primary, sort_order)
SELECT c.id, t.id, primary_flag, ord FROM (VALUES
  ('delegue', 'courses',         true,  1),
  ('delegue', 'menage',          false, 2),
  ('delegue', 'administratif',   false, 3),
  ('delegue', 'recherche-objet', false, 4),
  ('delegue', 'bricolage',       false, 5),
  ('delegue', 'jardinage',       false, 6),
  ('delegue', 'montage-meuble',  false, 7),
  ('delegue', 'livraison',       false, 8),
  ('delegue', 'garde-enfant',    false, 9)
) AS data(cat_slug, tag_slug, primary_flag, ord)
JOIN public.categories c ON c.slug = data.cat_slug
JOIN public.tags t       ON t.slug = data.tag_slug
ON CONFLICT (category_id, tag_id) DO UPDATE SET
  is_suggested_primary = EXCLUDED.is_suggested_primary,
  sort_order           = EXCLUDED.sort_order;

-- Apprends-moi
INSERT INTO public.category_tags (category_id, tag_id, is_suggested_primary, sort_order)
SELECT c.id, t.id, primary_flag, ord FROM (VALUES
  ('apprends', 'cours-particulier',  true,  1),
  ('apprends', 'coaching-scolaire',  false, 2),
  ('apprends', 'conseil-expert',     false, 3),
  ('apprends', 'relecture',          false, 4),
  ('apprends', 'formation-pro',      false, 5),
  ('apprends', 'coaching-sportif',   false, 6)
) AS data(cat_slug, tag_slug, primary_flag, ord)
JOIN public.categories c ON c.slug = data.cat_slug
JOIN public.tags t       ON t.slug = data.tag_slug
ON CONFLICT (category_id, tag_id) DO UPDATE SET
  is_suggested_primary = EXCLUDED.is_suggested_primary,
  sort_order           = EXCLUDED.sort_order;

-- Prends soin de moi (transverse : coaching-sportif, garde-enfant)
INSERT INTO public.category_tags (category_id, tag_id, is_suggested_primary, sort_order)
SELECT c.id, t.id, primary_flag, ord FROM (VALUES
  ('soin', 'massage',          true,  1),
  ('soin', 'coaching-sportif', false, 2),
  ('soin', 'bien-etre',        false, 3),
  ('soin', 'soutien-moral',    false, 4),
  ('soin', 'garde-animaux',    false, 5),
  ('soin', 'garde-enfant',     false, 6)
) AS data(cat_slug, tag_slug, primary_flag, ord)
JOIN public.categories c ON c.slug = data.cat_slug
JOIN public.tags t       ON t.slug = data.tag_slug
ON CONFLICT (category_id, tag_id) DO UPDATE SET
  is_suggested_primary = EXCLUDED.is_suggested_primary,
  sort_order           = EXCLUDED.sort_order;

-- Transporte-moi (transverse : livraison)
INSERT INTO public.category_tags (category_id, tag_id, is_suggested_primary, sort_order)
SELECT c.id, t.id, primary_flag, ord FROM (VALUES
  ('transport', 'livraison',            true,  1),
  ('transport', 'covoiturage',          false, 2),
  ('transport', 'demenagement',         false, 3),
  ('transport', 'transport-courses',    false, 4),
  ('transport', 'transport-encombrant', false, 5)
) AS data(cat_slug, tag_slug, primary_flag, ord)
JOIN public.categories c ON c.slug = data.cat_slug
JOIN public.tags t       ON t.slug = data.tag_slug
ON CONFLICT (category_id, tag_id) DO UPDATE SET
  is_suggested_primary = EXCLUDED.is_suggested_primary,
  sort_order           = EXCLUDED.sort_order;
