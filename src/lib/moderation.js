import { supabase, withTimeout } from './supabase'
import leoProfanity from 'leo-profanity'
import frenchBadwords from 'french-badwords-list/dist/array.js'

/**
 * Module de modération de texte — 3 couches :
 *
 *  1. Liste Supabase `forbidden_words` (admin-éditable, prioritaire)
 *  2. leo-profanity (dico EN + FR) — whole-word matching
 *  3. french-badwords-list (~2000 mots FR avec leet variants) — whole-word matching
 *  4. Liste custom FR (abbréviations, slurs, spam)
 *
 * Normalisation agressive (lower + leet + accents + ponctuation + doublage).
 */

// ---------- Custom FR (abbréviations + slurs + spam non couverts par la lib) ----------
const FR_CUSTOM_BADWORDS = [
  // Abbréviations insultes (pas dans le dico standard)
  'pd', 'ptn', 'ntm', 'fdp', 'ftg', 'tg', 'stfu', 'gtg', 'sftg',
  // "ta gueule" et ses variantes (collées ou mal orthographiées)
  'tageule', 'tagueule', 'tageulle', 'ta gueule', 'ta geule', 'ferme ta gueule',
  // Variantes courantes mal orthographiées
  'battard', 'batar', 'batarde', 'connar', 'conasse',
  // Slurs (assurance double avec la lib)
  'pédé', 'pede', 'bougnoule', 'bougnoul', 'negre', 'nègre',
  'niakoué', 'youpin', 'youpine', 'mongol', 'handicapé', 'trisomique',
  // Sexuel explicite / abbréviations
  'porn', 'porno', 'nudes', 'onlyfans', 'mym.fans', 'snap premium', 'snap prem',
  // Drogue
  'cocaine', 'cocaïne', 'heroine', 'héroïne', 'crack', 'meth', 'ecstasy',
  'weed', 'shit', 'beuh', 'cannabis', 'lsd', 'mdma',
  // Spam / scam
  'bitcoin gratuit', 'crypto gratuit', 'argent facile', 'gagner argent',
  // Extrémisme / haine / apologie de régimes totalitaires
  'hitler', 'adolf hitler', 'nazi', 'nazie', 'nazisme', 'heil hitler',
  'sieg heil', 'ss nazi', 'troisieme reich', 'troisième reich',
  'holocauste blague', 'shoah blague',
  'daesh', 'isis', 'al qaeda', 'jihad', 'djihad', 'jihadiste', 'djihadiste',
  'mein kampf',
  // Apologie terrorisme / violence
  'tuer tous', 'mort aux', 'kill all', 'bombe homemade', 'fabriquer bombe',
  // Pedo (bloquer absolument)
  'pedo', 'pédo', 'pedophile', 'pédophile', 'cp image', 'cp video', 'lolicon',
]

// ---------- Normalisation ----------
const LEET_MAP = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a',
  '@': 'a', '$': 's', '5': 's', '7': 't',
  '8': 'b', '!': 'i', '|': 'l',
}

/**
 * Normalise agressivement : lowercase + leet → lettres + sans accents
 * + sans ponctuation + collapse tous doublons (battard → batard).
 */
function normalize(text) {
  let t = String(text || '').toLowerCase()
  t = t.replace(/[0134@$578!|]/g, (ch) => LEET_MAP[ch] || ch)
  t = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  t = t.replace(/[^a-z0-9\s]/g, ' ')
  // Collapse TOUS les doublons à 1 lettre : "battard" → "batard", "poooorn" → "porn"
  t = t.replace(/(.)\1+/g, '$1')
  // Collapse espaces multiples
  t = t.replace(/\s+/g, ' ').trim()
  return t
}

/** Version sans espaces pour détecter "s a l o p e" → "salope" */
function normalizeCompact(text) {
  return normalize(text).replace(/\s+/g, '')
}

// ---------- Allowlist (faux positifs courants des dicos externes) ----------
// Mots français du quotidien présents À TORT dans leo-profanity / french-
// badwords-list. On les neutralise pour ne pas bloquer des messages normaux
// ("salle de bain", "linge sale", "crotte de chien"…). Enrichir au besoin :
// il suffit d'ajouter un mot ici (en minuscules) pour qu'il ne soit plus bloqué.
const SAFE_WORDS = ['sale', 'salle', 'con', 'crotte'].map(normalize)

// ---------- Build du set global de mots interdits (une seule fois) ----------
let badWordsSet = null
let badPhrasesList = null // phrases multi-mots traitées à part

function buildBadSets() {
  if (badWordsSet) return
  badWordsSet = new Set()
  badPhrasesList = []

  // Ajoute une entrée normalisée. Mot simple → set. Phrase multi-mots → liste,
  // MAIS en rejetant les phrases "dégénérées" qui matcheraient en sous-chaîne
  // n'importe quel texte. Ex : "S&M" se normalise en "s m" (2 lettres) et
  // bloquait "pa-s m-al", "te-s m-ains", "dan-s m-a"… On exige donc que CHAQUE
  // mot de la phrase fasse ≥ 2 lettres ET que la phrase compacte fasse ≥ 5.
  const pushEntry = (n) => {
    if (!n) return
    if (n.includes(' ')) {
      const words = n.split(' ')
      if (words.some((w) => w.length < 2)) return
      if (n.replace(/\s+/g, '').length < 5) return
      badPhrasesList.push(n)
    } else {
      badWordsSet.add(n)
    }
  }

  // leo-profanity dico EN + FR
  try {
    leoProfanity.loadDictionary('en')
    const frDict = leoProfanity.getDictionary('fr')
    if (frDict?.length) leoProfanity.add(frDict)
  } catch { /* noop */ }

  for (const w of (leoProfanity.list() || [])) pushEntry(normalize(w))
  for (const w of frenchBadwords) pushEntry(normalize(w))
  for (const w of FR_CUSTOM_BADWORDS) pushEntry(normalize(w))

  // Filtrer les mots trop courts (évite faux positifs sur "a", "is"...)
  for (const w of [...badWordsSet]) {
    if (w.length < 2) badWordsSet.delete(w)
  }

  // Allowlist : on retire les faux positifs courants (cf. SAFE_WORDS)
  for (const w of SAFE_WORDS) badWordsSet.delete(w)
  badPhrasesList = badPhrasesList.filter((p) => !SAFE_WORDS.includes(p))
}

// ---------- Supabase custom words ----------
let cachedWords = null
async function loadCustomWords() {
  if (cachedWords) return cachedWords
  try {
    // withTimeout : sinon, au 1er message en PWA (connexion lente/morte), cette
    // requête peut hang → checkContent hang → l'envoi "ne fait rien" et l'user
    // re-clique (doublons). Bornée à 4s, fail-open sur les dicos locaux.
    const { data } = await withTimeout(
      supabase.from('forbidden_words').select('mot, categorie'),
      4000,
      'MOD_WORDS_TIMEOUT'
    )
    cachedWords = (data || []).map((w) => ({
      mot: w.mot,
      categorie: w.categorie || 'custom',
      normalized: normalize(w.mot),
    }))
    return cachedWords
  } catch {
    // On NE cache PAS l'échec (retry au prochain message) et on ne bloque pas
    // l'envoi : leo-profanity + french-badwords couvrent déjà l'essentiel.
    return []
  }
}

// ---------- API publique ----------

/**
 * @param {string} text
 * @returns {Promise<{isClean:boolean, violations:{mot,categorie}[]}>}
 */
export async function checkContent(text) {
  if (!text || !String(text).trim()) return { isClean: true, violations: [] }
  buildBadSets()

  const normalized = normalize(text)
  const compact = normalizeCompact(text)
  const tokens = normalized.split(' ').filter(Boolean)
  const violations = []

  // 1) Admin Supabase : substring match (mots OU phrases)
  // PROTECTION ANTI-FAUX-POSITIF : si le mot interdit normalise fait < 3 chars,
  // on bascule sur du whole-word match (sinon "xxx" → collapse-doublons → "x"
  // et match TOUT mot contenant la lettre x : voeux, taxi, exemple, deux...).
  const customWords = await loadCustomWords()
  for (const w of customWords) {
    if (!w.normalized) continue
    const n = w.normalized
    const compactN = n.replace(/\s+/g, '')
    if (compactN.length < 3) {
      // Mot trop court : whole-word match uniquement sur les tokens
      if (tokens.includes(compactN)) {
        violations.push({ mot: w.mot, categorie: w.categorie })
      }
      continue
    }
    if (normalized.includes(n) || compact.includes(compactN)) {
      violations.push({ mot: w.mot, categorie: w.categorie })
    }
  }

  // 2) Whole-word match sur le Set (rapide, zéro faux positif type "grass" → "ass")
  for (const token of tokens) {
    if (badWordsSet.has(token)) {
      violations.push({ mot: token, categorie: 'profanity' })
    }
  }

  // 3) Phrases multi-mots (substring match sur le texte complet)
  for (const phrase of badPhrasesList) {
    if (normalized.includes(phrase)) {
      violations.push({ mot: phrase, categorie: 'profanity_phrase' })
    }
  }

  // 4) Fallback compact pour attraper les espacements ruse "s a l o p e".
  //    On verifie uniquement si le COMPACT TOTAL est un mot interdit exact
  //    (pas de substring match qui produit trop de faux positifs sur des
  //    textes normaux : "baisse" -> compact "baise" matchait l'insulte, etc).
  //    L'ancien "last resort substring" est desactive : il provoquait des
  //    faux positifs sur des descriptions normales (Maison du bonheur,
  //    Emmener ma grand mere en courses, Achat voiture, etc.).
  if (violations.length === 0 && compact.length >= 4 && compact.length <= 20) {
    if (badWordsSet.has(compact)) {
      violations.push({ mot: compact, categorie: 'profanity_compact' })
    }
  }

  // Allowlist finale : on ne signale jamais un mot de la liste blanche (au cas
  // où il viendrait d'une autre source que badWordsSet, ex: forbidden_words).
  const allowed = violations.filter((v) => !SAFE_WORDS.includes(normalize(v.mot)))

  // Dédoublonne
  const unique = Array.from(
    new Map(allowed.map((v) => [v.mot + v.categorie, v])).values()
  )
  return { isClean: unique.length === 0, violations: unique }
}

/**
 * Log audit (ne throw jamais).
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

export function clearModerationCache() {
  cachedWords = null
}

/**
 * Pré-chauffe la modération (build des dicos locaux + chargement de la liste
 * Supabase) pour que le PREMIER message envoyé ne subisse aucune latence.
 * À appeler au montage d'un écran de chat. Best-effort, ne throw jamais.
 */
export function prewarmModeration() {
  try { buildBadSets() } catch { /* noop */ }
  loadCustomWords().catch(() => {})
}
