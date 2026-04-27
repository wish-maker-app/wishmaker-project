import { useState } from 'react'
import { supabase } from '../lib/supabase'
import useAuthStore from '../store/authStore'

function normalizeWish(wish) {
  if (!wish) return null
  return {
    ...wish,
    tags: wish.wish_tags?.map((wt) => wt.tag) || [],
    tag_ids: wish.wish_tag_links?.map((wtl) => wtl.tag_id) || [],
    images: wish.wish_images?.map((wi) => ({ url: wi.url, is_cover: wi.is_cover })) || [],
    wisher: wish.wisher || undefined,
  }
}

export function useWishes() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)

  // Pattern try/finally garanti : setLoading(false) est TOUJOURS appelé
  // même en cas d'erreur. Évite les spinners infinis si une query échoue.

  async function getMyWishes(statut = null) {
    if (!user) return []
    setLoading(true)
    try {
      let query = supabase
        .from('wishes')
        .select(`*, wish_images(url, is_cover), wish_tags(tag), wish_tag_links(tag_id), wisher:users!wisher_id(id, prenom, nom, pseudo, type_compte, rating, is_online, avatar_url)`)
        .eq('wisher_id', user.id)
        .neq('statut', 'pending_payment')
        .order('created_at', { ascending: false })
      if (statut) query = query.eq('statut', statut)
      const { data, error } = await query
      if (error) throw error
      return (data || []).map(normalizeWish)
    } finally {
      setLoading(false)
    }
  }

  async function getAvailableWishes() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('wishes')
        .select(`*, wish_images(url, is_cover), wish_tags(tag), wish_tag_links(tag_id), wisher:users!wisher_id(id, prenom, nom, pseudo, type_compte, rating, is_online, avatar_url)`)
        .eq('statut', 'en_attente')
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []).map(normalizeWish)
    } finally {
      setLoading(false)
    }
  }

  async function getWishesByUser(userId) {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('wishes')
        .select(`*, wish_images(url, is_cover), wish_tags(tag), wish_tag_links(tag_id), wisher:users!wisher_id(id, prenom, nom, pseudo, type_compte, rating, is_online, avatar_url)`)
        .eq('wisher_id', userId)
        .eq('statut', 'en_attente')
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data || []).map(normalizeWish)
    } finally {
      setLoading(false)
    }
  }

  async function getWishById(id) {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('wishes')
        .select(`*, wish_images(url, is_cover), wish_tags(tag), wish_tag_links(tag_id), wisher:users!wisher_id(id, prenom, nom, pseudo, type_compte, rating, is_online, avatar_url)`)
        .eq('id', id)
        .single()
      if (error) throw error
      return normalizeWish(data)
    } finally {
      setLoading(false)
    }
  }

  async function createWish({ titre, description, latitude, longitude, adresse, quartier, ville, code_postal, tags, tag_ids, category_id, images, type_recompense, montant_recompense, is_urgent, statut }) {
    setLoading(true)
    try {
      let { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        const { data } = await supabase.auth.refreshSession()
        session = data.session
      }
      const wisherId = session?.user?.id || user?.id
      if (!wisherId) throw new Error('Session expirée, veuillez vous reconnecter')

      const insertData = { titre, description, latitude, longitude, adresse, quartier, ville, code_postal, category_id, wisher_id: wisherId, type_recompense, montant_recompense }
      if (statut) insertData.statut = statut
      if (is_urgent) insertData.is_urgent = true

      const { data: wish, error } = await supabase
        .from('wishes')
        .insert(insertData)
        .select()
        .single()
      if (error) throw error

      if (tag_ids?.length) {
        await supabase.from('wish_tag_links').insert(
          tag_ids.map((tag_id) => ({ wish_id: wish.id, tag_id }))
        )
      }
      if (tags?.length) {
        await supabase.from('wish_tags').insert(tags.map((tag) => ({ wish_id: wish.id, tag })))
      }

      for (const img of images || []) {
        const ext = img.file.name.split('.').pop()
        const path = `${user.id}/${wish.id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('wish-images')
          .upload(path, img.file)
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage.from('wish-images').getPublicUrl(path)
          await supabase.from('wish_images').insert({
            wish_id: wish.id,
            url: publicUrl,
            is_cover: img.is_cover,
            ordre: img.ordre,
          })
        }
      }

      return wish
    } finally {
      setLoading(false)
    }
  }

  async function updateWishStatus(wishId, statut) {
    const { error } = await supabase
      .from('wishes')
      .update({ statut })
      .eq('id', wishId)
      .eq('wisher_id', user.id)
    if (error) throw error
  }

  async function extendWish(wishId) {
    const { error } = await supabase.rpc('extend_wish', { wish_id: wishId })
    if (error) throw error
  }

  async function makeUrgent(wishId) {
    const { error } = await supabase.rpc('make_urgent', { wish_id: wishId })
    if (error) throw error
  }

  async function markWishRealized(wishId) {
    const { error } = await supabase
      .from('wishes')
      .update({ statut: 'realise' })
      .eq('id', wishId)
    if (error) throw error

    const { data: wish } = await supabase
      .from('wishes')
      .select('payment_intent_id, payment_status')
      .eq('id', wishId)
      .single()

    if (wish?.payment_intent_id && wish.payment_status === 'authorized') {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const res = await fetch(`${supabaseUrl}/functions/v1/capture-payment`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({ wish_id: wishId }),
        })
        if (!res.ok) {
          const err = await res.json()
          console.error('[capture-payment] Échec capture:', err)
        }
      } catch (err) {
        console.error('[capture-payment]', err)
      }
    }
  }

  async function submitRating({ wishId, fromUser, toUser, note, commentaire }) {
    const { error } = await supabase
      .from('ratings')
      .insert({ wish_id: wishId, from_user: fromUser, to_user: toUser, note, commentaire })
    if (error) throw error
  }

  async function getUserRating(wishId, fromUser) {
    const { data } = await supabase
      .from('ratings')
      .select('*')
      .eq('wish_id', wishId)
      .eq('from_user', fromUser)
      .single()
    return data || null
  }

  async function deleteWish(wishId) {
    await supabase.from('wish_tags').delete().eq('wish_id', wishId)
    await supabase.from('wish_images').delete().eq('wish_id', wishId)
    const { error } = await supabase
      .from('wishes')
      .delete()
      .eq('id', wishId)
      .eq('wisher_id', user.id)
    if (error) throw error
  }

  async function updateWish(wishId, { titre, description, type_recompense, montant_recompense, adresse, latitude, longitude, tags }) {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('wishes')
        .update({ titre, description, type_recompense, montant_recompense, adresse, latitude, longitude })
        .eq('id', wishId)
      if (error) throw error
      if (tags !== undefined) {
        await supabase.from('wish_tags').delete().eq('wish_id', wishId)
        if (tags?.length) {
          await supabase.from('wish_tags').insert(tags.map((tag) => ({ wish_id: wishId, tag })))
        }
      }
    } finally {
      setLoading(false)
    }
  }

  return { loading, getMyWishes, getAvailableWishes, getWishesByUser, getWishById, createWish, updateWish, updateWishStatus, extendWish, makeUrgent, markWishRealized, submitRating, getUserRating, deleteWish }
}
