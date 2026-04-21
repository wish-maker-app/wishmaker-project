import { supabase } from './supabase'
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

// ---------- Build du set global de mots interdits (une seule fois) ----------
let badWordsSet = null
let badPhrasesList = null // phrases multi-mots traitées à part

function buildBadSets() {
  if (badWordsSet) return
  badWordsSet = new Set()
  badPhrasesList = []

  // leo-profanity dico EN + FR
  try {
    leoProfanity.loadDictionary('en')
    const frDict = leoProfanity.getDictionary('fr')
    if (frDict?.length) leoProfanity.add(frDict)
  } catch {}

  const leoDict = leoProfanity.list() || []
  for (const w of leoDict) {
    const n = normalize(w)
    if (!n) continue
    if (n.includes(' ')) badPhrasesList.push(n)
    else badWordsSet.add(n)
  }

  // french-badwords-list (2000+ mots avec variants leet)
  for (const w of frenchBadwords) {
    const n = normalize(w)
    if (!n) continue
    if (n.includes(' ')) badPhrasesList.push(n)
    else badWordsSet.add(n)
  }

  // Custom list
  for (const w of FR_CUSTOM_BADWORDS) {
    const n = normalize(w)
    if (!n) continue
    if (n.includes(' ')) badPhrasesList.push(n)
    else badWordsSet.add(n)
  }

  // Filtrer les mots trop courts (évite faux positifs sur "a", "is"...)
  for (const w of [...badWordsSet]) {
    if (w.length < 2) badWordsSet.delete(w)
  }
}

// ---------- Supabase custom words ----------
let cachedWords = null
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
  const customWords = await loadCustomWords()
  for (const w of customWords) {
    if (!w.normalized) continue
    const n = w.normalized
    if (normalized.includes(n) || compact.includes(n.replace(/\s+/g, ''))) {
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

  // 4) Fallback : substring compact (attrape "s a l o p e")
  if (violations.length === 0 && compact.length > 3) {
    for (const token of tokens) {
      // Match compact uniquement pour mots ≥ 4 char (évite faux positif)
      if (token.length >= 4 && badWordsSet.has(token)) {
        violations.push({ mot: token, categorie: 'profanity' })
      }
    }
    // Last resort : cherche un mot interdit concaténé dans la version compacte
    if (violations.length === 0) {
      for (const bad of badWordsSet) {
        if (bad.length >= 5 && compact.includes(bad)) {
          violations.push({ mot: bad, categorie: 'profanity_compact' })
          break
        }
      }
    }
  }

  // Dédoublonne
  const unique = Array.from(
    new Map(violations.map((v) => [v.mot + v.categorie, v])).values()
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
