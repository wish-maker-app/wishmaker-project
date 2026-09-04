import { Capacitor } from '@capacitor/core'

// Domaine public canonique — utilisé pour construire les liens PARTAGEABLES.
// ⚠️ Dans l'app native, window.location.origin vaut `https://localhost`
// (serveur local de la WebView) : inutilisable par le destinataire. On force
// donc le vrai domaine. Sur le web de prod, on garde l'origine réelle.
const SITE_URL = 'https://wishmaker.fr'

export function publicBaseUrl() {
  try {
    if (!Capacitor.isNativePlatform()) {
      const o = window.location.origin
      if (o && !/^https?:\/\/(localhost|127\.)/i.test(o)) return o
    }
  } catch { /* ignore */ }
  return SITE_URL
}

function isCancel(e) {
  const m = (e?.message || '').toLowerCase()
  return e?.name === 'AbortError' ||
    m.includes('cancel') || m.includes('abort') || m.includes('dismiss')
}

/**
 * Partage un lien via la feuille de partage native (app) ou la Web Share API
 * (navigateur mobile), avec repli automatique sur la copie dans le
 * presse-papier quand le partage natif n'est pas disponible.
 *
 * Retourne un statut exploitable par l'UI :
 *  - 'shared'    : partagé via la feuille de partage
 *  - 'copied'    : lien copié dans le presse-papier (repli)
 *  - 'cancelled' : l'utilisateur a fermé la feuille de partage (pas une erreur)
 *  - 'error'     : impossible de partager ET de copier
 */
export async function shareLink({ url, title, text }) {
  // App native : plugin @capacitor/share (feuille iOS/Android).
  if (Capacitor.isNativePlatform()) {
    try {
      const { Share } = await import('@capacitor/share')
      await Share.share({ title, text, url, dialogTitle: title })
      return 'shared'
    } catch (e) {
      if (isCancel(e)) return 'cancelled'
      // sinon → on tente le presse-papier ci-dessous
    }
  } else if (typeof navigator !== 'undefined' && navigator.share) {
    // Web mobile : feuille de partage native du navigateur.
    try {
      await navigator.share({ title, text, url })
      return 'shared'
    } catch (e) {
      if (isCancel(e)) return 'cancelled'
      // sinon → repli presse-papier
    }
  }

  // Repli : copie du lien.
  try {
    await navigator.clipboard.writeText(url)
    return 'copied'
  } catch {
    return 'error'
  }
}
