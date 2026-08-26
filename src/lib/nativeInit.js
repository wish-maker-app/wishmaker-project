import { Capacitor } from '@capacitor/core'

/**
 * Initialisation native (Capacitor) — barre de statut, etc.
 *
 * ⚠️ Ne s'exécute QUE dans l'app native (iOS/Android). Sur le web/PWA,
 * `Capacitor.isNativePlatform()` renvoie false → on sort immédiatement, donc
 * AUCUN impact sur le site Vercel / la PWA (le code n'est même pas atteint).
 *
 * Le clavier (resize: native) et le splash screen sont configurés dans
 * capacitor.config.json — pas besoin de code ici pour eux.
 */
export async function initNative() {
  if (!Capacitor.isNativePlatform()) return
  const platform = Capacitor.getPlatform()

  // Barre de statut : contenu SOMBRE (l'app est sur fond clair).
  // NB: dans @capacitor/status-bar, Style.Light = texte sombre pour fond clair.
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar')
    await StatusBar.setStyle({ style: Style.Light })
    if (platform === 'android') {
      // Empêche le contenu de passer SOUS la barre de statut + fond cohérent.
      await StatusBar.setOverlaysWebView({ overlay: false })
      await StatusBar.setBackgroundColor({ color: '#FFFFFF' })
    }
  } catch { /* plugin indisponible → on ignore silencieusement */ }
}
