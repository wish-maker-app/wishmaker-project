import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import useAuthStore from '../store/authStore'
import useFavoritesStore from '../store/favoritesStore'

/**
 * Hook principal : expose isFavorite(wishId), toggle(wishId) et la liste d'IDs.
 */
export function useFavorites() {
  const userId = useAuthStore((s) => s.user?.id)
  const favoriteIds = useFavoritesStore((s) => s.favoriteIds)
  const loaded = useFavoritesStore((s) => s.loaded)

  // Charge les favoris une fois au login
  useEffect(() => {
    if (!userId || loaded) return
    supabase
      .from('wish_favorites')
      .select('wish_id')
      .eq('user_id', userId)
      .then(({ data, error }) => {
        if (error) {
          console.warn('[favorites] load error:', error.message)
          useFavoritesStore.getState().setFavorites([])
          return
        }
        useFavoritesStore.getState().setFavorites((data || []).map((r) => r.wish_id))
      })
  }, [userId, loaded])

  const isFavorite = useCallback((wishId) => favoriteIds.has(wishId), [favoriteIds])

  const toggle = useCallback(
    async (wishId) => {
      if (!userId || !wishId) return
      const { addLocal, removeLocal } = useFavoritesStore.getState()
      const currentlyFav = useFavoritesStore.getState().favoriteIds.has(wishId)

      // Update optimiste
      if (currentlyFav) removeLocal(wishId)
      else addLocal(wishId)

      // Sync BDD
      if (currentlyFav) {
        const { error } = await supabase
          .from('wish_favorites')
          .delete()
          .eq('user_id', userId)
          .eq('wish_id', wishId)
        if (error) {
          console.error('[favorites] delete error:', error)
          addLocal(wishId) // rollback
        }
      } else {
        const { error } = await supabase
          .from('wish_favorites')
          .insert({ user_id: userId, wish_id: wishId })
        if (error) {
          console.error('[favorites] insert error:', error)
          removeLocal(wishId) // rollback
        }
      }
    },
    [userId]
  )

  return { favoriteIds, isFavorite, toggle, loaded }
}

/**
 * Récupère la liste complète des vœux favoris du user courant avec leurs relations
 * (images, tags, wisher). Utilisé par la page Favoris.
 */
export function useFavoriteWishes() {
  const userId = useAuthStore((s) => s.user?.id)
  const [wishes, setWishes] = useState([])
  const [loading, setLoading] = useState(true)

  const [error, setError] = useState(null)

  useEffect(() => {
    if (!userId) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)

    // Favoris = vœux d'autres utilisateurs → on lit la VUE wishes_public
    // (coords floutées, adresse masquée), pas la table. Comme wish_favorites
    // n'a pas de FK vers la vue, on fait 2 requêtes : d'abord les ids favoris,
    // puis les vœux correspondants depuis la vue.
    ;(async () => {
      try {
        const { data: favs, error: favErr } = await supabase
          .from('wish_favorites')
          .select('wish_id, created_at')
          .eq('user_id', userId)
          .order('created_at', { ascending: false })
        if (favErr) throw favErr

        const ids = (favs || []).map((f) => f.wish_id)
        const datesById = new Map((favs || []).map((f) => [f.wish_id, f.created_at]))
        if (ids.length === 0) {
          if (!cancelled) setWishes([])
          return
        }

        const { data: wishesData, error: wishErr } = await supabase
          .from('wishes_public')
          .select('*')
          .in('id', ids)
        if (wishErr) throw wishErr

        const normalized = (wishesData || [])
          .filter((w) => w.statut === 'en_attente')
          .map((w) => ({
            ...w,
            tags: w.wish_tags?.map((wt) => wt.tag) || [],
            images: w.wish_images?.map((wi) => ({ url: wi.url, is_cover: wi.is_cover })) || [],
            category_slug: w.category?.slug || null,
            favorited_at: datesById.get(w.id),
          }))
          // Conserve l'ordre "favori le plus récent d'abord"
          .sort((a, b) => new Date(b.favorited_at) - new Date(a.favorited_at))
        if (!cancelled) setWishes(normalized)
      } catch (queryError) {
        if (cancelled) return
        console.error('[favorites] fetch wishes error:', queryError)
        setError(queryError.message || 'Erreur de chargement des favoris')
        setWishes([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => { cancelled = true }
  }, [userId])

  return { wishes, loading, error }
}
