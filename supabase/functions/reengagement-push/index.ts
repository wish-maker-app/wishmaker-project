// Edge Function — reengagement-push
// Cron quotidien : relance par notification PUSH les utilisateurs inactifs,
// selon la séquence J1 / J3 / J6 / J9 (cf. infographie « Stratégie
// d'automatisation »).
//
// Règle anti-spam : on envoie UNIQUEMENT le palier le plus haut atteint et pas
// encore envoyé DEPUIS la dernière activité (last_active_at). Donc :
//   - jamais de marche arrière dans la séquence,
//   - un seul push par palier et par « cycle » d'inactivité,
//   - quand l'utilisateur revient, last_active_at avance → un nouveau cycle
//     pourra repartir proprement plus tard.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const DAY = 24 * 60 * 60 * 1000

const STEPS = [
  { key: 'reengage_j1', days: 1, title: '👋 De nouveaux vœux près de chez toi', body: 'Des Wishers attendent peut-être ton aide. Viens voir les dernières demandes !' },
  { key: 'reengage_j3', days: 3, title: '🤝 Ton aide est recherchée', body: "Quelqu'un près de chez toi a peut-être besoin d'un coup de main aujourd'hui." },
  { key: 'reengage_j6', days: 6, title: '✨ Et si tu réalisais un vœu ?', body: 'Une bonne action en moins de 5 minutes. Fais une différence cette semaine.' },
  { key: 'reengage_j9', days: 9, title: '💜 Ta communauté Wish Maker t\'attend', body: 'Reviens découvrir les nouveaux vœux et de belles rencontres près de chez toi.' },
]

// Autorise uniquement le cron / serveur (clé service_role). Sans ça, n'importe
// quel utilisateur connecté pourrait déclencher une vague d'envois.
function callerRole(authHeader: string | null): string {
  try {
    if (!authHeader) return 'anon'
    const token = authHeader.replace(/^Bearer\s+/i, '')
    const part = token.split('.')[1]
    if (!part) return 'anon'
    let b64 = part.replace(/-/g, '+').replace(/_/g, '/')
    const pad = b64.length % 4
    if (pad) b64 += '='.repeat(4 - pad)
    return JSON.parse(atob(b64)).role || 'anon'
  } catch {
    return 'anon'
  }
}

serve(async (req) => {
  if (callerRole(req.headers.get('Authorization')) !== 'service_role') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const now = Date.now()
  const oneDayAgo = new Date(now - DAY).toISOString()

  // Candidats : non suspendus, inactifs depuis >= 1 jour, ayant AU MOINS une
  // subscription push (inner join → pas d'envoi dans le vide).
  const { data: candidates, error } = await supabase
    .from('users')
    .select('id, last_active_at, push_subscriptions!inner(user_id)')
    .eq('is_suspended', false)
    .lt('last_active_at', oneDayAgo)

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }
  if (!candidates || candidates.length === 0) {
    return new Response(JSON.stringify({ candidates: 0, sent: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let sent = 0
  const detail: Array<Record<string, unknown>> = []

  for (const u of candidates as any[]) {
    const daysInactive = Math.floor((now - new Date(u.last_active_at).getTime()) / DAY)

    // Palier dû = le plus haut dont le seuil est atteint.
    const dueStep = [...STEPS].reverse().find((s) => s.days <= daysInactive)
    if (!dueStep) continue

    // Ce palier a-t-il déjà été envoyé depuis la dernière activité ? (1 cycle)
    const { data: already } = await supabase
      .from('notification_log')
      .select('id')
      .eq('user_id', u.id)
      .eq('type', dueStep.key)
      .gte('sent_at', u.last_active_at)
      .limit(1)
    if (already && already.length > 0) continue

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({
          user_id: u.id,
          title: dueStep.title,
          body: dueStep.body,
          url: '/maker',
        }),
      })
      const out = await res.json().catch(() => ({}))
      // On ne journalise QUE si la push est réellement partie (sent > 0) →
      // sinon on retentera au prochain run (subscription expirée nettoyée par
      // send-push-notification, l'user sortira alors des candidats).
      if (res.ok && (out.sent ?? 0) > 0) {
        await supabase.from('notification_log').insert({ user_id: u.id, type: dueStep.key })
        sent++
        detail.push({ user: u.id, step: dueStep.key, daysInactive })
      }
    } catch (err) {
      console.error('reengagement push error', u.id, err)
    }
  }

  return new Response(JSON.stringify({ candidates: candidates.length, sent, detail }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
