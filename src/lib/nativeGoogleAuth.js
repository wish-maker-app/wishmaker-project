import { Capacitor } from '@capacitor/core'
import { supabase } from './supabase'
import { fetchMyProfile } from './userProfile'
import useAuthStore from '../store/authStore'

// ID client Web OAuth (public) — sert de "serverClientId" : l'idToken Google
// est émis pour cette audience, que Supabase valide côté serveur.
const WEB_CLIENT_ID = import.meta.env.VITE_GOOGLE_WEB_CLIENT_ID
// ID client iOS OAuth (public) — requis par le SDK Google sur iPhone.
const IOS_CLIENT_ID = import.meta.env.VITE_GOOGLE_IOS_CLIENT_ID

/** Connexion Google native possible ? (app native + client ID configuré) */
export function isNativeGoogleAvailable() {
  if (!Capacitor.isNativePlatform() || !WEB_CLIENT_ID) return false
  return Capacitor.getPlatform() !== 'ios' || !!IOS_CLIENT_ID
}

/** « Se connecter avec Apple » natif : iPhone uniquement (Android garde le flux web). */
export function isNativeAppleAvailable() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'ios'
}

let initPromise = null
function ensureInit(SocialLogin) {
  if (!initPromise) {
    const config = { google: { webClientId: WEB_CLIENT_ID } }
    if (Capacitor.getPlatform() === 'ios') {
      if (IOS_CLIENT_ID) {
        config.google.iOSClientId = IOS_CLIENT_ID
        config.google.iOSServerClientId = WEB_CLIENT_ID
      }
      // redirectUrl vide : connexion Apple 100 % native, sans retour serveur.
      config.apple = { redirectUrl: '' }
    }
    initPromise = SocialLogin.initialize(config)
  }
  return initPromise
}

/** L'utilisateur a fermé le sélecteur de compte → pas une vraie erreur. */
export function isGoogleCancel(err) {
  const m = (err?.message || err?.code || '').toString().toLowerCase()
  return m.includes('cancel') || m.includes('canceled') || m.includes('dismiss') ||
    m.includes('no credential') || m.includes('12501') ||
    m.includes('1001') // Apple : AuthorizationError.canceled
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

/** SHA-256 hexadécimal (pour le nonce Apple). */
async function sha256Hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('')
}

/**
 * « Se connecter avec Apple » NATIF (iPhone) → session Supabase.
 *
 * Nonce : Apple reçoit l'empreinte SHA-256, Supabase le nonce brut et vérifie
 * que les deux correspondent (empêche le rejeu d'un jeton intercepté).
 * Apple ne transmet le nom qu'à la toute première connexion : on le garde
 * dans les métadonnées du compte s'il est fourni.
 */
export async function signInWithAppleNative() {
  const { SocialLogin } = await import('@capgo/capacitor-social-login')
  await ensureInit(SocialLogin)

  const rawNonce = Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, '0')).join('')
  const res = await SocialLogin.login({
    provider: 'apple',
    options: { scopes: ['email', 'name'], nonce: await sha256Hex(rawNonce) },
  })
  const idToken = res?.result?.idToken
  if (!idToken) throw new Error('Aucun jeton Apple reçu')

  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: idToken,
    nonce: rawNonce,
  })
  if (error) throw error

  const profile = res?.result?.profile
  const fullName = [profile?.givenName, profile?.familyName].filter(Boolean).join(' ')
  if (fullName) {
    await supabase.auth.updateUser({ data: { full_name: fullName } }).catch(() => {})
  }

  useAuthStore.getState().setUser(data.user)
  const myProfile = await fetchMyProfile().catch(() => null)
  if (myProfile) useAuthStore.getState().setProfile(myProfile)
  return data
}
