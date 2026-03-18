import { create } from 'zustand'

const useMakerStore = create((set) => ({
  // Vue carte ou liste
  viewMode: 'map', // 'map' | 'list'

  // Filtres actifs
  sortBy: 'pertinence',   // 'pertinence' | 'distance' | 'recent'
  maxDistance: 25,         // km
  selectedTags: [],

  // Résultats
  wishes: [],
  loading: false,

  setViewMode: (viewMode) => set({ viewMode }),
  setSortBy: (sortBy) => set({ sortBy }),
  setMaxDistance: (maxDistance) => set({ maxDistance }),
  setSelectedTags: (selectedTags) => set({ selectedTags }),
  setWishes: (wishes) => set({ wishes }),
  setLoading: (loading) => set({ loading }),

  resetFilters: () =>
    set({ sortBy: 'pertinence', maxDistance: 25, selectedTags: [] }),
}))

export default useMakerStore
