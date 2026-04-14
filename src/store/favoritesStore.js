import { create } from 'zustand'

/**
 * Store Zustand minimaliste : ensemble des wish_id favorisés par le user courant.
 * Chargé au login (via useFavorites hook), mis à jour localement à chaque toggle.
 *
 * Extrait dans un fichier séparé pour éviter les imports circulaires
 * entre useFavorites et authStore (le logout doit pouvoir clear le store).
 */
const useFavoritesStore = create((set, get) => ({
  favoriteIds: new Set(),
  loaded: false,

  setFavorites: (ids) => set({ favoriteIds: new Set(ids), loaded: true }),

  addLocal: (wishId) => {
    const next = new Set(get().favoriteIds)
    next.add(wishId)
    set({ favoriteIds: next })
  },

  removeLocal: (wishId) => {
    const next = new Set(get().favoriteIds)
    next.delete(wishId)
    set({ favoriteIds: next })
  },

  clear: () => set({ favoriteIds: new Set(), loaded: false }),
}))

export default useFavoritesStore
