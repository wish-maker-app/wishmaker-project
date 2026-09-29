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

// ── Facturation Stripe (facture legale numerotee par achat) ──
// Les PaymentIntent seuls ne produisent qu'un RECU. Pour un justificatif
// comptable, il faut un objet Invoice : cree -> finalise (PDF + numero) ->
// marque "paid_out_of_band" (l'argent a deja ete encaisse par le PaymentIntent,
// on ne represente donc RIEN au client).

const LIBELLES: Record<string, string> = {
  pack_starter: 'Pack Starter — 3 vœux supplémentaires',
  pack_essential: 'Pack Essential — 7 vœux supplémentaires',
  pack_pro: 'Pack Pro — 15 vœux supplémentaires',
  urgent_boost: 'Mise en avant « Urgent »',
  extension: 'Prolongation de vœu',
}

async function stripeApi(
  path: string,
  { method = 'POST', body, idempotencyKey }: { method?: string; body?: Record<string, string>; idempotencyKey?: string } = {}
) {
  const headers: Record<string, string> = { 'Authorization': `Bearer ${STRIPE_SECRET_KEY}` }
  if (body) headers['Content-Type'] = 'application/x-www-form-urlencoded'
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey
  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers,
    body: body ? new URLSearchParams(body) : undefined,
  })
  const data = await res.json()
  if (!res.ok) throw new Error(`Stripe ${path}: ${data.error?.message || res.status}`)
  return data
}

// Taux de TVA francais 20%, INCLUSIF : les prix affiches (0,99€ / 1,99€ / ...)
// sont des TTC, la facture doit donc en extraire le HT et la TVA, pas ajouter
// 20% par-dessus. Cree une seule fois puis reutilise (cache module + recherche).
let cachedTaxRateId: string | null = null
async function getTvaRateId(): Promise<string> {
  if (cachedTaxRateId) return cachedTaxRateId
  const list = await stripeApi('/tax_rates?limit=100&active=true', { method: 'GET' })
  const found = (list.data || []).find((r: any) => r.metadata?.wishmaker === 'tva_fr_20_ttc')
  if (found) return (cachedTaxRateId = found.id)
  const created = await stripeApi('/tax_rates', {
    body: {
      display_name: 'TVA',
      description: 'TVA française 20% (prix TTC)',
      percentage: '20',
      inclusive: 'true',
      country: 'FR',
      jurisdiction: 'France',
      'metadata[wishmaker]': 'tva_fr_20_ttc',
    },
    idempotencyKey: 'wm_taxrate_tva_fr_20_ttc',
  })
  return (cachedTaxRateId = created.id)
}

async function getOrCreateCustomer(u: { id: string; email: string; prenom?: string; nom?: string; pseudo?: string }) {
  const found = await stripeApi(`/customers?${new URLSearchParams({ email: u.email, limit: '1' })}`, { method: 'GET' })
  if (found.data?.length) return found.data[0].id
  const nom = [u.prenom, u.nom].filter(Boolean).join(' ') || u.pseudo || ''
  const created = await stripeApi('/customers', {
    body: {
      email: u.email,
      ...(nom && { name: nom }),
      'metadata[supabase_user_id]': u.id,
    },
    idempotencyKey: `wm_customer_${u.id}`,
  })
  return created.id
}

// La creation est idempotente (cle basee sur le payment_intent_id) et les
// etapes suivantes sont gardees par l'etat reel de la facture : un rejeu de
// apply-purchase ne cree jamais une 2e facture pour le meme paiement.
async function creerFacturePayee(opts: {
  customerId: string
  type: string
  amountCents: number
  paymentIntentId: string
  taxRateId: string
}) {
  const libelle = LIBELLES[opts.type] || opts.type

  const invoice = await stripeApi('/invoices', {
    body: {
      customer: opts.customerId,
      currency: 'eur',
      collection_method: 'charge_automatically',
      auto_advance: 'false',
      // N'aspire pas d'eventuelles lignes en attente du client : on rattache
      // explicitement la notre juste apres.
      pending_invoice_items_behavior: 'exclude',
      description: libelle,
      'metadata[payment_intent_id]': opts.paymentIntentId,
      'metadata[type]': opts.type,
    },
    idempotencyKey: `wm_inv_${opts.paymentIntentId}`,
  })

  // Un rejeu idempotent renvoie la reponse MISE EN CACHE a la creation, donc un
  // etat potentiellement perime. On relit la facture pour connaitre son etat
  // reel avant d'agir, et chaque etape n'est jouee que si elle reste a faire :
  // une reprise apres echec partiel ne doit ni dupliquer une ligne, ni
  // refinaliser une facture deja numerotee.
  let facture = await stripeApi(`/invoices/${invoice.id}`, { method: 'GET' })

  if (facture.status === 'draft') {
    if (!(facture.lines?.data?.length > 0)) {
      await stripeApi('/invoiceitems', {
        body: {
          customer: opts.customerId,
          invoice: facture.id,
          currency: 'eur',
          // unit_amount n'existe pas sur /invoiceitems (contrairement a
          // /prices) : l'API attend unit_amount_decimal, en centimes, en chaine.
          unit_amount_decimal: String(opts.amountCents),
          quantity: '1',
          description: libelle,
          'tax_rates[0]': opts.taxRateId,
        },
        idempotencyKey: `wm_invitem2_${opts.paymentIntentId}`,
      })
    }
    // Finalisation = attribution du numero + generation du PDF.
    // NB : l'endpoint est /finalize (et non /finalize_invoice, qui n'existe
    // plus depuis l'API 2026-03-25.dahlia).
    facture = await stripeApi(`/invoices/${facture.id}/finalize`, {
      body: { auto_advance: 'false' },
    })
  }

  if (facture.status === 'open') {
    // Reglee hors Stripe Billing : le PaymentIntent a deja encaisse, on ne
    // represente donc rien au client.
    facture = await stripeApi(`/invoices/${facture.id}/pay`, {
      body: { paid_out_of_band: 'true' },
    })
  }

  return facture
}

// ── Application de l'achat (commune Stripe + Google Play) ──
// adminClient (service_role) : make_urgent/extend_wish sont reservees au
// serveur (REVOKE authenticated). L'appel serveur n'a pas d'auth.uid() ;
// les RPC le gerent. wishId provient d'une transaction validee.
async function applyEffect(adminClient, userId: string, type: string, wishId: string | null, amountCents: number) {
  if (type === 'pack_starter' || type === 'pack_essential' || type === 'pack_pro') {
    const wishesToAdd = PACK_WISHES[type]
    const { error: insertErr } = await adminClient.from('wish_packs').insert({
      user_id: userId,
      pack_type: type,
      prix: amountCents / 100,
      wishes_added: wishesToAdd,
    })
    if (insertErr) throw new Error(`wish_packs insert: ${insertErr.message}`)
  } else if (type === 'urgent_boost') {
    if (!wishId) throw new Error('wish_id manquant')
    const { error } = await adminClient.rpc('make_urgent', { wish_id: wishId })
    if (error) throw new Error(`make_urgent: ${error.message}`)
  } else if (type === 'extension') {
    if (!wishId) throw new Error('wish_id manquant')
    const { error } = await adminClient.rpc('extend_wish', { wish_id: wishId })
    if (error) throw new Error(`extend_wish: ${error.message}`)
  } else {
    throw new Error(`Type non supporte: ${type}`)
  }
}

// ═══════════════ Google Play Billing (app Android) ═══════════════
// Google impose son système de paiement pour les achats numériques dans l'app.
// L'app achète SANS confirmation auto ; ici on vérifie l'achat auprès de Google
// (compte de service, secret PLAY_SERVICE_ACCOUNT), on le crédite une seule
// fois (index unique payment_intent_id = 'gp:<orderId>'), puis on le CONSOMME
// (vaut confirmation : sans elle Google rembourse sous 3 jours).
// Pas de facture Stripe : pour ces ventes, Google est le vendeur et gère la TVA.
const PLAY_PACKAGE = 'fr.wishmaker.app'
const PLAY_PRICE_CENTS: Record<string, number> = {
  pack_starter: 299,
  pack_essential: 599,
  pack_pro: 999,
  urgent_boost: 199,
  extension: 99,
}

function b64url(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function pemToDer(pem: string): Uint8Array {
  const b64 = pem.replace(/-----BEGIN [^-]+-----/, '').replace(/-----END [^-]+-----/, '').replace(/\s+/g, '')
  const bin = atob(b64)
  const der = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) der[i] = bin.charCodeAt(i)
  return der
}

let cachedPlayToken: { token: string; exp: number } | null = null
async function getPlayAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  if (cachedPlayToken && cachedPlayToken.exp > now + 60) return cachedPlayToken.token
  const raw = Deno.env.get('PLAY_SERVICE_ACCOUNT')
  if (!raw) throw new Error('PLAY_SERVICE_ACCOUNT manquant')
  const sa = JSON.parse(raw)
  const enc = (o: unknown) => b64url(new TextEncoder().encode(JSON.stringify(o)))
  const unsigned = `${enc({ alg: 'RS256', typ: 'JWT' })}.${enc({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/androidpublisher',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`
  const key = await crypto.subtle.importKey(
    'pkcs8', pemToDer(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign'],
  )
  const sig = new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned)))
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${unsigned}.${b64url(sig)}`,
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('OAuth Google Play: ' + JSON.stringify(data))
  cachedPlayToken = { token: data.access_token, exp: now + (data.expires_in || 3600) }
  return data.access_token
}

function playUrl(productId: string, token: string, suffix = '') {
  return `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PLAY_PACKAGE}` +
    `/purchases/products/${encodeURIComponent(productId)}/tokens/${encodeURIComponent(token)}${suffix}`
}

async function playGetPurchase(productId: string, token: string) {
  const res = await fetch(playUrl(productId, token), {
    headers: { Authorization: `Bearer ${await getPlayAccessToken()}` },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data?.error?.message || `HTTP ${res.status}`)
  return data
}

async function playConsume(productId: string, token: string) {
  const res = await fetch(playUrl(productId, token, ':consume'), {
    method: 'POST',
    headers: { Authorization: `Bearer ${await getPlayAccessToken()}` },
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data?.error?.message || `HTTP ${res.status}`)
  }
}

async function handleGooglePlay(adminClient, userId: string, body) {
  const productId = String(body.product_id || '')
  const token = String(body.purchase_token || '')
  const wishId = body.wish_id || null

  if (!PLAY_PRICE_CENTS[productId]) return json({ error: 'Produit inconnu' }, 400)
  if (!token) return json({ error: 'purchase_token requis' }, 400)

  // Urgent / prolongation : le vœu doit exister et appartenir à l'acheteur
  if (productId === 'urgent_boost' || productId === 'extension') {
    if (!wishId) return json({ error: 'wish_id requis' }, 400)
    const { data: wish } = await adminClient.from('wishes').select('id, wisher_id').eq('id', wishId).maybeSingle()
    if (!wish || wish.wisher_id !== userId) return json({ error: 'Vœu introuvable' }, 403)
  }

  // 1) Vérification auprès de Google
  let gp
  try {
    gp = await playGetPurchase(productId, token)
  } catch (e) {
    console.error('[apply-purchase][play] verification:', e?.message)
    return json({ error: 'Vérification Google impossible' }, 502)
  }
  if (gp.purchaseState !== 0) {
    return json({ error: `Achat non finalisé (état ${gp.purchaseState})` }, 400)
  }
  if (gp.obfuscatedExternalAccountId && gp.obfuscatedExternalAccountId !== userId) {
    return json({ error: 'Achat lié à un autre compte' }, 403)
  }

  const key = `gp:${gp.orderId || token.slice(0, 100)}`

  // 2) Enregistrement 'pending' (idempotent : index unique sur payment_intent_id)
  const { error: insErr } = await adminClient.from('transactions').insert({
    user_id: userId,
    wish_id: wishId,
    type: productId,
    payment_intent_id: key,
    amount_cents: PLAY_PRICE_CENTS[productId],
    currency: 'eur',
    status: 'pending',
    metadata: {
      provider: 'google_play',
      order_id: gp.orderId || null,
      product_id: productId,
      purchase_token: token,
      test: gp.purchaseType === 0,
      region: gp.regionCode || null,
    },
  })
  if (insErr && insErr.code !== '23505') {
    console.error('[apply-purchase][play] insert:', insErr.message)
    return json({ error: 'Erreur enregistrement transaction' }, 500)
  }

  // 3) Claim atomique (même principe que Stripe)
  const { data: claimed, error: claimErr } = await adminClient
    .from('transactions')
    .update({ status: 'succeeded' })
    .eq('payment_intent_id', key)
    .eq('user_id', userId)
    .neq('status', 'succeeded')
    .select()
    .maybeSingle()
  if (claimErr) {
    console.error('[apply-purchase][play] claim:', claimErr.message)
    return json({ error: 'Erreur claim transaction' }, 500)
  }
  if (!claimed) {
    const { data: existing } = await adminClient
      .from('transactions').select('type, status, user_id').eq('payment_intent_id', key).maybeSingle()
    if (!existing || existing.user_id !== userId) return json({ error: 'Transaction introuvable' }, 403)
    if (existing.status === 'succeeded') {
      // Déjà crédité : on (re)tente juste la consommation si elle avait échoué
      let consumed = gp.consumptionState === 1
      if (!consumed) {
        try { await playConsume(productId, token); consumed = true } catch (e) {
          console.error('[apply-purchase][play] consume:', e?.message)
        }
      }
      return json({ success: true, already_applied: true, type: existing.type, consumed })
    }
    return json({ error: `Transaction ${existing.status}` }, 409)
  }

  // Jeton déjà consommé alors qu'aucun crédit n'a été fait : anormal → refus
  if (gp.consumptionState === 1) {
    await adminClient.from('transactions').update({ status: 'failed' }).eq('payment_intent_id', key)
    return json({ error: 'Achat déjà utilisé' }, 409)
  }

  // 4) Application (valeurs de la transaction enregistrée, pas du corps de la requête)
  try {
    await applyEffect(adminClient, userId, claimed.type, claimed.wish_id, claimed.amount_cents)
  } catch (applyErr) {
    await adminClient.from('transactions').update({ status: 'pending' }).eq('payment_intent_id', key)
    console.error('[apply-purchase][play] application echouee, claim annule:', applyErr?.message)
    return json({ error: String(applyErr?.message || applyErr), reverted: true }, 500)
  }

  // 5) Consommation (= confirmation). Si elle échoue, l'achat reste crédité ;
  // le client rejouera et on retentera la consommation (branche already_applied).
  let consumed = true
  try {
    await playConsume(productId, token)
  } catch (e) {
    consumed = false
    console.error('[apply-purchase][play] consume:', e?.message)
  }

  return json({ success: true, type: claimed.type, wish_id: claimed.wish_id, consumed })
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

    const body = await req.json()

    // Achat fait dans l'app Android via Google Play Billing
    if (body?.provider === 'google_play') {
      return await handleGooglePlay(adminClient, user.id, body)
    }

    const { payment_intent_id } = body
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
      await applyEffect(adminClient, user.id, type, wishId, claimed.amount_cents)
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

    // === FACTURE ===
    // Best-effort STRICT : l'achat est deja applique et paye, un echec de
    // facturation ne doit JAMAIS le remettre en cause (sinon on annulerait une
    // prestation deja rendue pour un simple probleme de document). On loggue et
    // la facture pourra etre rattrapee par la fonction backfill-invoices.
    let facture: { number?: string; pdf?: string } = {}
    try {
      const { data: profil } = await adminClient
        .from('users')
        .select('email, prenom, nom, pseudo')
        .eq('id', user.id)
        .maybeSingle()

      const email = profil?.email || user.email
      if (!email) throw new Error('email introuvable pour la facture')

      const [customerId, taxRateId] = await Promise.all([
        getOrCreateCustomer({ id: user.id, email, ...profil }),
        getTvaRateId(),
      ])

      const inv = await creerFacturePayee({
        customerId,
        type,
        amountCents: claimed.amount_cents,
        paymentIntentId: payment_intent_id,
        taxRateId,
      })

      await adminClient
        .from('transactions')
        .update({
          stripe_invoice_id: inv.id,
          invoice_number: inv.number,
          invoice_pdf: inv.invoice_pdf,
        })
        .eq('payment_intent_id', payment_intent_id)

      facture = { number: inv.number, pdf: inv.invoice_pdf }
    } catch (invErr) {
      console.error('[apply-purchase] facture non generee:', invErr?.message || invErr)
    }

    return json({ success: true, type, wish_id: wishId, facture })
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
