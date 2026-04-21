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

import * as tf from '@tensorflow/tfjs'

let modelPromise = null

// Seuils (ajustables selon tolérance)
const THRESHOLDS = {
  porn: 0.7,    // Bloqué si > 70% de confiance
  hentai: 0.7,  // Idem
  sexy: 0.85,   // Plus permissif (peut inclure maillots, lingerie mainstream)
}

/**
 * Charge le modèle NSFW.js une seule fois.
 * Le modèle est servi via CDN jsDelivr pour éviter d'héberger 4MB.
 */
async function loadModel() {
  if (!modelPromise) {
    modelPromise = import('nsfwjs').then((nsfwjs) =>
      nsfwjs.load('https://cdn.jsdelivr.net/npm/nsfwjs@2.4.2/dist/model/')
    )
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

    // Règles de blocage
    if ((scores.porn || 0) >= THRESHOLDS.porn) {
      return {
        isClean: false,
        reason: 'Contenu pornographique détecté',
        scores,
        topCategory,
      }
    }
    if ((scores.hentai || 0) >= THRESHOLDS.hentai) {
      return {
        isClean: false,
        reason: 'Contenu pornographique (dessin) détecté',
        scores,
        topCategory,
      }
    }
    if ((scores.sexy || 0) >= THRESHOLDS.sexy) {
      return {
        isClean: false,
        reason: 'Contenu trop suggestif',
        scores,
        topCategory,
      }
    }

    return { isClean: true, reason: null, scores, topCategory }
  } catch (err) {
    console.warn('[moderationImage] failed, image allowed by default:', err?.message)
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
