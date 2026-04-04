// Supabase Edge Function — send-push-notification
// Envoie des notifications push via Web Push API
// Déclenchée par un webhook Supabase sur INSERT dans messages
// ou appelée manuellement pour les vœux expirants

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_EMAIL = Deno.env.get('VAPID_EMAIL') || 'contact@wishmaker.app'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

serve(async (req) => {
  try {
    const { type, user_id, title, body, url } = await req.json()

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Récupérer les subscriptions du user cible
    const { data: subscriptions } = await supabase
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id)

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: 'No subscriptions found' }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    const payload = JSON.stringify({
      title: title || 'Wish Maker',
      body: body || 'Nouvelle notification',
      url: url || '/',
      tag: type || 'default',
    })

    let sent = 0
    for (const sub of subscriptions) {
      try {
        // Utiliser l'API Web Push via fetch
        const pushEndpoint = sub.endpoint
        const response = await fetch(pushEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'TTL': '86400',
          },
          body: payload,
        })

        if (response.ok || response.status === 201) {
          sent++
        } else if (response.status === 410 || response.status === 404) {
          // Subscription expirée, la supprimer
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('id', sub.id)
        }
      } catch (err) {
        console.error('Push send error:', err)
      }
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    })
  }
})
