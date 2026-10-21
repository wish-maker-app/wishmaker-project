// @ts-nocheck
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

// Prix fixes (centimes) des SEULS produits payants de la plateforme.
// Le service (mise en relation Wisher<->Maker) est GRATUIT et reglé en direct
// entre les deux personnes : il n'y a PLUS de paiement de service ici, donc
// PLUS de commission plateforme (l'ancien type 'wish_payment' + COMMISSION_RATE
// ont ete retires).
// ⚠️ Mêmes prix que les produits Google Play / App Store (apply-purchase).
const FIXED_PRICES: Record<string, number> = {
  urgent_boost: 199,
  extension: 199,
  pack_starter: 499,
  pack_essential: 999,
  pack_pro: 1599,
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) return json({ error: 'Missing Authorization' }, 401)

    const authClient = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      global: { headers: { Authorization: authHeader } },
    })
    const adminClient = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

    const { data: { user }, error: userErr } = await authClient.auth.getUser()
    if (userErr || !user) return json({ error: 'Unauthorized: ' + (userErr?.message || 'no user') }, 401)

    const body = await req.json()
    const { type, wish_id, metadata = {} } = body
    if (!type) return json({ error: 'type required' }, 400)

    // Seuls les produits a prix fixe sont acceptes (packs / urgent / extension).
    const amount = FIXED_PRICES[type]
    if (!amount) return json({ error: `type invalide: ${type}` }, 400)

    if (!STRIPE_SECRET_KEY) return json({ error: 'Configuration Stripe manquante cote serveur' }, 500)

    const stripeRes = await fetch('https://api.stripe.com/v1/payment_intents', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        amount: String(amount),
        currency: 'eur',
        capture_method: 'automatic',
        'automatic_payment_methods[enabled]': 'true',
        'metadata[user_id]': user.id,
        'metadata[type]': type,
        ...(wish_id && { 'metadata[wish_id]': wish_id }),
        ...Object.entries(metadata).reduce((acc: Record<string, string>, [k, v]) => {
          acc[`metadata[${k}]`] = String(v)
          return acc
        }, {}),
      }),
    })

    const pi = await stripeRes.json()
    if (!stripeRes.ok) {
      console.error('[stripe error]', JSON.stringify(pi))
      return json({ error: pi.error?.message || 'Stripe error' }, 500)
    }

    // Trace la transaction (pending). Plus aucune ecriture de commission /
    // maker_amount sur le voeu : le modele de paiement de service a ete retire.
    const { error: txErr } = await adminClient.from('transactions').insert({
      user_id: user.id,
      wish_id: wish_id || null,
      type,
      payment_intent_id: pi.id,
      amount_cents: amount,
      currency: 'eur',
      status: 'pending',
      metadata: { ...metadata, capture_method: 'automatic' },
    })
    if (txErr) console.error('[transactions insert FAILED]', txErr.message, txErr.details)

    return json({
      client_secret: pi.client_secret,
      payment_intent_id: pi.id,
      amount_cents: amount,
      capture_method: 'automatic',
    })
  } catch (err) {
    console.error('[create-payment-intent]', err?.message, err?.stack)
    return json({ error: String(err?.message || err) }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}
