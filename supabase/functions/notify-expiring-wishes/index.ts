// Edge Function — notify-expiring-wishes
// Cron toutes les heures : notifie les users dont un vœu expire dans < 24h
// Push PWA + Email (Resend) si consentement

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || ''

serve(async () => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Vœux qui expirent dans les 24 prochaines heures et pas encore notifiés
  const now = new Date().toISOString()
  const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const { data: wishes } = await supabase
    .from('wishes')
    .select('id, titre, wisher_id, expires_at, wisher:users!wisher_id(id, pseudo, email, email_consent)')
    .eq('statut', 'en_attente')
    .gt('expires_at', now)
    .lt('expires_at', in24h)

  if (!wishes || wishes.length === 0) {
    return new Response(JSON.stringify({ processed: 0 }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  let pushSent = 0
  let mailSent = 0

  for (const wish of wishes) {
    const userId = wish.wisher_id
    const wisher = wish.wisher as any

    // Vérifier si déjà notifié (push)
    const { data: existingPush } = await supabase
      .from('notification_log')
      .select('id')
      .eq('wish_id', wish.id)
      .eq('type', 'expiration_push')
      .maybeSingle()

    if (!existingPush) {
      // Envoyer push via l'Edge Function send-push-notification
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/send-push-notification`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          },
          body: JSON.stringify({
            user_id: userId,
            title: '⏱️ Votre vœu expire bientôt !',
            body: `"${wish.titre}" expire dans moins de 24h. Prolongez-le !`,
            url: '/wisher',
          }),
        })
        await supabase.from('notification_log').insert({
          user_id: userId,
          wish_id: wish.id,
          type: 'expiration_push',
        })
        pushSent++
      } catch (err) {
        console.error('Push expiration error:', err)
      }
    }

    // Email si consentement
    if (wisher?.email_consent && RESEND_API_KEY) {
      const { data: existingMail } = await supabase
        .from('notification_log')
        .select('id')
        .eq('wish_id', wish.id)
        .eq('type', 'expiration_mail')
        .maybeSingle()

      if (!existingMail) {
        try {
          const pseudo = wisher.pseudo || 'Wisher'
          const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: 'Wish Maker <noreply@wishmaker.fr>',
              to: [wisher.email],
              subject: '⏱️ Votre vœu expire bientôt !',
              html: `
                <div style="font-family:'Plus Jakarta Sans',sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;">
                  <div style="text-align:center;margin-bottom:24px;">
                    <h1 style="font-size:24px;color:#1A1A2E;margin:0;">Wish Maker</h1>
                  </div>
                  <p style="color:#1A1A2E;font-size:15px;">Bonjour @${pseudo},</p>
                  <p style="color:#8A8A9A;font-size:14px;line-height:1.6;">
                    Votre vœu <strong>"${wish.titre}"</strong> expire dans moins de 24h.
                    Prolongez-le pour continuer à recevoir des propositions !
                  </p>
                  <div style="text-align:center;margin:28px 0;">
                    <a href="https://wishmaker.fr/wisher"
                      style="display:inline-block;padding:14px 32px;background:linear-gradient(135deg,#5B6BF5,#9B59F5);color:white;text-decoration:none;border-radius:999px;font-weight:700;font-size:14px;">
                      Prolonger mon vœu
                    </a>
                  </div>
                  <hr style="border:none;border-top:1px solid #F0F0F0;margin:24px 0;" />
                  <p style="color:#B0B0B0;font-size:11px;text-align:center;">
                    <a href="https://wishmaker.fr/profile" style="color:#8A8A9A;">Se désabonner des emails</a>
                  </p>
                </div>
              `,
            }),
          })

          if (res.ok) {
            await supabase.from('notification_log').insert({
              user_id: userId,
              wish_id: wish.id,
              type: 'expiration_mail',
            })
            mailSent++
          }
        } catch (err) {
          console.error('Mail expiration error:', err)
        }
      }
    }
  }

  return new Response(JSON.stringify({ processed: wishes.length, pushSent, mailSent }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
