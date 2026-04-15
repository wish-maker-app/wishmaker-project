import { create } from 'zustand'

const useWishFormStore = create((set) => ({
  // Étape 1
  titre: '',
  description: '',
  // Étape 2
  images: [],      // { file, preview, is_cover, ordre }
  // Étape 3 — localisation
  latitude: null,
  longitude: null,
  adresse: '',        // Adresse brute Nominatim (archive, jamais affichée)
  quartier: null,     // Ex: "Belleville"
  ville: null,        // Ex: "Paris"
  code_postal: null,  // Ex: "75018"
  // Étape 4 — catégorisation V2
  category_id: null,  // uuid de la catégorie choisie (obligatoire)
  tag_ids: [],        // array d'uuid de tags (1 min, 3 max)
  // Legacy : garder tags (array de strings) pour rétrocompat pendant la migration
  tags: [],
  // Récompense
  type_recompense: 'bon_procede',
  montant_recompense: null,
  description_bon_procede: '',

  setStep1: (titre, description) => set({ titre, description }),
  setImages: (images) => set({ images }),
  setLocation: ({ latitude, longitude, adresse, quartier, ville, code_postal }) =>
    set({ latitude, longitude, adresse, quartier, ville, code_postal }),
  setTags: (tags) => set({ tags }),
  setCategoryAndTags: ({ category_id, tag_ids, tags }) =>
    set({ category_id, tag_ids, tags }),
  setRecompense: (type_recompense, montant_recompense, description_bon_procede) =>
    set({ type_recompense, montant_recompense, description_bon_procede }),

  reset: () => set({
    titre: '', description: '', images: [],
    latitude: null, longitude: null, adresse: '', quartier: null, ville: null, code_postal: null,
    category_id: null, tag_ids: [], tags: [],
    type_recompense: 'bon_procede', montant_recompense: null, description_bon_procede: '',
  }),
}))

export default useWishFormStore
