import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import useAuthStore from '../store/authStore'

export function useAuth() {
  const { user, profile, setUser, setProfile, logout, bumpAuthTick } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    // Au mount : on re-synchronise le store Zustand avec la VRAIE session Supabase.
    // Sinon après un refresh, le store persisté peut montrer un user logué alors
    // que la session Supabase a expiré/disparu → queries retournent vide (RLS).
    ;(async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (session?.user) {
        const expiresAt = (session.expires_at || 0) * 1000
        // Si le token expire dans <5min, refresh anticipé pour éviter les
        // queries ratées juste après le mount.
        if (expiresAt - Date.now() < 5 * 60 * 1000) {
          try {
            const { data: refreshed } = await supabase.auth.refreshSession()
            setUser(refreshed?.session?.user || session.user)
          } catch {
            setUser(session.user)
          }
        } else {
          setUser(session.user)
        }

        await fetchProfile(session.user.id)
        bumpAuthTick()
      } else if (useAuthStore.getState().user) {
        // Store dit "logué" mais Supabase n'a plus de session → reset
        logout()
        navigate('/auth', { replace: true })
      }
    })()

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
          bumpAuthTick()
        }

        if (event === 'SIGNED_OUT') {
          logout()
        }
      }
    )

    return () => subscription.unsubscribe()
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
    // Tolérant : si une étape rate (réseau, RLS, session déjà morte), on continue quand même.
    // Le but est TOUJOURS de libérer l'utilisateur même si la BDD répond pas.
    const userId = user?.id
    try {
      if (userId) {
        // Race contre un timeout : empêche de bloquer 30s sur un update qui traîne
        await Promise.race([
          supabase.from('users').update({ is_online: false }).eq('id', userId),
          new Promise((resolve) => setTimeout(resolve, 2000)),
        ])
      }
    } catch (err) {
      console.warn('[signOut] is_online update failed, continuing:', err?.message)
    }

    try {
      await supabase.auth.signOut()
    } catch (err) {
      console.warn('[signOut] supabase signOut failed, forcing local logout:', err?.message)
    }

    // Nettoyage forcé du localStorage Supabase au cas où signOut() a échoué
    try {
      const ref = (import.meta.env.VITE_SUPABASE_URL || '').match(/https:\/\/([^.]+)/)?.[1]
      if (ref) localStorage.removeItem(`sb-${ref}-auth-token`)
      localStorage.removeItem('wishmaker-auth')
    } catch {}

    logout()
    navigate('/auth', { replace: true })
  }

  return { user, profile, signOut, fetchProfile }
}
