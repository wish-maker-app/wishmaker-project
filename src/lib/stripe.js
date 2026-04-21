import { loadStripe } from '@stripe/stripe-js'
import { supabase } from './supabase'

/**
 * Singleton Stripe.js — chargé une seule fois.
 */
let stripePromise = null
export function getStripe() {
  if (!stripePromise) {
    const pk = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY
    if (!pk) {
      console.error('[stripe] VITE_STRIPE_PUBLISHABLE_KEY manquante dans .env')
    }
    stripePromise = loadStripe(pk)
  }
  return stripePromise
}

/**
 * Appelle l'Edge Function Supabase `create-payment-intent` et retourne
 * le client_secret + le paymentIntent id à utiliser avec Stripe Elements.
 *
 * @param {object} params
 * @param {'wish_payment'|'urgent_boost'|'extension'|'pack_starter'|'pack_essential'|'pack_pro'} params.type
 * @param {number} [params.amount_cents] - requis uniquement pour wish_payment
 * @param {string} [params.wish_id]
 * @param {object} [params.metadata]
 */
export async function createPaymentIntent({ type, amount_cents, wish_id, metadata = {} }) {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) throw new Error('Non authentifié')

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
  const res = await fetch(`${supabaseUrl}/functions/v1/create-payment-intent`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ type, amount_cents, wish_id, metadata }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Erreur création paiement')
  return data // { client_secret, payment_intent_id, amount_cents, capture_method }
}

/**
 * Format helper : centimes → "X,XX€"
 */
export function formatEuros(cents) {
  return `${(cents / 100).toFixed(2).replace('.', ',')}€`
}
