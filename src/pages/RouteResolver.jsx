import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { requestPushPermission } from '../lib/pushNotifications'

/**
 * Point d'entrée `/` — résout silencieusement la destination selon la session.
 *
 * Remplace l'ancien Splash screen. Sur une web app / PWA, un écran logo 2s
 * est une friction inutile à chaque chargement. Ici on affiche juste un
 * spinner discret (souvent invisible tant c'est rapide).
 *
 * Logique :
 *  - Pas de session      → /onboarding/1 (première visite) ou /auth
 *  - Session + onboarded → /maker
 *  - Session + setup incomplet → reprise au bon step
 */
export default function RouteResolver() {
  const navigate = useNavigate()
  const resolved = useRef(false)

  useEffect(() => {
    if (resolved.current) return
    resolved.current = true

    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const { data: profile } = await supabase
            .from('users')
            .select('onboarding_completed, prenom, nom, pseudo, ville')
            .eq('id', session.user.id)
            .maybeSingle()

          if (profile?.onboarding_completed) {
            requestPushPermission(session.user.id).catch(() => {})
            navigate('/maker', { replace: true })
            return
          }
          // Smart redirect : reprendre au 1er step manquant
          let dest = '/setup/profil'
          if (profile?.prenom && profile?.nom && !profile?.pseudo) dest = '/setup/pseudo'
          else if (profile?.prenom && profile?.nom && profile?.pseudo && !profile?.ville) dest = '/setup/localisation'
          navigate(dest, { replace: true })
          return
        }
        // Pas de session
        const seen = localStorage.getItem('onboarding_seen')
        navigate(seen ? '/auth' : '/onboarding/1', { replace: true })
      } catch (err) {
        console.error('[resolver]', err)
        navigate('/onboarding/1', { replace: true })
      }
    })()
  }, [navigate])

  // Spinner discret, souvent invisible (la résolution prend généralement <100ms)
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white">
      <div className="w-6 h-6 rounded-full border-2 border-[#5B6BF5] border-t-transparent animate-spin" />
    </div>
  )
}
