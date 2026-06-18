/**
 * Module de modération d'images avec NSFW.js (TensorFlow.js côté client).
 *
 * Charge un modèle ML pré-entraîné (~4MB, mis en cache par le navigateur)
 * qui classifie chaque image en 5 catégories :
 *   - Drawing  (dessin safe)
 *   - Hentai   (porn dessiné)
 *   - Neutral  (safe)
 *   - Porn     (porn réel)
 *   - Sexy     (suggestif : lingerie, maillot)
 *
 * Le modèle est chargé lazy (au 1er appel) et réutilisé ensuite.
 *
 * Usage :
 *   const result = await moderateImage(file)
 *   if (!result.isClean) toast.error(result.reason)
 */

// NOTE: TensorFlow.js (`@tensorflow/tfjs`) n'est PAS importé statiquement.
// nsfwjs le requiert en interne et sera chargé via le `import('nsfwjs')`
// dans loadModel(). Ça permet de ne PAS bundler ~40MB de TF.js dans le
// chunk initial — il n'est téléchargé que quand l'user upload une image.

import { logEvent } from './clientLog'

let modelPromise = null

/**
 * Seuils calibrés pour un marketplace de services (WishMaker).
 * Pas de raison qu'un user poste du nu → on peut être strict sans gêner les usages normaux.
 *
 * Logique :
 *  - Si une catégorie dépasse son seuil individuel → bloqué
 *  - OU si la somme (porn + hentai + sexy) dépasse 0.7 → bloqué (attrape les cas borderline)
 *
 * Basé sur les retours de la communauté NSFW.js (précision ~93% sur le modèle mid).
 */
// Seuils ASSOUPLIS x2 (juin 2026) : encore des faux positifs sur des photos
// d'objets/scènes normales (ex. nettoyeur vapeur) qui sortaient porn/hentai
// entre 0.6 et 0.8. Le VRAI porn/hentai du modèle MobileNetV2 score très haut
// (typiquement > 0.9), donc on peut monter les seuils individuels à 0.85 sans
// laisser passer de vrai contenu, et neutraliser quasi le combiné (sum ≤ 1.0,
// donc 0.97 ne se déclenche QUE si presque toute la proba est "suspecte" — ce
// qui n'arrive jamais sur une photo d'objet).
const THRESHOLDS = {
  porn: 0.85,   // Bloqué si ≥ 85% (le vrai contenu porn dépasse largement)
  hentai: 0.85, // Idem pour dessin porn
  sexy: 0.95,   // Très permissif (lingerie, maillot, sport… OK)
  combined: 0.97, // Somme des 3 scores suspects — ne bloque que les cas francs
}

// Logs en dev uniquement, silence en prod sauf erreur
const DEBUG = import.meta.env?.DEV === true

/**
 * Charge le modèle NSFW.js une seule fois.
 * Sans argument, nsfwjs utilise le modèle mobilenet_v2 bundlé par Vite.
 */
async function loadModel() {
  if (!modelPromise) {
    modelPromise = import('nsfwjs').then((nsfwjs) => nsfwjs.load())
  }
  return modelPromise
}

/**
 * Transforme un File en HTMLImageElement pour l'inférence.
 */
function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Impossible de lire l\'image'))
    }
    img.src = url
  })
}

/**
 * Analyse une image.
 * @param {File | Blob} file - Fichier image (avant upload)
 * @returns {Promise<{
 *   isClean: boolean,
 *   reason: string | null,
 *   scores: Record<string, number>,
 *   topCategory: string,
 * }>}
 */
export async function moderateImage(file) {
  if (!file) return { isClean: true, reason: null, scores: {}, topCategory: 'neutral' }

  try {
    const model = await loadModel()
    const img = await fileToImage(file)
    const predictions = await model.classify(img)

    // Transforme [{className:'Porn',probability:0.92}, ...] en { porn:0.92, ... }
    const scores = predictions.reduce((acc, p) => {
      acc[p.className.toLowerCase()] = p.probability
      return acc
    }, {})

    const top = predictions.sort((a, b) => b.probability - a.probability)[0]
    const topCategory = top.className.toLowerCase()

    if (DEBUG) console.log('[moderationImage] scores:', scores, 'top:', topCategory)

    // Règles de blocage
    const porn = scores.porn || 0
    const hentai = scores.hentai || 0
    const sexy = scores.sexy || 0
    const suspicious = porn + hentai + sexy

    let reason = null
    if (porn >= THRESHOLDS.porn) reason = 'Contenu pornographique détecté'
    else if (hentai >= THRESHOLDS.hentai) reason = 'Contenu pornographique (dessin) détecté'
    else if (sexy >= THRESHOLDS.sexy) reason = 'Contenu trop suggestif'
    // Score combiné : attrape les cas où chaque catégorie est juste sous son seuil.
    else if (suspicious >= THRESHOLDS.combined) reason = 'Contenu inapproprié détecté'

    if (reason) {
      // Boîte noire : on trace les scores des blocages pour CALIBRER les seuils
      // sur de vrais cas (et repérer les faux positifs à l'œil sur des objets).
      const r2 = (n) => Math.round((n || 0) * 100) / 100
      logEvent('nsfw_block', { reason, topCategory, porn: r2(porn), hentai: r2(hentai), sexy: r2(sexy) })
      return { isClean: false, reason, scores, topCategory }
    }

    return { isClean: true, reason: null, scores, topCategory }
  } catch (err) {
    console.error('[moderationImage] FAILED, image allowed by default:', err?.message, err)
    // Fail-open : si la modération plante (modèle pas chargé, navigateur trop vieux...)
    // on laisse passer plutôt que de bloquer l'UX. La couche serveur prendra le relais.
    return {
      isClean: true,
      reason: null,
      scores: {},
      topCategory: 'unknown',
      error: err?.message,
    }
  }
}

/**
 * Version multi-images (pour les wishes qui acceptent plusieurs photos).
 * Retourne le premier résultat non-clean, sinon clean.
 */
export async function moderateImages(files) {
  for (const file of files) {
    const result = await moderateImage(file)
    if (!result.isClean) return { ...result, failedFile: file }
  }
  return { isClean: true, reason: null, scores: {}, topCategory: 'neutral' }
}

// Pre-warm le modèle en arrière-plan (optionnel, à appeler au mount d'un form d'upload)
export function prewarmModerationModel() {
  loadModel().catch(() => {})
}

// Pour debug / UI admin
export { THRESHOLDS }
