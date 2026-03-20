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
  // Récompense
  type_recompense: 'bon_procede',
  montant_recompense: null,
  description_bon_procede: '',

  setStep1: (titre, description) => set({ titre, description }),
  setImages: (images) => set({ images }),
  setLocation: (latitude, longitude, adresse) =>
    set({ latitude, longitude, adresse }),
  setTags: (tags) => set({ tags }),
  setRecompense: (type_recompense, montant_recompense, description_bon_procede) =>
    set({ type_recompense, montant_recompense, description_bon_procede }),

  reset: () => set({
    titre: '', description: '', images: [],
    latitude: null, longitude: null, adresse: '', tags: [],
    type_recompense: 'bon_procede', montant_recompense: null, description_bon_procede: '',
  }),
}))

export default useWishFormStore
