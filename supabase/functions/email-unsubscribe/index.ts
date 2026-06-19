// Edge Function — email-unsubscribe (PUBLIQUE, verify_jwt=false)
// Lien 1-clic depuis les emails : ?token=<email_unsub_token> → met
// email_consent=false pour ce user, puis REDIRIGE vers l'app (qui affiche un
// toast de confirmation). On redirige au lieu de renvoyer du HTML car la
// passerelle Supabase force text/plain sur les réponses de fonction ouvertes
// en navigateur (le HTML s'affichait en texte brut). Le 302 passe outre.
// Pas d'auth : le token uuid n'est pas devinable (standard désabonnement email).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const APP_URL = 'https://www.wishmaker.fr'

function redirect(status: 'ok' | 'err') {
  return new Response(null, { status: 302, headers: { Location: `${APP_URL}/?unsub=${status}` } })
}

Deno.serve(async (req) => {
  const token = new URL(req.url).searchParams.get('token')
  if (!token) return redirect('err')

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  try {
    // Idempotent : un token inconnu ne met rien à jour, mais on confirme quand
    // même (vague → pas d'énumération de tokens).
    await supabase.from('users').update({ email_consent: false }).eq('email_unsub_token', token)
  } catch { /* best-effort */ }

  return redirect('ok')
})
