import { useState, useEffect, useCallback } from 'react'
import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import useAuthStore from '../store/authStore'

/**
 * Store Zustand pour le catalogue (categories + tags + associations).
 * Chargé une fois au boot puis cache en mémoire — les données bougent rarement.
 */
const useCatalogStore = create((set, get) => ({
  categories: [],           // [{ id, slug, label, emoji, description, sort_order }]
  tags: [],                 // [{ id, slug, label, is_active }]
  categoryTags: [],         // [{ category_id, tag_id, is_suggested_primary, sort_order }]
  loaded: false,
  loading: false,
  error: null,

  loadCatalog: async () => {
    const state = get()
    if (state.loaded || state.loading) return
    set({ loading: true, error: null })

    try {
      const [catsRes, tagsRes, ctRes] = await Promise.all([
        supabase.from('categories').select('*').order('sort_order'),
        supabase.from('tags').select('*').eq('is_active', true).order('label'),
        supabase.from('category_tags').select('*').order('sort_order'),
      ])

      if (catsRes.error) throw catsRes.error
      if (tagsRes.error) throw tagsRes.error
      if (ctRes.error) throw ctRes.error

      set({
        categories: catsRes.data || [],
        tags: tagsRes.data || [],
        categoryTags: ctRes.data || [],
        loaded: true,
        error: null,
      })
    } catch (err) {
      console.error('[catalog] load error:', err)
      // On NE bloque PAS le store sur loaded:false — on garde error pour
      // permettre un retry. Sans ça, loading restait true à vie après un échec.
      set({ error: err.message || 'Erreur de chargement', loaded: false })
    } finally {
      set({ loading: false })
    }
  },

  reload: async () => {
    set({ loaded: false, loading: false, error: null })
    await get().loadCatalog()
  },
}))

/**
 * Hook principal : retourne le catalogue complet (chargé une fois).
 */
export function useCatalog() {
  const categories = useCatalogStore((s) => s.categories)
  const tags = useCatalogStore((s) => s.tags)
  const categoryTags = useCatalogStore((s) => s.categoryTags)
  const loaded = useCatalogStore((s) => s.loaded)
  const loading = useCatalogStore((s) => s.loading)
  const error = useCatalogStore((s) => s.error)
  const reload = useCatalogStore((s) => s.reload)

  useEffect(() => {
    // Si le store est en erreur ou pas encore chargé → on tente de charger
    const s = useCatalogStore.getState()
    if (!s.loaded && !s.loading) s.loadCatalog()
  }, [])

  // Map catégorie → tags (avec is_suggested_primary + sort_order pour tri)
  const getTagsForCategory = useCallback(
    (categoryId) => {
      if (!categoryId) return []
      const tagsById = new Map(tags.map((t) => [t.id, t]))
      return categoryTags
        .filter((ct) => ct.category_id === categoryId)
        .sort((a, b) => {
          if (a.is_suggested_primary !== b.is_suggested_primary) {
            return a.is_suggested_primary ? -1 : 1
          }
          return a.sort_order - b.sort_order
        })
        .map((ct) => ({ ...tagsById.get(ct.tag_id), is_suggested_primary: ct.is_suggested_primary }))
        .filter(Boolean)
    },
    [tags, categoryTags]
  )

  return { categories, tags, categoryTags, loaded, loading, error, reload, getTagsForCategory }
}

/**
 * Hook pour les abonnements tag d'un maker pro.
 * Gère les tags que le pro suit = filtre de son feed.
 */
export function useUserTagSubscriptions() {
  const userId = useAuthStore((s) => s.user?.id)
  const [tagIds, setTagIds] = useState([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    if (!userId) {
      setTagIds([])
      setLoading(false)
      return
    }
    setLoading(true)
    const { data, error } = await supabase
      .from('user_tag_subscriptions')
      .select('tag_id')
      .eq('user_id', userId)
    if (error) console.error('[user_tag_sub] load error:', error)
    setTagIds((data || []).map((r) => r.tag_id))
    setLoading(false)
  }, [userId])

  useEffect(() => { reload() }, [reload])

  const subscribe = useCallback(
    async (tagId) => {
      if (!userId) return
      // Optimiste
      setTagIds((prev) => [...new Set([...prev, tagId])])
      const { error } = await supabase
        .from('user_tag_subscriptions')
        .insert({ user_id: userId, tag_id: tagId })
      if (error) {
        console.error('[user_tag_sub] subscribe error:', error)
        setTagIds((prev) => prev.filter((id) => id !== tagId))
      }
    },
    [userId]
  )

  const unsubscribe = useCallback(
    async (tagId) => {
      if (!userId) return
      setTagIds((prev) => prev.filter((id) => id !== tagId))
      const { error } = await supabase
        .from('user_tag_subscriptions')
        .delete()
        .eq('user_id', userId)
        .eq('tag_id', tagId)
      if (error) {
        console.error('[user_tag_sub] unsubscribe error:', error)
        setTagIds((prev) => [...new Set([...prev, tagId])])
      }
    },
    [userId]
  )

  const toggle = useCallback(
    (tagId) => {
      if (tagIds.includes(tagId)) unsubscribe(tagId)
      else subscribe(tagId)
    },
    [tagIds, subscribe, unsubscribe]
  )

  return { tagIds, loading, subscribe, unsubscribe, toggle, reload }
}

/**
 * Helper : attache/détache une liste de tags à un vœu (wish_tag_links).
 * Utilisé après la création d'un vœu.
 */
export async function setWishTags(wishId, tagIds) {
  if (!wishId) return { error: new Error('wishId required') }
  // Supprimer les anciens liens (en cas d'édition)
  const { error: delErr } = await supabase
    .from('wish_tag_links')
    .delete()
    .eq('wish_id', wishId)
  if (delErr) return { error: delErr }
  // Insérer les nouveaux
  if (!tagIds || tagIds.length === 0) return { error: null }
  const rows = tagIds.map((tag_id) => ({ wish_id: wishId, tag_id }))
  const { error: insErr } = await supabase.from('wish_tag_links').insert(rows)
  return { error: insErr || null }
}
