import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { requestPushPermission } from '../lib/pushNotifications'
import useAuthStore from '../store/authStore'
import { isSuspendedActive } from '../lib/suspension'
import Landing from './Public/Landing'

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
  const [showPushPrompt, setShowPushPrompt] = useState(false)
  // Etat de la resolution :
  //  - null : on attend de savoir (verifie la session)
  //  - 'landing' : on rend la Landing publique directement (visiteur anonyme)
  //  - 'redirect' : navigate() a deja ete appelle, on attend le re-render
  //
  // ⚡ Optimisation 1er chargement : si AUCUN user n'est persisté (cas normal
  // d'un visiteur anonyme sur wishmaker.fr), on rend la Landing IMMÉDIATEMENT
  // sans attendre supabase.auth.getSession() (qui ajoutait un spinner + un
  // aller-retour avant l'affichage). La vérif session tourne quand même en fond
  // ci-dessous : si une session est trouvée, on redirige. Si un user EST
  // persisté, on garde le spinner (résolution probable = redirection /maker).
  const [renderState, setRenderState] = useState(() => {
    try {
      return useAuthStore.getState().user ? null : 'landing'
    } catch {
      return 'landing'
    }
  })
  const pendingUserId = useRef(null)

  useEffect(() => {
    if (resolved.current) return
    resolved.current = true

    ;(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const { data: profile } = await supabase
            .from('users')
            .select('onboarding_completed, prenom, nom, pseudo, ville, is_suspended, suspension_type, suspended_until')
            .eq('id', session.user.id)
            .maybeSingle()

          // Suspension active → écran dédié directement (la RLS bloque déjà
          // les écritures côté serveur, ceci est l'UX).
          if (isSuspendedActive(profile)) {
            setRenderState('redirect')
            navigate('/suspended', { replace: true })
            return
          }

          if (profile?.onboarding_completed) {
            // Vérifier si on doit montrer le pré-écran push
            const pushAsked = localStorage.getItem('push_asked')
            const pushDenied = localStorage.getItem('push_denied')
            const hasNotifAPI = 'Notification' in window && 'PushManager' in window
            const alreadyGranted = hasNotifAPI && Notification.permission === 'granted'

            if (!pushAsked && !pushDenied && hasNotifAPI && !alreadyGranted) {
              pendingUserId.current = session.user.id
              setShowPushPrompt(true)
              return
            }
            // Si déjà accordé, s'assurer que la subscription est enregistrée
            if (alreadyGranted) {
              requestPushPermission(session.user.id).catch(() => {})
            }
            setRenderState('redirect')
            navigate('/maker', { replace: true })
            return
          }
          let dest = '/setup/profil'
          if (profile?.prenom && profile?.nom && !profile?.pseudo) dest = '/setup/pseudo'
          else if (profile?.prenom && profile?.nom && profile?.pseudo && !profile?.ville) dest = '/setup/localisation'
          setRenderState('redirect')
          navigate(dest, { replace: true })
          return
        }
        // Visiteur anonyme → on rend directement la Landing publique a / .
        // L'URL ne change pas (pas de navigate). Apple Developer & Google
        // verront une vraie homepage marketing presentant Wish Maker SAS,
        // sans avoir besoin de se connecter.
        setRenderState('landing')
      } catch (err) {
        console.error('[resolver]', err)
        // Erreur lecture session : fallback sur la Landing (publique, safe)
        setRenderState('landing')
      }
    })()
  }, [navigate])

  async function handleAcceptPush() {
    localStorage.setItem('push_asked', 'true')
    if (pendingUserId.current) {
      await requestPushPermission(pendingUserId.current)
    }
    setShowPushPrompt(false)
    navigate('/maker', { replace: true })
  }

  function handleDeclinePush() {
    localStorage.setItem('push_asked', 'true')
    setShowPushPrompt(false)
    navigate('/maker', { replace: true })
  }

  // Pré-écran notifications
  if (showPushPrompt) {
    return (
      <div className="fixed inset-0 bg-white flex flex-col items-center justify-center px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center text-center max-w-[340px]"
        >
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mb-6"
            style={{ background: 'linear-gradient(135deg,#EEF0FF,#E8E0FF)' }}>
            <span className="text-4xl">🔔</span>
          </div>
          <h2 className="text-xl font-bold text-[#1A1A2E] mb-2">Restez informé</h2>
          <p className="text-sm text-[#8A8A9A] leading-relaxed mb-8">
            Activez les notifications pour être prévenu quand un Maker répond à votre vœu ou vous envoie un message.
          </p>
          <button
            onClick={handleAcceptPush}
            className="w-full h-14 rounded-full text-white font-bold text-[15px] mb-3"
            style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
          >
            Activer les notifications
          </button>
          <button
            onClick={handleDeclinePush}
            className="text-sm text-[#8A8A9A] font-medium py-2"
          >
            Plus tard
          </button>
        </motion.div>
      </div>
    )
  }

  // Visiteur anonyme → on rend la Landing publique directement a /
  if (renderState === 'landing') {
    return <Landing />
  }

  // En attente (verification session) ou redirection en cours : petit spinner
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white">
      <div className="w-6 h-6 rounded-full border-2 border-[#5B6BF5] border-t-transparent animate-spin" />
    </div>
  )
}
