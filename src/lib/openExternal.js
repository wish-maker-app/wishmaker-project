import { Capacitor } from '@capacitor/core'

/**
 * Ouvre une URL EXTERNE (site tiers, Google Maps, CNIL…) proprement selon la
 * plateforme :
 *  - App native : navigateur in-app (@capacitor/browser → SFSafariViewController
 *    sur iOS, Chrome Custom Tab sur Android). L'utilisateur peut le fermer et
 *    revenir dans l'app → évite d'être « piégé » dans la WebView (et le
 *    window.open ne fonctionne de toute façon pas dans la WebView native).
 *  - Web / PWA : nouvel onglet classique.
 */
export async function openExternal(url) {
  if (!url) return
  if (Capacitor.isNativePlatform()) {
    try {
      const { Browser } = await import('@capacitor/browser')
      await Browser.open({ url })
      return
    } catch { /* si le plugin échoue, on retombe sur window.open ci-dessous */ }
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}
