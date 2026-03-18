import { create } from 'zustand'
import { persist } from 'zustand/middleware'

const useOnboardingStore = create(
  persist(
    (set) => ({
      langue: 'fr',
      latitude: null,
      longitude: null,
      ville: '',

      setLangue: (langue) => set({ langue }),
      setLocation: (latitude, longitude, ville) =>
        set({ latitude, longitude, ville }),

      reset: () => set({ langue: 'fr', latitude: null, longitude: null, ville: '' }),
    }),
    { name: 'wishmaker-onboarding' }
  )
)

export default useOnboardingStore
