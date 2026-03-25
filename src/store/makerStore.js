import { create } from 'zustand'

const useMakerStore = create((set) => ({
  // Filtres actifs
  sortBy: null,              // null | 'urgent' | 'distance' | 'recent'
  maxDistance: 100,           // km (défaut 100km = tout afficher)
  selectedCategories: [],    // catégories sélectionnées

  setSortBy: (sortBy) => set({ sortBy }),
  setMaxDistance: (maxDistance) => set({ maxDistance }),
  setSelectedCategories: (selectedCategories) => set({ selectedCategories }),

  resetFilters: () =>
    set({ sortBy: null, maxDistance: 100, selectedCategories: [] }),
}))

export default useMakerStore
