// Edge Function — email-unsubscribe (PUBLIQUE, verify_jwt=false)
// Lien 1-clic depuis les emails : ?token=<email_unsub_token> → met
// email_consent=false pour ce user, puis affiche une page de confirmation.
// Pas d'auth : le token uuid n'est pas devinable (standard désabonnement email).

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

function page(title: string, message: string, ok: boolean) {
  return `<!doctype html><html lang="fr"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title></head>
<body style="margin:0;font-family:system-ui,-apple-system,sans-serif;background:#F5F5F7;">
  <div style="max-width:440px;margin:8vh auto;background:#fff;border-radius:20px;padding:36px 28px;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,0.06);">
    <h1 style="font-size:22px;color:#1A1A2E;margin:0 0 8px;">Wish Maker</h1>
    <div style="font-size:40px;margin:10px 0;">${ok ? '✅' : '⚠️'}</div>
    <p style="color:#1A1A2E;font-size:16px;font-weight:600;margin:0 0 6px;">${title}</p>
    <p style="color:#8A8A9A;font-size:14px;line-height:1.6;margin:0 0 24px;">${message}</p>
    <a href="https://wishmaker.fr" style="display:inline-block;padding:12px 28px;background:linear-gradient(135deg,#5B6BF5,#9B59F5);color:#fff;text-decoration:none;border-radius:999px;font-weight:700;font-size:14px;">Ouvrir Wish Maker</a>
  </div>
</body></html>`
}

function html(body: string, status = 200) {
  return new Response(body, { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
}

serve(async (req) => {
  const token = new URL(req.url).searchParams.get('token')
  if (!token) {
    return html(page('Lien invalide', "Ce lien de désabonnement est incomplet.", false), 400)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  const { data, error } = await supabase
    .from('users')
    .update({ email_consent: false })
    .eq('email_unsub_token', token)
    .select('id')
    .maybeSingle()

  if (error) {
    return html(page('Oups', "Une erreur est survenue. Réessaie dans un instant.", false), 500)
  }
  if (!data) {
    // Token inconnu : on reste vague (pas d'énumération) mais rassurant.
    return html(page('Désabonnement', "Tu ne recevras plus d'emails de notre part.", true))
  }
  return html(page("C'est fait", "Tu es désabonné·e des emails Wish Maker. Tu peux réactiver ça à tout moment dans ton profil.", true))
})
