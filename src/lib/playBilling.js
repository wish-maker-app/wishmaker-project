import { Capacitor } from '@capacitor/core'
import { supabase } from './supabase'

/**
 * Achats intégrés via Google Play Billing (app Android uniquement).
 *
 * Google impose son propre système de paiement pour les achats numériques
 * utilisés dans l'app (packs de vœux, boost urgent, prolongation) : Stripe y
 * est interdit. Le web, lui, reste sur Stripe (cf. lib/stripe.js).
 *
 * Flux : achat natif SANS confirmation automatique → le serveur (apply-purchase,
 * provider 'google_play') vérifie l'achat auprès de Google, crédite l'utilisateur,
 * PUIS consomme l'achat. Si le serveur échoue, l'achat n'est pas consommé : il
 * est rejoué au prochain lancement (retryPendingPlayPurchases), et Google le
 * rembourse de toute façon s'il n'est jamais confirmé sous 3 jours.
 *
 * Les identifiants produits Play Console = nos types internes :
 * pack_starter, pack_essential, pack_pro, urgent_boost, extension.
 */

const PENDING_KEY = 'play_pending_purchases'

export function isPlayBillingAvailable() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android'
}

async function plugin() {
  return import('@capgo/native-purchases')
}

/** Prix localisé affiché par Google (ex. « 2,99 € »), ou null si indisponible. */
export async function getPlayPrice(productId) {
  try {
    const { NativePurchases, PURCHASE_TYPE } = await plugin()
    const { products } = await NativePurchases.getProducts({
      productIdentifiers: [productId],
      productType: PURCHASE_TYPE.INAPP,
    })
    return products?.[0]?.priceString || null
  } catch {
    return null
  }
}

function readPending() {
  try { return JSON.parse(localStorage.getItem(PENDING_KEY) || '[]') } catch { return [] }
}
function writePending(list) {
  try { localStorage.setItem(PENDING_KEY, JSON.stringify(list)) } catch { /* ignore */ }
}

/** Envoie un achat Google au serveur, qui le vérifie, le crédite puis le consomme. */
async function sendToServer({ productId, purchaseToken, wishId }) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Non authentifié')
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/apply-purchase`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      provider: 'google_play',
      product_id: productId,
      purchase_token: purchaseToken,
      wish_id: wishId || null,
    }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(data.error || 'Erreur application achat')
    err.status = res.status
    throw err
  }
  return data
}

/**
 * Lance l'achat Google Play puis le fait appliquer par le serveur.
 * Retourne un objet compatible avec l'ancien callback Stripe : { id, provider }.
 * L'id est préfixé « gp: » → applyPurchase() (lib/stripe.js) sait que l'achat
 * est déjà appliqué et ne le rejoue pas.
 */
export async function buyWithGooglePlay({ type, wishId }) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Non authentifié')

  const { NativePurchases, PURCHASE_TYPE } = await plugin()
  const tx = await NativePurchases.purchaseProduct({
    productIdentifier: type,
    productType: PURCHASE_TYPE.INAPP,
    quantity: 1,
    appAccountToken: user.id, // lie l'achat au compte Wish Maker (anti-réutilisation)
    isConsumable: false,          // c'est le SERVEUR qui consomme, après avoir crédité
    autoAcknowledgePurchases: false,
  })
  if (!tx?.purchaseToken) throw new Error('Achat Google incomplet')

  // Mémorisé AVANT l'appel serveur : si le réseau coupe, on pourra rejouer
  // (le wish_id ne peut pas être retrouvé autrement pour urgent/prolongation).
  const pending = { productId: type, purchaseToken: tx.purchaseToken, wishId: wishId || null }
  writePending([...readPending().filter((p) => p.purchaseToken !== tx.purchaseToken), pending])

  let result
  try {
    result = await sendToServer(pending)
  } catch (err) {
    // Payé chez Google mais pas encore appliqué (réseau, serveur…) : l'achat
    // reste mémorisé et sera rejoué → l'écran doit le dire, pas « échec ».
    if (!(err?.status >= 400 && err?.status < 500)) err.paidButPending = true
    throw err
  }
  // Crédité ET confirmé chez Google → plus rien à rejouer. Si la confirmation a
  // échoué (consumed=false), on garde l'achat : le rejeu retentera la
  // confirmation (sinon Google rembourserait sous 3 jours).
  if (result?.consumed !== false) {
    writePending(readPending().filter((p) => p.purchaseToken !== tx.purchaseToken))
  }
  return { id: `gp:${tx.orderId || tx.transactionId}`, provider: 'google_play', result }
}

/**
 * Rejoue les achats payés mais pas encore appliqués (coupure réseau, app tuée
 * pendant l'appel serveur…). À appeler au démarrage, une fois connecté.
 * Le serveur est idempotent : un achat déjà crédité n'est jamais crédité deux fois.
 */
export async function retryPendingPlayPurchases() {
  if (!isPlayBillingAvailable()) return
  const list = readPending()
  if (!list.length) return
  const remaining = []
  for (const p of list) {
    try {
      const result = await sendToServer(p)
      if (result?.consumed === false) remaining.push(p) // confirmation Google à retenter
    } catch (err) {
      // 4xx = refus définitif (achat invalide, remboursé, pas le bon compte…) →
      // on abandonne. Réseau / 5xx = temporaire → on réessaiera plus tard.
      const definitive = err?.status >= 400 && err?.status < 500 && err?.status !== 401
      if (!definitive) remaining.push(p)
    }
  }
  writePending(remaining)
}
