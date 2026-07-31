# Correctif de sécurité — exposition de `public.users`

Suite à l'audit externe du 31/07/2026 (`Rapport_Wishmaker.pdf`, projet
`livxniiktxtexlwadqfi`). Les constats de l'audit ont été vérifiés un par un
directement en base : ils sont exacts.

## Ce qui était ouvert

| # | Faille | Source | Statut |
|---|--------|--------|--------|
| WM-SUPA-001 | Policy `Users can view all profiles` posée sur le rôle `public` (= `anon`) : 89 profils lisibles anonymement — emails, GPS, jetons de désinscription, drapeau `is_admin` | Audit | Corrigé |
| — | **Élévation de privilège** : `PATCH /rest/v1/users?id=eq.<son_id> {"is_admin":true}` acceptée. Les policies UPDATE ne contrôlaient que la ligne, jamais les colonnes | **Manqué par l'audit** | Corrigé |
| — | Même mécanisme sur `wishes_quota` / `pack_slots` (vœux payants) et `is_suspended` (auto-levée de sanction) | **Manqué par l'audit** | Corrigé |
| — | `is_admin()` `SECURITY DEFINER` sans `search_path` figé et table non qualifiée (search_path hijacking) | **Manqué par l'audit** | Corrigé |
| — | 19 fonctions `SECURITY DEFINER` appelables par `anon`, dont `cleanup_old_expired_wishes()` (DELETE) sans aucune garde | **Manqué par l'audit** | Corrigé |
| — | `ratings` et `forbidden_words` lisibles anonymement (`USING (true)` sur le rôle `public`) | **Manqué par l'audit** | Corrigé |
| WM-HARD-003 | SDK legacy, clé anon legacy | Audit | Non traité (lot séparé) |
| WM-AUTH-002 | `mailer_autoconfirm: true` | Audit | À faire au dashboard (voir plus bas) |

L'audit concluait « élévation de privilège non observée » parce que le testeur
avait modifié `is_admin` dans l'état client via F12 — sans effet — sans tester
le PATCH direct sur l'API REST.

## Ordre d'application

Les scripts sont dans `supabase/`. **L'ordre compte.**

### Déjà appliqués en production

```
1. security_users_rls_v2.sql        -- policies authenticated + colonnes non modifiables + RPC
2. security_fix_quota_triggers.sql  -- OBLIGATOIRE avec le 1 (sinon création de vœu cassée)
3. security_harden_is_admin.sql     -- search_path figé
4. security_lock_function_execute.sql
5. security_other_tables_rls.sql
6. security_rotate_unsub_tokens.sql -- invalide les jetons exposés
7. security_storage_buckets.sql     -- retire le listing des buckets publics
```

> Les scripts 1 et 2 sont indissociables : les triggers de quota écrivaient
> `users` avec les droits du client, ce qui ne marchait que grâce à la faille.
> Appliquer 1 sans 2 casse la création de vœu.

### À appliquer APRÈS le déploiement du front

```
8. security_users_columns_v2.sql    -- retire la LECTURE des colonnes privées
```

Ce script casserait la production s'il était appliqué avant le déploiement :
le code d'avant le correctif fait `select('*')` sur `users`. Le nouveau front
(`src/lib/userProfile.js`) fonctionne avant **comme** après, ce qui permet de
déployer d'abord et de verrouiller ensuite.

Tant que le 8 n'est pas passé, `anon` n'a plus rien, mais un compte connecté
peut encore lire les emails et coordonnées des autres. Comme l'inscription est
ouverte et auto-confirmée, **c'est le script 8 qui ferme réellement la fuite de
données personnelles.**

## Vérification

```
supabase/tests/rls_users_matrix.sql
```

Reprend la matrice de l'audit (page 8) plus les cas d'élévation de privilège.
Le script se termine volontairement par `RAISE EXCEPTION` : cela force le
rollback (aucune donnée touchée) et affiche le rapport. Attendu après le
script 8 : les 13 tests en OK. Avant : les tests 4 et 5 ressortent en ECHEC.

Contrôle externe après déploiement :

```bash
curl -i "https://livxniiktxtexlwadqfi.supabase.co/rest/v1/users?select=*&limit=1" \
  -H "apikey: <PUBLISHABLE_KEY>" -H "Authorization: Bearer <PUBLISHABLE_KEY>"
```

Attendu : `401`/`403`, ou `200` avec liste vide.

## Règle à tenir dans le code

Ne jamais réintroduire de `select('*')` sur `users` :

- lire **les autres** → `PUBLIC_USER_COLUMNS` (`src/lib/userProfile.js`)
- lire **soi-même** → `fetchMyProfile()` (RPC `get_my_profile`)
- lire les données privées **d'autrui** en tant qu'admin → RPC `admin_*`

Toute nouvelle colonne sensible ajoutée à `users` est privée par défaut : elle
n'apparaît pas dans le `GRANT SELECT` de `security_users_columns_v2.sql`.

## Reste à faire (hors périmètre de ce lot)

- **WM-AUTH-002 — confirmation d'email.** `mailer_autoconfirm` est actif : un
  compte est utilisable sans prouver l'adresse. Réglage non modifiable par
  l'API : Dashboard → Authentication → Providers → Email → activer
  *Confirm email*. À prévoir en même temps, car `Register.jsx` suppose
  aujourd'hui une session immédiate après `signUp()` : une fois la
  confirmation exigée, `authData.session` sera `null` et le tunnel `/setup/*`
  doit gérer ce cas. Activer aussi un captcha (Turnstile/hCaptcha) sur
  inscription, connexion et réinitialisation.
- **Protection contre les mots de passe compromis** (advisor Supabase) :
  Dashboard → Authentication → Password strength → *Leaked password
  protection*.
- **Hachage des `email_unsub_token`** : recommandé par l'audit, non fait. Le
  jeton doit rester en clair dans le lien e-mail ; le hacher impose de modifier
  `email-unsubscribe` et `re-engagement-mail` ensemble, ce qui engage la
  délivrabilité. La rotation + le retrait de l'accès client ferment déjà la
  fuite.
- **Investigation post-incident / RGPD** : préserver les journaux Data API
  **avant** toute purge, déterminer la fenêtre d'exposition, qualifier la
  violation (CNIL, 72 h). Décisions non techniques.
- **WM-HARD-003** : montée de `@supabase/supabase-js` et migration de la clé
  anon legacy vers `sb_publishable_...`, à faire dans un lot séparé pour ne pas
  mêler une montée de version SDK à un correctif de sécurité.
