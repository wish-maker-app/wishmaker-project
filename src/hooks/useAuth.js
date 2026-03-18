import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import useAuthStore from '../store/authStore'

export function useAuth() {
  const { user, profile, setUser, setProfile, logout } = useAuthStore()
  const navigate = useNavigate()

  useEffect(() => {
    // Récupère la session actuelle
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser(session.user)
        fetchProfile(session.user.id)
      }
    })

    // Écoute les changements de session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          setUser(session.user)
          await fetchProfile(session.user.id)
          // Marque l'utilisateur comme en ligne
          await supabase
            .from('users')
            .update({ is_online: true })
            .eq('id', session.user.id)
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

    // Profil inexistant (premier login OAuth) — le créer depuis les metadata auth
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const meta = user.user_metadata || {}
      const newProfile = {
        id: user.id,
        email: user.email,
        prenom: meta.prenom || meta.full_name?.split(' ')[0] || meta.name?.split(' ')[0] || '',
        nom: meta.nom || meta.full_name?.split(' ').slice(1).join(' ') || meta.name?.split(' ').slice(1).join(' ') || '',
        avatar_url: meta.avatar_url || meta.picture || null,
      }
      const { data: created } = await supabase
        .from('users')
        .upsert(newProfile)
        .select()
        .single()
      if (created) setProfile(created)
      return created
    }
    return null
  }

  async function signOut() {
    if (user) {
      await supabase
        .from('users')
        .update({ is_online: false })
        .eq('id', user.id)
    }
    await supabase.auth.signOut()
    logout()
    navigate('/auth')
  }

  return { user, profile, signOut, fetchProfile }
}
