// Edge Function — re-engagement-mail
// Cron tous les lundis à 9h : envoie un email aux users inactifs depuis 14+ jours
// (provider : Brevo — https://api.brevo.com/v3/smtp/email)

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const BREVO_API_KEY = Deno.env.get('BREVO_API_KEY') || ''

serve(async () => {
  if (!BREVO_API_KEY) {
    return new Response(JSON.stringify({ error: 'BREVO_API_KEY not configured' }), { status: 400 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString()
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // Users inactifs 14+ jours, avec consentement email, ayant créé au moins 1 vœu.
  // last_active_at = marqueur d'activité posé à chaque ouverture de l'app.
  const { data: users } = await supabase
    .from('users')
    .select('id, pseudo, email, email_unsub_token, last_active_at')
    .eq('email_consent', true)
    .lt('last_active_at', fourteenDaysAgo)

  if (!users || users.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let sent = 0

  for (const user of users) {
    if (!user.email) continue

    // Vérifier qu'il a au moins 1 vœu
    const { count } = await supabase
      .from('wishes')
      .select('*', { count: 'exact', head: true })
      .eq('wisher_id', user.id)

    if (!count || count === 0) continue

    // Vérifier qu'on n'a pas envoyé de mail de ré-engagement ces 7 derniers jours
    const { data: recentMail } = await supabase
      .from('notification_log')
      .select('id')
      .eq('user_id', user.id)
      .eq('type', 'reengagement_mail')
      .gte('sent_at', sevenDaysAgo)
      .maybeSingle()

    if (recentMail) continue

    try {
      const pseudo = user.pseudo || 'Wisher'
      const unsubUrl = `${SUPABASE_URL}/functions/v1/email-unsubscribe?token=${user.email_unsub_token}`
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': BREVO_API_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: 'Wish Maker', email: 'noreply@wishmaker.fr' },
          to: [{ email: user.email, name: pseudo }],
          subject: 'Des Makers attendent près de chez vous !',
          htmlContent: `
            <div style="font-family:'Plus Jakarta Sans',sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
              <div style="text-align:center;margin-bottom:24px;">
                <h1 style="font-size:24px;color:#1A1A2E;margin:0;">Wish Maker</h1>
              </div>
              <p style="color:#1A1A2E;font-size:15px;">Bonjour @${pseudo},</p>
              <p style="color:#8A8A9A;font-size:14px;line-height:1.6;">
                De nouveaux vœux ont été publiés près de chez vous.
                Des Makers sont prêts à vous aider !
              </p>
              <div style="text-align:center;margin:28px 0;">
                <a href="https://wishmaker.fr/maker"
                  style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#5B6BF5,#9B59F5);color:white;text-decoration:none;border-radius:999px;font-weight:700;font-size:14px;">
                  Voir les vœux
                </a>
              </div>
              <hr style="border:none;border-top:1px solid #F0F0F0;margin:24px 0;" />
              <p style="color:#B0B0B0;font-size:11px;text-align:center;">
                <a href="${unsubUrl}" style="color:#8A8A9A;">Se désabonner des emails</a>
              </p>
            </div>
          `,
        }),
      })

      if (res.ok) {
        await supabase.from('notification_log').insert({
          user_id: user.id,
          wish_id: null,
          type: 'reengagement_mail',
        })
        sent++
      } else {
        console.error('Brevo re-engagement error:', res.status, await res.text())
      }
    } catch (err) {
      console.error('Re-engagement mail error:', err)
    }
  }

  return new Response(JSON.stringify({ sent }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
