import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, withTimeout } from '../lib/supabase'
import { logEvent } from '../lib/clientLog'
import useAuthStore from '../store/authStore'

export function useAuth() {
  // Sélecteurs sélectifs : chaque ligne n'observe qu'une seule slice du store,
  // donc seuls les composants qui utilisent la prop changée re-renderent.
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)
  const setUser = useAuthStore((s) => s.setUser)
  const setProfile = useAuthStore((s) => s.setProfile)
  const logout = useAuthStore((s) => s.logout)
  const bumpAuthTick = useAuthStore((s) => s.bumpAuthTick)
  const navigate = useNavigate()

  useEffect(() => {
    // Au mount : on re-synchronise le store Zustand avec la VRAIE session Supabase.
    // Sinon après un refresh, le store persisté peut montrer un user logué alors
    // que la session Supabase a expiré/disparu → queries retournent vide (RLS).
    ;(async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (session?.user) {
        const expiresAt = (session.expires_at || 0) * 1000
        let activeSession = session

        // Si le token expire dans <5min, refresh anticipé
        if (expiresAt - Date.now() < 5 * 60 * 1000) {
          try {
            const { data: refreshed } = await supabase.auth.refreshSession()
            if (refreshed?.session) activeSession = refreshed.session
          } catch {}
        }
        setUser(activeSession.user)

        // ⚡ Propagation explicite du JWT à Realtime → les RLS-protected channels
        // (messages, conversations) reçoivent bien les events filtrés par participant.
        // Sans ça, Realtime peut conserver un ancien token après refresh → events
        // silencieusement bloqués par RLS, sensation de "BDD pas connectée".
        try { supabase.realtime.setAuth(activeSession.access_token) } catch {}

        // ⚡ Bump authTick IMMÉDIATEMENT après validation session, AVANT le fetch
        // profile. Sinon les pages (Inbox, Maker/Home) qui dépendent de authTick
        // attendent ~500ms le retour du profil avant de re-fetcher → écran "vide"
        // pendant ce temps. Le bump précoce déclenche le re-fetch des pages dès
        // que la session est connue valide, en parallèle du fetch profile.
        bumpAuthTick()

        // Skip refetch profil si déjà en store pour le bon user → évite flash blanc
        // au retour de Profile/Edit (le hook re-fire à chaque mount sinon).
        const cachedProfile = useAuthStore.getState().profile
        if (!cachedProfile || cachedProfile.id !== activeSession.user.id) {
          await fetchProfile(activeSession.user.id)
        }
      } else if (useAuthStore.getState().user) {
        // Session absente alors que le store croit l'utilisateur connecté.
        // DEUX cas très différents :
        //  - Échec TRANSITOIRE du refresh interne (réseau zombie au cold start
        //    d'une PWA discardée — auth-js renvoie session null + erreur
        //    retryable SANS effacer le storage) → on NE déconnecte PAS, on
        //    lance la chaîne de retries du réveil ; l'utilisateur garde son
        //    cache à l'écran et la session revient en quelques secondes.
        //  - Vraiment plus de session (logout autre onglet, token révoqué,
        //    storage purgé) → logout + retour à l'auth, comme avant.
        const retryable = sessionError && (
          sessionError.name === 'AuthRetryableFetchError' ||
          sessionError.status === 0 ||
          /fetch|network|timeout|failed/i.test(sessionError.message || '')
        )
        if (retryable) {
          console.warn('[useAuth] session irrécupérable au mount (réseau ?), retry au lieu de logout:', sessionError?.message)
          handleResume()
        } else {
          logout()
          navigate('/auth', { replace: true })
        }
      }
    })()

    // ─── Réveil de l'app (retour d'arrière-plan) ───
    // Deux évènements DISTINCTS à couvrir :
    //  - 'visibilitychange' (visible) : changement d'onglet, minimisation, ou
    //    réveil PWA mobile.
    //  - window 'focus' : sur DESKTOP, quand on bascule vers une AUTRE APP
    //    (ex: éditeur de code) en laissant la fenêtre Chrome visible, le
    //    navigateur ne déclenche PAS visibilitychange (la page reste "visible")
    //    mais déclenche bien blur/focus. Sans ce handler, l'app ne se
    //    re-synchronise jamais au retour d'app → connexion réseau morte →
    //    la requête suivante (ex: ouvrir un vœu) hang.
    // On reconnecte la session + Realtime et on bump authTick (les pages
    // refetchent, et leur dedup absorbe un éventuel double déclenchement).
    let lastResumeTs = 0
    let resumeRetryTimer = null
    let disposed = false // posé au cleanup : un resume en vol ne doit plus replanifier
    // Délais des retries au réveil. Le 1er essai part presque toujours sur une
    // connexion HTTP/2 zombie (4-8s d'abort+retry) : un échec ici était
    // DÉFINITIF avant (one-shot) → plus aucune resynchro sans tuer l'app.
    const RESUME_RETRY_DELAYS = [1500, 4000, 10000]
    async function handleResume(attempt = 0) {
      if (attempt === 0) {
        // Anti double-run : focus + visibilitychange peuvent tomber ensemble.
        if (Date.now() - lastResumeTs < 1000) return
        lastResumeTs = Date.now()
        // Un nouveau réveil annule la chaîne de retries précédente.
        if (resumeRetryTimer) { clearTimeout(resumeRetryTimer); resumeRetryTimer = null }
      }
      try {
        // Borné : getSession peut hanger sur le verrou interne d'auth-js
        // pendant qu'un refresh rame sur la connexion morte.
        const { data: { session } } = await withTimeout(supabase.auth.getSession(), 8000, 'SESSION_TIMEOUT')
        if (!session) {
          // Pas de session : si le store croit qu'on est connecté, c'est un
          // échec transitoire de restauration/refresh → on réessaie. Sinon
          // (vraiment déconnecté, ex: page login), on ne fait rien.
          if (useAuthStore.getState().user) throw new Error('NO_SESSION_AT_RESUME')
          return
        }
        let activeSession = session
        const expiresAt = (session.expires_at || 0) * 1000
        // Refresh si token expire dans < 60s
        if (expiresAt - Date.now() < 60 * 1000) {
          const { data: refreshed } = await withTimeout(supabase.auth.refreshSession(), 8000, 'REFRESH_TIMEOUT')
          if (refreshed?.session) {
            setUser(refreshed.session.user)
            activeSession = refreshed.session
          } else if (expiresAt <= Date.now()) {
            // Token déjà expiré ET refresh raté → toute requête partirait en
            // anonyme. On réessaie plutôt que de bumper pour rien.
            throw new Error('REFRESH_FAILED_AT_RESUME')
          }
        }
        // Re-propage le JWT a Realtime (le socket a pu droper en arriere-plan).
        // IMPORTANT : le token de la session ACTIVE (rafraîchie le cas échéant)
        // — repropager l'ancien après un refresh laissait le join payload des
        // canaux sur un token périmé.
        try { supabase.realtime.setAuth(activeSession.access_token) } catch { /* best-effort */ }
        logEvent('resume_ok', { attempt, exp: Math.round((((activeSession.expires_at || 0) * 1000) - Date.now()) / 1000) })
        // Bump → les pages re-fetchent (et debloquent une eventuelle query morte)
        bumpAuthTick()
      } catch (err) {
        console.warn(`[useAuth] resume refresh failed (essai ${attempt + 1}):`, err?.message)
        logEvent('resume_fail', { attempt, err: err?.message })
        // Retry borné, app visible uniquement : la session/connexion se
        // rétablit en général en quelques secondes après le réveil.
        // disposed : un resume encore en vol à l'unmount ne replanifie pas.
        if (!disposed && attempt < RESUME_RETRY_DELAYS.length && !resumeRetryTimer) {
          resumeRetryTimer = setTimeout(() => {
            resumeRetryTimer = null
            if (!disposed && document.visibilityState === 'visible') handleResume(attempt + 1)
          }, RESUME_RETRY_DELAYS[attempt])
        }
      }
    }
    function onVisibility() {
      if (document.visibilityState === 'visible') handleResume()
    }
    // Wrapper : window 'focus' passe l'Event en 1er argument — il ne doit pas
    // être interprété comme le compteur d'essais.
    function onFocus() { handleResume() }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', onFocus)

    // Écoute les changements de session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          await fetchProfile(session.user.id)
          await supabase.from('users').update({ is_online: true }).eq('id', session.user.id)
        }

        // Token rafraîchi → on met à jour le user + on bump pour déclencher refetch
        if (event === 'TOKEN_REFRESHED' && session?.user) {
          setUser(session.user)
          // ⚡ Re-propager le nouveau JWT à Realtime (sinon les channels gardent l'ancien)
          try { supabase.realtime.setAuth(session.access_token) } catch {}
          bumpAuthTick()
        }

        if (event === 'SIGNED_OUT') {
          logout()
        }
      }
    )

    return () => {
      disposed = true
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', onFocus)
      if (resumeRetryTimer) { clearTimeout(resumeRetryTimer); resumeRetryTimer = null }
    }
  }, [])

  async function fetchProfile(userId) {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .single()

    if (data) {
      setProfile(data)
      return data
    }

    // Profil inexistant (premier login OAuth ou race avec le trigger) — fallback
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const meta = user.user_metadata || {}
      const newProfile = {
        id: user.id,
        email: user.email,
        prenom: meta.prenom || meta.full_name?.split(' ')[0] || meta.name?.split(' ')[0] || '',
        nom: meta.nom || meta.full_name?.split(' ').slice(1).join(' ') || meta.name?.split(' ').slice(1).join(' ') || '',
        pseudo: meta.pseudo || null,
        type_compte: meta.type_compte || 'particulier',
        avatar_url: meta.avatar_url || meta.picture || null,
      }
      const { data: created, error: upsertErr } = await supabase
        .from('users')
        .upsert(newProfile, { onConflict: 'id' })
        .select()
        .single()
      if (upsertErr) console.error('[useAuth] fallback profile upsert error:', upsertErr)
      if (created) setProfile(created)
      return created
    }
    return null
  }

  async function signOut() {
    // Stratégie : libérer l'utilisateur IMMÉDIATEMENT (nettoyage local + nav),
    // puis exécuter les opérations réseau en background. Évite tout blocage
    // mobile sur réseau lent — la déconnexion est ressentie comme instantanée.
    const userId = user?.id

    // Fire-and-forget : on n'attend pas (timeout 800ms suffit en bonne réception)
    if (userId) {
      Promise.race([
        supabase.from('users').update({ is_online: false }).eq('id', userId),
        new Promise((resolve) => setTimeout(resolve, 800)),
      ]).catch(() => {})
    }

    // Nettoyage forcé du localStorage Supabase
    try {
      const ref = (import.meta.env.VITE_SUPABASE_URL || '').match(/https:\/\/([^.]+)/)?.[1]
      if (ref) localStorage.removeItem(`sb-${ref}-auth-token`)
      localStorage.removeItem('wishmaker-auth')
    } catch {}

    // Libère l'utilisateur tout de suite — UI navigue vers /auth
    logout()
    navigate('/auth', { replace: true })

    // Sign-out Supabase en background (révoque le refresh token côté serveur)
    supabase.auth.signOut().catch((err) => {
      console.warn('[signOut] supabase signOut bg failed:', err?.message)
    })
  }

  return { user, profile, signOut, fetchProfile }
}
