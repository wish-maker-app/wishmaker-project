// @ts-nocheck
import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const PACK_WISHES: Record<string, number> = {
  pack_starter: 3,
  pack_essential: 7,
  pack_pro: 15,
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
    if (userErr || !user) return json({ error: 'Unauthorized' }, 401)

    const { payment_intent_id } = await req.json()
    if (!payment_intent_id) return json({ error: 'payment_intent_id required' }, 400)

    const stripeRes = await fetch(`https://api.stripe.com/v1/payment_intents/${payment_intent_id}`, {
      headers: { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}` },
    })
    const pi = await stripeRes.json()
    if (!stripeRes.ok || pi.status !== 'succeeded') {
      return json({ error: `Paiement non finalise (status: ${pi.status || 'unknown'})` }, 400)
    }

    if (pi.metadata?.user_id !== user.id) {
      return json({ error: 'Paiement appartient a un autre utilisateur' }, 403)
    }

    // === CLAIM ATOMIQUE ===
    // On "reserve" la transaction (UPDATE status -> succeeded, WHERE status != succeeded).
    // 1 ligne = on a gagne la course ; 0 ligne = deja traitee par un autre appel.
    const { data: claimed, error: claimErr } = await adminClient
      .from('transactions')
      .update({ status: 'succeeded' })
      .eq('payment_intent_id', payment_intent_id)
      .neq('status', 'succeeded')
      .select()
      .maybeSingle()

    if (claimErr) {
      console.error('[transactions claim]', claimErr.message)
      return json({ error: 'Erreur claim transaction' }, 500)
    }
    if (!claimed) {
      const { data: existing } = await adminClient
        .from('transactions')
        .select('type, status')
        .eq('payment_intent_id', payment_intent_id)
        .maybeSingle()
      if (!existing) return json({ error: 'Transaction introuvable' }, 404)
      return json({ success: true, already_applied: true, type: existing.type })
    }

    const type = claimed.type
    const wishId = claimed.wish_id

    // === APPLICATION ===
    // BLINDAGE : si l'application echoue, on REMET la transaction en 'pending'
    // pour ne JAMAIS laisser un paiement "succeeded" sans contrepartie (sinon
    // argent pris + rien applique + le retry renvoie already_applied). Bug
    // historique : extend_wish lisait une table app_config inexistante -> 500,
    // user debite, voeu non prolonge.
    try {
      if (type === 'pack_starter' || type === 'pack_essential' || type === 'pack_pro') {
        const wishesToAdd = PACK_WISHES[type]
        const { error: insertErr } = await adminClient.from('wish_packs').insert({
          user_id: user.id,
          pack_type: type,
          prix: claimed.amount_cents / 100,
          wishes_added: wishesToAdd,
        })
        if (insertErr) throw new Error(`wish_packs insert: ${insertErr.message}`)
      } else if (type === 'urgent_boost') {
        if (!wishId) throw new Error('wish_id manquant')
        const { error } = await authClient.rpc('make_urgent', { wish_id: wishId })
        if (error) throw new Error(`make_urgent: ${error.message}`)
      } else if (type === 'extension') {
        if (!wishId) throw new Error('wish_id manquant')
        const { error } = await authClient.rpc('extend_wish', { wish_id: wishId })
        if (error) throw new Error(`extend_wish: ${error.message}`)
      } else {
        throw new Error(`Type non supporte: ${type}`)
      }
    } catch (applyErr) {
      // Revert du claim -> la transaction redevient 'pending', le paiement
      // pourra etre re-applique (ou rembourse) au lieu de rester en limbe.
      await adminClient
        .from('transactions')
        .update({ status: 'pending' })
        .eq('payment_intent_id', payment_intent_id)
      console.error('[apply-purchase] application echouee, claim annule:', applyErr?.message)
      return json({ error: String(applyErr?.message || applyErr), reverted: true }, 500)
    }

    return json({ success: true, type, wish_id: wishId })
  } catch (err) {
    console.error('[apply-purchase]', err)
    return json({ error: String(err?.message || err) }, 500)
  }
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}
