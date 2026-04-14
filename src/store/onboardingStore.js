import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useOnboardingStore = create(
  persist(
    (set) => ({
      langue: 'fr',
      latitude: null,
      longitude: null,
      ville: null,
      quartier: null,
      code_postal: null,

      setLangue: (langue) => set({ langue }),
      setLocation: ({ latitude, longitude, ville, quartier, code_postal }) =>
        set({ latitude, longitude, ville, quartier, code_postal }),

      reset: () => set({ langue: 'fr', latitude: null, longitude: null, ville: null, quartier: null, code_postal: null }),
    }),
    { name: 'wishmaker-onboarding' }
  )
)

export default useOnboardingStore
