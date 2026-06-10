import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
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
      const { data: { session } } = await supabase.auth.getSession()

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
        logout()
        navigate('/auth', { replace: true })
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
    async function handleResume() {
      // Anti double-run : focus + visibilitychange peuvent tomber ensemble.
      if (Date.now() - lastResumeTs < 1000) return
      lastResumeTs = Date.now()
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) return
        let activeSession = session
        const expiresAt = (session.expires_at || 0) * 1000
        // Refresh si token expire dans < 60s
        if (expiresAt - Date.now() < 60 * 1000) {
          const { data: refreshed } = await supabase.auth.refreshSession()
          if (refreshed?.session) {
            setUser(refreshed.session.user)
            activeSession = refreshed.session
          }
        }
        // Re-propage le JWT a Realtime (le socket a pu droper en arriere-plan).
        // IMPORTANT : le token de la session ACTIVE (rafraîchie le cas échéant)
        // — repropager l'ancien après un refresh laissait le join payload des
        // canaux sur un token périmé.
        try { supabase.realtime.setAuth(activeSession.access_token) } catch { /* best-effort */ }
        // Bump → les pages re-fetchent (et debloquent une eventuelle query morte)
        bumpAuthTick()
      } catch (err) {
        console.warn('[useAuth] resume refresh failed:', err?.message)
      }
    }
    function onVisibility() {
      if (document.visibilityState === 'visible') handleResume()
    }
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('focus', handleResume)

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
      subscription.unsubscribe()
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('focus', handleResume)
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
