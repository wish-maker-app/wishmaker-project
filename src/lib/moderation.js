import { supabase } from './supabase'
import leoProfanity from 'leo-profanity'

/**
 * Module de modération de texte.
 *
 * 3 couches de détection :
 *  1. Liste Supabase `forbidden_words` (admin-éditable, prioritaire)
 *  2. leo-profanity (dictionnaire EN de base + extension FR)
 *  3. Liste FR custom interne (insultes/slurs français usuels)
 *
 * Normalisation : lowercase, leetspeak, accents, ponctuation, doublage de lettres
 * pour détecter "p0rn", "p.o.r.n", "poorn", "pôrn" etc.
 */

// ---------- FR baseline (insultes / slurs / spam courants) ----------
const FR_BADWORDS = [
  // Insultes basiques
  'connard', 'connasse', 'enculé', 'enculer', 'encule', 'salope', 'pute', 'putain',
  'merde', 'chier', 'chiasse', 'bite', 'couille', 'couilles', 'chatte', 'teub', 'zeb',
  'batard', 'bâtard', 'fils de pute', 'fdp', 'ntm', 'tg', 'ftg',
  // Slurs (toujours bloquer)
  'bougnoul', 'bougnoule', 'negre', 'nègre', 'niakoué', 'youpin', 'youpine',
  'pédé', 'pede', 'gouine', 'tarlouze', 'tapette', 'tapete',
  'handicapé', 'mongolien', 'mongol', 'retardé', 'trisomique',
  // Sexuel explicite
  'porno', 'porn', 'sexe', 'fuck', 'fucking', 'baise', 'baiser', 'branler', 'branlette',
  'masturber', 'masturbation', 'orgasme', 'sperme', 'éjacul', 'ejacul',
  'suce', 'sucer', 'niquer', 'nique', 'niquée', 'sodomie', 'sodomiser',
  // Drogue / illégal
  'cocaine', 'cocaïne', 'heroine', 'héroïne', 'crack', 'meth', 'ecstasy',
  'weed', 'shit', 'beuh', 'cannabis', 'lsd',
  // Spam / scam typique
  'bitcoin gratuit', 'crypto gratuit', 'gagner argent facile', 'arnaque',
  'onlyfans', 'mym.fans', 'snap premium', 'snap prem',
]

// ---------- Cache Supabase ----------
let cachedWords = null

// ---------- Normalisation avancée ----------
const LEET_MAP = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a',
  '@': 'a', '$': 's', '5': 's', '7': 't',
  '8': 'b', '!': 'i',
}

function normalize(text) {
  let t = String(text || '').toLowerCase()
  // Leetspeak
  t = t.replace(/[0134@$57!]/g, (ch) => LEET_MAP[ch] || ch)
  // Accents
  t = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  // Supprimer ponctuation/espaces multiples (pour matcher "p.o.r.n", "p o r n")
  t = t.replace(/[^a-z0-9\s]/g, '')
  // Réduire les répétitions : "poooorn" → "porn" (3+ → 1)
  t = t.replace(/(.)\1{2,}/g, '$1')
  return t
}

// Variante sans espaces pour matcher les insultes espacées (ex: "s a l o p e")
function normalizeCompact(text) {
  return normalize(text).replace(/\s+/g, '')
}

// ---------- Init leo-profanity : merge dico EN + FR + notre liste custom ----------
let leoInitialized = false
function initLeo() {
  if (leoInitialized) return
  // 1) Charge dico EN de base
  leoProfanity.loadDictionary('en')
  // 2) Ajoute le dico FR natif (leo-profanity le supporte)
  try {
    const frDict = leoProfanity.getDictionary('fr')
    if (frDict && frDict.length) leoProfanity.add(frDict)
  } catch (e) {
    console.warn('[moderation] FR dict not available:', e?.message)
  }
  // 3) Ajoute notre liste FR custom (normalisée pour matcher les leet/accents)
  leoProfanity.add(FR_BADWORDS.map((w) => normalize(w)))
  leoInitialized = true
}

// ---------- Chargement de la liste admin Supabase ----------
async function loadCustomWords() {
  if (cachedWords) return cachedWords
  try {
    const { data } = await supabase.from('forbidden_words').select('mot, categorie')
    cachedWords = (data || []).map((w) => ({
      mot: w.mot,
      categorie: w.categorie || 'custom',
      normalized: normalize(w.mot),
    }))
  } catch {
    cachedWords = []
  }
  return cachedWords
}

// ---------- API publique ----------

/**
 * Vérifie un texte. Retourne { isClean, violations: [{ mot, categorie }] }
 *
 * @param {string} text - Texte à vérifier
 * @param {object} opts
 * @param {boolean} opts.strict - Si true, utilise aussi la variante sans espaces
 *                                (recommandé pour pseudos, titres)
 */
export async function checkContent(text, opts = {}) {
  if (!text || !String(text).trim()) return { isClean: true, violations: [] }
  initLeo()

  const { strict = false } = opts
  const normalized = normalize(text)
  const compact = strict ? normalizeCompact(text) : null
  const violations = []

  // 1) Liste admin Supabase
  const customWords = await loadCustomWords()
  for (const w of customWords) {
    if (!w.normalized) continue
    if (
      normalized.includes(w.normalized) ||
      (compact && compact.includes(w.normalized.replace(/\s+/g, '')))
    ) {
      violations.push({ mot: w.mot, categorie: w.categorie })
    }
  }

  // 2) leo-profanity (EN + FR merged)
  //    Check word by word pour éviter les faux positifs ("grass" contient "ass")
  const words = normalized.split(/\s+/).filter(Boolean)
  for (const word of words) {
    if (leoProfanity.check(word)) {
      violations.push({ mot: word, categorie: 'profanity' })
    }
  }

  // 3) FR list (substring match sur texte complet, pour attraper les mots composés)
  for (const bad of FR_BADWORDS) {
    const n = normalize(bad)
    if (
      normalized.includes(n) ||
      (compact && compact.includes(n.replace(/\s+/g, '')))
    ) {
      // Évite les doublons (déjà ajouté via leo)
      if (!violations.some((v) => v.mot === bad || v.mot === n)) {
        violations.push({ mot: bad, categorie: 'profanity_fr' })
      }
    }
  }

  return {
    isClean: violations.length === 0,
    violations,
  }
}

/**
 * Loggue une violation dans la table `moderation_flags` pour audit admin.
 * Ne throw jamais (ne doit pas bloquer le flux).
 */
export async function logViolation({ userId, contentType, contentPreview, violations }) {
  try {
    await supabase.from('moderation_flags').insert({
      user_id: userId,
      content_type: contentType,
      content_preview: (contentPreview || '').slice(0, 500),
      violations,
    })
  } catch (err) {
    console.warn('[moderation] logViolation failed:', err?.message)
  }
}

// Vide le cache de la liste admin (utile après modif dans /admin)
export function clearModerationCache() {
  cachedWords = null
}
