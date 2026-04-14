import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import useFavoritesStore from './favoritesStore'

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,       // données auth.users (Supabase)
      profile: null,    // données public.users

      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),

      logout: () => {
        // Reset des stores liés à l'utilisateur pour éviter les fuites d'état
        useFavoritesStore.getState().clear()
        set({ user: null, profile: null })
      },
    }),
    { name: 'wishmaker-auth' }
  )
)

export default useAuthStore
