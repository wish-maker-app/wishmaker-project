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

  async function getMyWishes(statut = null) {
    if (!user) return []
    setLoading(true)
    let query = supabase
      .from('wishes')
      .select(`*, wish_images(url, is_cover), wish_tags(tag), wish_tag_links(tag_id), wisher:users!wisher_id(id, prenom, nom, pseudo, type_compte, rating, is_online, avatar_url)`)
      .eq('wisher_id', user.id)
      .neq('statut', 'pending_payment') // cache les wishes en attente de paiement
      .order('created_at', { ascending: false })

    if (statut) query = query.eq('statut', statut)

    const { data, error } = await query
    setLoading(false)
    if (error) throw error
    return (data || []).map(normalizeWish)
  }

  async function getAvailableWishes() {
    setLoading(true)
    const { data, error } = await supabase
      .from('wishes')
      .select(`*, wish_images(url, is_cover), wish_tags(tag), wish_tag_links(tag_id), wisher:users!wisher_id(id, prenom, nom, pseudo, type_compte, rating, is_online, avatar_url)`)
      .eq('statut', 'en_attente')
      .gte('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    setLoading(false)
    if (error) throw error
    return (data || []).map(normalizeWish)
  }

  async function getWishesByUser(userId) {
    setLoading(true)
    const { data, error } = await supabase
      .from('wishes')
      .select(`*, wish_images(url, is_cover), wish_tags(tag), wish_tag_links(tag_id), wisher:users!wisher_id(id, prenom, nom, pseudo, type_compte, rating, is_online, avatar_url)`)
      .eq('wisher_id', userId)
      .eq('statut', 'en_attente')
      .order('created_at', { ascending: false })

    setLoading(false)
    if (error) throw error
    return (data || []).map(normalizeWish)
  }

  async function getWishById(id) {
    setLoading(true)
    const { data, error } = await supabase
      .from('wishes')
      .select(`*, wish_images(url, is_cover), wish_tags(tag), wish_tag_links(tag_id), wisher:users!wisher_id(id, prenom, nom, pseudo, type_compte, rating, is_online, avatar_url)`)
      .eq('id', id)
      .single()

    setLoading(false)
    if (error) throw error
    return normalizeWish(data)
  }

  async function createWish({ titre, description, latitude, longitude, adresse, quartier, ville, code_postal, tags, tag_ids, category_id, images, type_recompense, montant_recompense, is_urgent, statut }) {
    setLoading(true)
    // S'assurer que la session auth est active
    let { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      const { data } = await supabase.auth.refreshSession()
      session = data.session
    }
    const wisherId = session?.user?.id || user?.id
    if (!wisherId) { setLoading(false); throw new Error('Session expirée, veuillez vous reconnecter') }
    const insertData = { titre, description, latitude, longitude, adresse, quartier, ville, code_postal, category_id, wisher_id: wisherId, type_recompense, montant_recompense }
    if (statut) insertData.statut = statut
    if (is_urgent) {
      insertData.is_urgent = true
      // expires_at et urgent_until sont calculés par le trigger set_wish_expiration
      // (source de vérité : fonctions SQL wish_duration() / urgent_duration())
    }
    const { data: wish, error } = await supabase
      .from('wishes')
      .insert(insertData)
      .select()
      .single()

    if (error) { setLoading(false); throw error }

    // Tags V2 (nouveaux liens vers la table tags)
    if (tag_ids?.length) {
      await supabase.from('wish_tag_links').insert(
        tag_ids.map((tag_id) => ({ wish_id: wish.id, tag_id }))
      )
    }

    // Tags legacy (strings) — conservé pour rétrocompat affichage
    if (tags?.length) {
      await supabase.from('wish_tags').insert(
        tags.map((tag) => ({ wish_id: wish.id, tag }))
      )
    }

    // Images (upload Supabase Storage)
    for (const img of images || []) {
      const ext = img.file.name.split('.').pop()
      const path = `${user.id}/${wish.id}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage
        .from('wish-images')
        .upload(path, img.file)

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('wish-images')
          .getPublicUrl(path)

        await supabase.from('wish_images').insert({
          wish_id: wish.id,
          url: publicUrl,
          is_cover: img.is_cover,
          ordre: img.ordre,
        })
      }
    }

    setLoading(false)
    return wish
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
    // Durée d'extension = wish_duration() côté SQL
    const { error } = await supabase.rpc('extend_wish', { wish_id: wishId })
    if (error) throw error
  }

  async function makeUrgent(wishId) {
    // urgent_until = LEAST(now + urgent_duration(), expires_at) — calculé en SQL
    const { error } = await supabase.rpc('make_urgent', { wish_id: wishId })
    if (error) throw error
  }

  async function markWishRealized(wishId) {
    // 1. Passer le wish en "realise"
    const { error } = await supabase
      .from('wishes')
      .update({ statut: 'realise' })
      .eq('id', wishId)
    if (error) throw error

    // 2. Si paiement Stripe en pré-auth : capturer (débit effectif de la carte)
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
          // On ne throw pas : le wish est déjà marqué réalisé, la capture est réconciliée via webhook plus tard
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
    // Supprimer les tags et images liés d'abord, puis le vœu
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
    const { error } = await supabase
      .from('wishes')
      .update({ titre, description, type_recompense, montant_recompense, adresse, latitude, longitude })
      .eq('id', wishId)
    if (error) { setLoading(false); throw error }

    // Remplacer les tags
    if (tags !== undefined) {
      await supabase.from('wish_tags').delete().eq('wish_id', wishId)
      if (tags?.length) {
        await supabase.from('wish_tags').insert(tags.map((tag) => ({ wish_id: wishId, tag })))
      }
    }
    setLoading(false)
  }

  return { loading, getMyWishes, getAvailableWishes, getWishesByUser, getWishById, createWish, updateWish, updateWishStatus, extendWish, makeUrgent, markWishRealized, submitRating, getUserRating, deleteWish }
}
