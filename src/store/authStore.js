import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import useFavoritesStore from './favoritesStore'

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,       // données auth.users (Supabase)
      profile: null,    // données public.users
      // Incrément à chaque resync de session (mount, TOKEN_REFRESHED).
      // Les pages qui fetchent de la data l'utilisent en dépendance d'effet
      // pour re-fetcher quand la session devient réellement valide après
      // un refresh (évite le bug "pages vides" après F5).
      authTick: 0,

      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),
      bumpAuthTick: () => set((s) => ({ authTick: s.authTick + 1 })),

      logout: () => {
        useFavoritesStore.getState().clear()
        set({ user: null, profile: null })
      },
    }),
    {
      name: 'wishmaker-auth',
      // On ne persiste PAS authTick (doit rester en mémoire, recommence à 0 au refresh)
      partialize: (s) => ({ user: s.user, profile: s.profile }),
    }
  )
)

export default useAuthStore
