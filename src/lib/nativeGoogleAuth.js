import { Capacitor } from '@capacitor/core'
import { supabase } from './supabase'
import { fetchMyProfile } from './userProfile'
import useAuthStore from '../store/authStore'

// ID client Web OAuth (public) — sert de "serverClientId" : l'idToken Google
// est émis pour cette audience, que Supabase valide côté serveur.
const WEB_CLIENT_ID = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID

/** Connexion Google native possible ? (app native + client ID configuré) */
export function isNativeGoogleAvailable() {
  return Capacitor.isNativePlatform() && !!WEB_CLIENT_ID
}

let initPromise = null
function ensureInit(SocialLogin) {
  if (!initPromise) {
    initPromise = SocialLogin.initialize({ google: { webClientId: WEB_CLIENT_ID } })
  }
  return initPromise
}

/** L'utilisateur a fermé le sélecteur de compte → pas une vraie erreur. */
export function isGoogleCancel(err) {
  const m = (err?.message || err?.code || '').toString().toLowerCase()
  return m.includes('cancel') || m.includes('canceled') || m.includes('dismiss') ||
    m.includes('no credential') || m.includes('12501')
}

/**
 * Connexion Google NATIVE (sélecteur de compte système via Credential Manager)
 * → session Supabase.
 *
 * Ouvre la fenêtre native Google, récupère l'idToken, ouvre la session via
 * `supabase.auth.signInWithIdToken`, puis renseigne le store (user + profil)
 * comme le fait la connexion email/mot de passe. Lève une erreur en cas
 * d'échec (annulation comprise → cf. isGoogleCancel).
 */
export async function signInWithGoogleNative() {
  const { SocialLogin } = await import('@capgo/capacitor-social-login')
  await ensureInit(SocialLogin)

  // Pas de `scopes` ici : le plugin les refuse sans config native dédiée, et
  // email + profil sont de toute façon inclus par défaut dans l'idToken.
  const res = await SocialLogin.login({
    provider: 'google',
    options: {},
  })
  const idToken = res?.result?.idToken
  if (!idToken) throw new Error('Aucun jeton Google reçu')

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: idToken,
  })
  if (error) throw error

  useAuthStore.getState().setUser(data.user)
  const profile = await fetchMyProfile().catch(() => null)
  if (profile) useAuthStore.getState().setProfile(profile)
  return data
}
