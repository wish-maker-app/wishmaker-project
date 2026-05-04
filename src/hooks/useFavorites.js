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

    supabase
      .from('wish_favorites')
      .select(`
        created_at,
        wish:wishes(
          *,
          wish_images(url, is_cover),
          wish_tags(tag),
          category:categories(slug),
          wisher:users!wisher_id(id, prenom, nom, pseudo, type_compte, rating, is_online, avatar_url)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .then(({ data, error: queryError }) => {
        if (cancelled) return
        if (queryError) {
          console.error('[favorites] fetch wishes error:', queryError)
          setError(queryError.message || 'Erreur de chargement des favoris')
          setWishes([])
        } else {
          const normalized = (data || [])
            .filter((r) => r.wish && r.wish.statut === 'en_attente')
            .map((r) => ({
              ...r.wish,
              tags: r.wish.wish_tags?.map((wt) => wt.tag) || [],
              images: r.wish.wish_images?.map((wi) => ({ url: wi.url, is_cover: wi.is_cover })) || [],
              category_slug: r.wish.category?.slug || null,
              favorited_at: r.created_at,
            }))
          setWishes(normalized)
        }
      })
      .finally(() => {
        // setLoading(false) TOUJOURS appelé, même en cas d'erreur ou rejection
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [userId])

  return { wishes, loading, error }
}
