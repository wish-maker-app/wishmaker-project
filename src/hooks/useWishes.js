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
    category_slug: wish.category?.slug || null,
  }
}

export function useWishes() {
  const user = useAuthStore((s) => s.user)
  const [loading, setLoading] = useState(false)

  // Pattern try/finally garanti : setLoading(false) est TOUJOURS appelé
  // même en cas d'erreur. Évite les spinners infinis si une query échoue.

  async function getMyWishes(statut = null) {
    if (!user) return []
    setLoading(true)
    try {
      await supabase.auth.getSession()
      let query = supabase
        .from('wishes')
        .select(`*, wish_images(url, is_cover), wish_tags(tag), wish_tag_links(tag_id), category:categories(slug), wisher:users!wisher_id(id, prenom, nom, pseudo, type_compte, rating, is_online, avatar_url)`)
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
      // Force la résolution de la session avant la query : sinon supabase-js
      // peut envoyer la requête en anonyme (JWT pas encore attaché depuis
      // localStorage) → RLS filtre → 0 résultats → "Aucun vœu trouvé" trompeur.
      await supabase.auth.getSession()
      const { data, error } = await supabase
        .from('wishes')
        .select(`*, wish_images(url, is_cover), wish_tags(tag), wish_tag_links(tag_id), category:categories(slug), wisher:users!wisher_id(id, prenom, nom, pseudo, type_compte, rating, is_online, avatar_url)`)
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
      await supabase.auth.getSession()
      const { data, error } = await supabase
        .from('wishes')
        .select(`*, wish_images(url, is_cover), wish_tags(tag), wish_tag_links(tag_id), category:categories(slug), wisher:users!wisher_id(id, prenom, nom, pseudo, type_compte, rating, is_online, avatar_url)`)
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
      // Timeout de securite : si la query reste suspendue (cas typique : tab
      // revient d'arriere-plan, le fetch a ete pause par le navigateur et le
      // promise ne resout jamais), on rejette apres 8s pour eviter le spinner
      // infini. L'UI affichera l'ecran "Erreur de chargement" + bouton Reessayer.
      const queryPromise = supabase
        .from('wishes')
        .select(`*, wish_images(url, is_cover), wish_tags(tag), wish_tag_links(tag_id), category:categories(slug), wisher:users!wisher_id(id, prenom, nom, pseudo, type_compte, rating, is_online, avatar_url)`)
        .eq('id', id)
        .single()
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Query timeout (8s)')), 8000)
      )
      const { data, error } = await Promise.race([queryPromise, timeoutPromise])
      if (error) throw error
      return normalizeWish(data)
    } finally {
      setLoading(false)
    }
  }

  async function createWish({ titre, description, latitude, longitude, adresse, quartier, ville, code_postal, tags, tag_ids, category_id, images, type_recompense, montant_recompense, prestation_type, prestation_montant, is_urgent, statut }) {
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
      // Nouveaux champs : type/montant de la prestation (en plus de la récompense Maker)
      if (prestation_type !== undefined) insertData.prestation_type = prestation_type
      if (prestation_montant !== undefined) insertData.prestation_montant = prestation_montant

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

      const failedUploads = []
      for (const img of images || []) {
        const ext = img.file.name.split('.').pop()
        const path = `${user.id}/${wish.id}/${Date.now()}.${ext}`
        const { error: uploadError } = await supabase.storage
          .from('wish-images')
          .upload(path, img.file)
        if (uploadError) {
          console.error('[createWish] upload failed:', uploadError, 'file:', img.file.name)
          failedUploads.push(img.file.name)
          continue
        }
        const { data: { publicUrl } } = supabase.storage.from('wish-images').getPublicUrl(path)
        const { error: insertErr } = await supabase.from('wish_images').insert({
          wish_id: wish.id,
          url: publicUrl,
          is_cover: img.is_cover,
          ordre: img.ordre,
        })
        if (insertErr) {
          console.error('[createWish] wish_images insert failed:', insertErr)
          failedUploads.push(img.file.name)
        }
      }

      // Expose les uploads en échec sur l'objet wish pour que l'appelant
      // puisse afficher un warning à l'user (sans bloquer la création).
      if (failedUploads.length) {
        wish._failedUploads = failedUploads
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
    // V1 MVP : pas de transaction Stripe sur les services, le paiement se
    // fait directement entre Wisher et Maker. On ne fait que mettre a jour
    // le statut du voeu. Stripe reste uniquement pour les packs / urgent /
    // extension.
    const { error } = await supabase
      .from('wishes')
      .update({ statut: 'realise' })
      .eq('id', wishId)
    if (error) throw error
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

  async function updateWish(wishId, { titre, description, type_recompense, montant_recompense, adresse, latitude, longitude, tags, tag_ids, category_id }) {
    setLoading(true)
    try {
      const updateFields = { titre, description, type_recompense, montant_recompense, adresse, latitude, longitude }
      if (category_id !== undefined) updateFields.category_id = category_id
      const { error } = await supabase
        .from('wishes')
        .update(updateFields)
        .eq('id', wishId)
      if (error) throw error
      // Synchronisation des tags string (rétrocompat)
      if (tags !== undefined) {
        await supabase.from('wish_tags').delete().eq('wish_id', wishId)
        if (tags?.length) {
          await supabase.from('wish_tags').insert(tags.map((tag) => ({ wish_id: wishId, tag })))
        }
      }
      // Synchronisation des tag_ids (système V2 = KeywordPicker)
      if (tag_ids !== undefined) {
        await supabase.from('wish_tag_links').delete().eq('wish_id', wishId)
        if (tag_ids?.length) {
          await supabase.from('wish_tag_links').insert(
            tag_ids.map((tag_id) => ({ wish_id: wishId, tag_id }))
          )
        }
      }
    } finally {
      setLoading(false)
    }
  }

  // Étape 1 : le Maker indique avoir réalisé le vœu (en attente de confirmation Wisher)
  async function markRealizedByMaker(wishId) {
    const { error } = await supabase
      .from('wishes')
      .update({
        marked_realized_at: new Date().toISOString(),
        marked_realized_by: user.id,
      })
      .eq('id', wishId)
    if (error) throw error
  }

  // Étape 2 : le Wisher confirme la réalisation → statut passe à 'realise'
  // V1 MVP : pas de capture Stripe, le paiement est direct entre Wisher et Maker.
  async function confirmRealization(wishId) {
    const { error } = await supabase
      .from('wishes')
      .update({ statut: 'realise' })
      .eq('id', wishId)
      .eq('wisher_id', user.id)
    if (error) throw error
  }

  return { loading, getMyWishes, getAvailableWishes, getWishesByUser, getWishById, createWish, updateWish, updateWishStatus, extendWish, makeUrgent, markWishRealized, markRealizedByMaker, confirmRealization, submitRating, getUserRating, deleteWish }
}
