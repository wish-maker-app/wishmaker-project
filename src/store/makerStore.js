import { create } from 'zustand'

const useMakerStore = create((set) => ({
  // Filtres actifs
  sortBy: null,              // null | 'urgent' | 'distance' | 'recent'
  maxDistance: 100,           // km (défaut 100km = tout afficher)
  // Mots-clés sélectionnés (tag_ids). Auparavant on filtrait par catégorie,
  // mais avec le nouveau système Leboncoin l'utilisateur n'a plus accès aux
  // catégories — il filtre directement par mots-clés (= tags).
  selectedTagIds: [],

  setSortBy: (sortBy) => set({ sortBy }),
  setMaxDistance: (maxDistance) => set({ maxDistance }),
  setSelectedTagIds: (selectedTagIds) => set({ selectedTagIds }),

  resetFilters: () =>
    set({ sortBy: null, maxDistance: 100, selectedTagIds: [] }),
}))

export default useMakerStore
