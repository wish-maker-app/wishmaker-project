// @ts-nocheck
// Supabase Edge Function — backfill-invoices
//
// Genere retroactivement une facture Stripe pour chaque paiement DEJA encaisse
// via PaymentIntent et qui n'en a pas encore (transactions.stripe_invoice_id IS
// NULL). A lancer une fois apres la mise en place de la facturation automatique
// dans apply-purchase ; relancable sans risque (idempotent).
//
// Body : { "dry_run": true }  -> ne cree RIEN, liste seulement ce qui serait fait
//        { "dry_run": false } -> cree les factures pour de vrai
//
// Reserve au service_role (la fonction ecrit dans la compta Stripe).

import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const LIBELLES: Record<string, string> = {
  pack_starter: 'Pack Starter — 3 vœux supplémentaires',
  pack_essential: 'Pack Essential — 7 vœux supplémentaires',
  pack_pro: 'Pack Pro — 15 vœux supplémentaires',
  urgent_boost: 'Mise en avant « Urgent »',
  extension: 'Prolongation de vœu',
}

async function stripeApi(path, { method = 'POST', body, idempotencyKey } = {}) {
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

let cachedTaxRateId: string | null = null
async function getTvaRateId(): Promise<string> {
  if (cachedTaxRateId) return cachedTaxRateId
  const list = await stripeApi('/tax_rates?limit=100&active=true', { method: 'GET' })
  const found = (list.data || []).find((r) => r.metadata?.wishmaker === 'tva_fr_20_ttc')
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

async function getOrCreateCustomer(u) {
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

async function creerFacturePayee({ customerId, type, amountCents, paymentIntentId, taxRateId, dateAchat }) {
  const libelle = LIBELLES[type] || type

  const invoice = await stripeApi('/invoices', {
    body: {
      customer: customerId,
      currency: 'eur',
      collection_method: 'charge_automatically',
      auto_advance: 'false',
      pending_invoice_items_behavior: 'exclude',
      description: libelle,
      'metadata[payment_intent_id]': paymentIntentId,
      'metadata[type]': type,
      // Trace la date reelle de l'encaissement : la facture est emise
      // aujourd'hui mais porte sur une vente anterieure.
      'metadata[date_achat]': dateAchat,
      'metadata[backfill]': 'true',
    },
    idempotencyKey: `wm_inv_${paymentIntentId}`,
  })

  await stripeApi('/invoiceitems', {
    body: {
      customer: customerId,
      invoice: invoice.id,
      currency: 'eur',
      unit_amount: String(amountCents),
      quantity: '1',
      description: `${libelle} (achat du ${dateAchat})`,
      'tax_rates[0]': taxRateId,
    },
    idempotencyKey: `wm_invitem_${paymentIntentId}`,
  })

  await stripeApi(`/invoices/${invoice.id}/finalize_invoice`, {
    body: { auto_advance: 'false' },
    idempotencyKey: `wm_invfin_${paymentIntentId}`,
  })

  return await stripeApi(`/invoices/${invoice.id}/pay`, {
    body: { paid_out_of_band: 'true' },
    idempotencyKey: `wm_invpay_${paymentIntentId}`,
  })
}

function decodeRole(authHeader: string | null): string {
  try {
    const part = (authHeader || '').replace(/^Bearer\s+/i, '').split('.')[1]
    if (!part) return 'anon'
    let b64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const pad = b64.length % 4
    if (pad) b64 += '='.repeat(4 - pad)
    return JSON.parse(atob(b64)).role || 'anon'
  } catch {
    return 'anon'
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS })

  if (decodeRole(req.headers.get('Authorization')) !== 'service_role') {
    return json({ error: 'Forbidden — service_role requis' }, 403)
  }

  const { dry_run = true } = await req.json().catch(() => ({}))
  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Ordre CHRONOLOGIQUE : les numeros de facture Stripe sont sequentiels, ils
  // doivent suivre l'ordre des ventes et non un ordre arbitraire.
  const { data: rows, error } = await admin
    .from('transactions')
    .select('id, user_id, type, payment_intent_id, amount_cents, created_at')
    .eq('status', 'succeeded')
    .is('stripe_invoice_id', null)
    .not('payment_intent_id', 'is', null)
    .order('created_at', { ascending: true })

  if (error) return json({ error: error.message }, 500)

  const resultats = []
  let crees = 0
  let ignores = 0
  let echecs = 0

  for (const tx of rows || []) {
    const dateAchat = String(tx.created_at).slice(0, 10)
    try {
      // Garde-fou : on ne facture que ce qui est reellement encaisse cote
      // Stripe (une ligne 'succeeded' en base mais annulee chez Stripe ne doit
      // pas produire de facture).
      const pi = await stripeApi(`/payment_intents/${tx.payment_intent_id}`, { method: 'GET' })
      if (pi.status !== 'succeeded') {
        ignores++
        resultats.push({ tx: tx.id, date: dateAchat, statut: `ignore (stripe: ${pi.status})` })
        continue
      }

      const { data: profil } = await admin
        .from('users')
        .select('email, prenom, nom, pseudo')
        .eq('id', tx.user_id)
        .maybeSingle()
      if (!profil?.email) {
        ignores++
        resultats.push({ tx: tx.id, date: dateAchat, statut: 'ignore (email introuvable)' })
        continue
      }

      if (dry_run) {
        resultats.push({
          tx: tx.id,
          date: dateAchat,
          type: tx.type,
          montant: `${(tx.amount_cents / 100).toFixed(2)} €`,
          email: profil.email,
          statut: 'A FACTURER',
        })
        crees++
        continue
      }

      const [customerId, taxRateId] = await Promise.all([
        getOrCreateCustomer({ id: tx.user_id, ...profil }),
        getTvaRateId(),
      ])

      const inv = await creerFacturePayee({
        customerId,
        type: tx.type,
        amountCents: tx.amount_cents,
        paymentIntentId: tx.payment_intent_id,
        taxRateId,
        dateAchat,
      })

      await admin
        .from('transactions')
        .update({
          stripe_invoice_id: inv.id,
          invoice_number: inv.number,
          invoice_pdf: inv.invoice_pdf,
        })
        .eq('id', tx.id)

      crees++
      resultats.push({ tx: tx.id, date: dateAchat, type: tx.type, facture: inv.number, statut: 'CREEE' })
    } catch (err) {
      echecs++
      resultats.push({ tx: tx.id, date: dateAchat, statut: `ECHEC: ${err?.message || err}` })
    }
  }

  return json({ dry_run, total: (rows || []).length, crees, ignores, echecs, resultats })
})

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  })
}
