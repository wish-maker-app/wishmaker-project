import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useAuthStore = create(
  persist(
    (set) => ({
      user: null,       // données auth.users (Supabase)
      profile: null,    // données public.users

      setUser: (user) => set({ user }),
      setProfile: (profile) => set({ profile }),

      logout: () => set({ user: null, profile: null }),
    }),
    { name: 'wishmaker-auth' }
  )
)

export default useAuthStore
