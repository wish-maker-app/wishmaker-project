# Catalogue de mots-clés — proposition

Liste finale des mots-clés que l'utilisateur verra dans l'autocomplete.
Objectif : **mots-clés larges** (l'user décrira les détails dans la description du vœu).
Catégorie = invisible côté user, sert juste pour fallback photo + couleur du marker carte.

---

## État actuel : 47 tags en BDD

### À GARDER (déjà larges et utiles) — 31 tags

#### `delegue` (Fais-le pour moi)
- Bricolage
- Jardinage
- Ménage
- Plomberie
- Peinture
- Maçonnerie
- Montage de meuble
- Courses
- Livraison
- Administratif

#### `apprends` (Apprends-moi / Aide-moi)
- Cours particulier
- Coaching scolaire
- Coaching sportif
- Formation pro
- Conseil expert
- Relecture

#### `soin` (Prends soin de moi)
- Massage
- Bien-être
- Soutien moral
- Aide à domicile
- Garde d'enfant
- Garde d'animaux
- Promenade chien

#### `transport` (Transporte-moi)
- Déménagement
- Covoiturage
- Déplacement

#### `divertis` (Divertis-moi)
- Soirée
- Sortie bar
- Cinéma
- Découverte locale
- Sport

#### `exauce` (Exauce mon rêve)
- Cadeau surprise
- Expérience insolite
- Voyage
- Rencontre
- Moment spécial

#### `sauve` (Sauve-moi)
- Recherche d'objet (déplacé ici, plus pertinent que dans `delegue`)

---

### À DÉSACTIVER (`is_active = false`) — trop fins ou redondants — 10 tags

| Tag actuel | Pourquoi | Remplacé par |
|---|---|---|
| Plomberie urgence | Redondant avec Plomberie | "Plomberie" + flag urgent du vœu |
| Garde enfant (urgence) | Redondant avec Garde d'enfant | "Garde d'enfant" + flag urgent |
| Dépannage serrurier | Trop fin | "Serrurerie" (à créer si besoin) ou décrit dans le vœu |
| Dépannage auto | Trop fin, devient sous-cas de Mécanique | "Mécanique" (à créer) |
| Autre urgence | Vague | Le user décrit dans le vœu |
| Sport collectif | Redondant avec Sport | "Sport" |
| Entretien jardin | Redondant avec Jardinage | "Jardinage" |
| Transport de courses | Trop fin | "Livraison" ou "Courses" |
| Transport encombrant | Trop fin | "Livraison" |
| Transport de personnes | Redondant avec Covoiturage / Déplacement | "Covoiturage" / "Déplacement" |

---

### À AJOUTER (mots-clés larges qui manquent) — 11 nouveaux tags

| Nouveau tag | Catégorie principale | Notes |
|---|---|---|
| Mécanique | `delegue` | vidange, lavage, contrôle technique, panne… |
| Électricité | `delegue` | dépannage, installation… |
| Coiffure | `soin` | à domicile ou en salon |
| Esthétique | `soin` | manucure, pédicure, soins du visage… |
| Couture | `delegue` | retouches, ourlets, créations |
| Comptabilité | `apprends` | aide aux comptes, déclaration |
| Traduction | `apprends` | écrite, orale |
| Cuisine | `apprends` | cours, prestation, traiteur |
| Musique | `apprends` | cours d'instrument, animation |
| Photo / vidéo | `divertis` | photographe événement, montage |
| Aide senior | `soin` | accompagnement, courses, lecture |

---

## Récap final proposé

**47 actuels** − 10 désactivés + 11 ajoutés = **48 tags actifs** au final.

### Liste finale par catégorie

#### `exauce` (Exauce mon rêve) — 5 tags
- Cadeau surprise (primary)
- Expérience insolite
- Voyage
- Rencontre
- Moment spécial

#### `divertis` (Divertis-moi) — 6 tags
- Soirée (primary)
- Sortie bar
- Cinéma
- Découverte locale
- Sport
- Photo / vidéo *(nouveau)*

#### `sauve` (Sauve-moi) — 1 tag
- Recherche d'objet (primary)

> Note : la catégorie "sauve" devient maigre. Mais les vrais vœux d'urgence se feront via le flag `is_urgent` sur des tags larges (Plomberie, Garde d'enfant, Mécanique…).

#### `delegue` (Fais-le pour moi) — 14 tags
- Courses (primary)
- Ménage
- Administratif
- Bricolage
- Jardinage
- Montage de meuble
- Livraison
- Plomberie
- Peinture
- Maçonnerie
- Mécanique *(nouveau)*
- Électricité *(nouveau)*
- Couture *(nouveau)*

#### `apprends` (Apprends-moi / Aide-moi) — 9 tags
- Cours particulier (primary)
- Coaching scolaire
- Coaching sportif
- Formation pro
- Conseil expert
- Relecture
- Comptabilité *(nouveau)*
- Traduction *(nouveau)*
- Cuisine *(nouveau)*
- Musique *(nouveau)*

#### `soin` (Prends soin de moi) — 10 tags
- Massage (primary)
- Bien-être
- Soutien moral
- Aide à domicile
- Garde d'enfant
- Garde d'animaux
- Promenade chien
- Coiffure *(nouveau)*
- Esthétique *(nouveau)*
- Aide senior *(nouveau)*

#### `transport` (Transporte-moi) — 3 tags
- Déménagement (primary)
- Covoiturage
- Déplacement

---

## Décisions à valider

1. **OK pour le récap final ?** (48 tags actifs)
2. **OK pour désactiver les 10 tags fins listés ?** (les wishes existants qui les utilisent gardent leur lien, c'est juste qu'ils n'apparaissent plus dans les suggestions futures)
3. **OK pour les 11 nouveaux ?** Ou tu en vois d'autres qui manquent / certains à virer ?

Une fois validé, j'applique la migration SQL :
- INSERT 11 nouveaux tags + leurs liens `category_tags`
- UPDATE `is_active = false` sur les 10 tags désactivés
