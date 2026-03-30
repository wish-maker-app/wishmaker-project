import { supabase } from './supabase'

let cachedWords = null

const LEET_MAP = {
  '0': 'o', '1': 'i', '3': 'e', '4': 'a',
  '@': 'a', '$': 's', '5': 's',
}

function normalize(text) {
  let t = text.toLowerCase()
  // Remplacer leetspeak
  t = t.replace(/[013 4@$5]/g, (ch) => LEET_MAP[ch] || ch)
  // Supprimer accents
  t = t.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  // Supprimer tout sauf lettres
  return t
}

async function loadWords() {
  if (cachedWords) return cachedWords
  const { data } = await supabase
    .from('forbidden_words')
    .select('mot, categorie')
  cachedWords = (data || []).map((w) => ({
    mot: w.mot,
    categorie: w.categorie,
    normalized: normalize(w.mot),
  }))
  return cachedWords
}

export async function checkContent(text) {
  if (!text || !text.trim()) return { isClean: true, violations: [] }

  const words = await loadWords()
  const normalizedText = normalize(text)
  const violations = []

  for (const w of words) {
    if (normalizedText.includes(w.normalized)) {
      violations.push({ mot: w.mot, categorie: w.categorie })
    }
  }

  return {
    isClean: violations.length === 0,
    violations,
  }
}

// Vider le cache (utile si l'admin ajoute/supprime des mots)
export function clearModerationCache() {
  cachedWords = null
}
