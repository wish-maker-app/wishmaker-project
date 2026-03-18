import { create } from 'zustand'

const useWishFormStore = create((set) => ({
  // Étape 1
  titre: '',
  description: '',
  // Étape 2
  images: [],      // { file, preview, is_cover, ordre }
  // Étape 3
  latitude: null,
  longitude: null,
  adresse: '',
  // Étape 4
  tags: [],

  setStep1: (titre, description) => set({ titre, description }),
  setImages: (images) => set({ images }),
  setLocation: (latitude, longitude, adresse) =>
    set({ latitude, longitude, adresse }),
  setTags: (tags) => set({ tags }),

  reset: () => set({
    titre: '', description: '', images: [],
    latitude: null, longitude: null, adresse: '', tags: [],
  }),
}))

export default useWishFormStore
