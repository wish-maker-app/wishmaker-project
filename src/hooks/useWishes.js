import { useState } from 'react'
import { supabase, withTimeout, ensureFreshSession } from '../lib/supabase'
import useAuthStore from '../store/authStore'
import { getCached, setCached } from '../lib/wishesCache'

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

// Cache par-voeu (cle `wish_<id>`) alimente par TOUS les fetchs de liste +
// getWishById. Permet a la page detail (WishDetail) d'afficher le voeu
// INSTANTANEMENT quand on clique depuis un feed (cache-first), sans spinner
// ni dependance au reseau. Le refetch se fait ensuite en fond.
function cacheWish(w) {
  if (w?.id) setCached('wish_' + w.id, w)
  return w
}
// Helper exporte pour l'hydratation initiale cote composant.
export function getCachedWish(id) {
  return id ? (getCached('wish_' + id)?.value || null) : null
}

export function useWishes() {
  const user = useAuthStore((s) => s.user)
  const [loading, setLoading] = useState(false)

  // Pattern try/finally garanti : setLoading(false) est TOUJOURS appelé
  // même en cas d'erreur. Évite les spinners infinis si une query échoue.

  async function getMyWishes(statut = null) {
    // NO_SESSION (réessayable) plutôt que [] : un [] « succès » silencieux
    // quand le store n'a pas encore user (réveil/cold start) affichait
    // « 0 vœux » à la place des vœux de l'utilisateur.
    if (!user) throw new Error('NO_SESSION')
    setLoading(true)
    try {
      // Session valide OBLIGATOIRE : sans elle la requête partirait en anonyme
      // → RLS (rôle authenticated) renvoie [] sans erreur → faux "aucun vœu" +
      // cache pollué. On lève NO_SESSION (réessayable) plutôt que de requêter.
      const session = await ensureFreshSession()
      if (!session) throw new Error('NO_SESSION')
      let query = supabase
        .from('wishes')
        .select(`*, wish_images(url, is_cover), wish_tags(tag), wish_tag_links(tag_id), category:categories(slug), wisher:users!wisher_id(id, prenom, nom, pseudo, type_compte, rating, is_online, avatar_url)`)
        .eq('wisher_id', user.id)
        .neq('statut', 'pending_payment')
        .order('created_at', { ascending: false })
      if (statut) query = query.eq('statut', statut)
      const { data, error } = await withTimeout(query)
      if (error) throw error
      const list = (data || []).map(normalizeWish)
      list.forEach(cacheWish)
      return list
    } finally {
      setLoading(false)
    }
  }

  async function getAvailableWishes() {
    setLoading(true)
    try {
      // Session valide OBLIGATOIRE avant la query : sinon supabase-js envoie la
      // requête en anonyme (JWT pas encore attaché / token expiré / réveil) →
      // RLS (policy réservée au rôle authenticated) renvoie 0 ligne SANS erreur
      // → faux "Aucun vœu" + cache pollué avec []. On lève NO_SESSION
      // (réessayable, ne touche ni l'affichage ni le cache) plutôt que de
      // lancer une requête anonyme vouée à revenir vide.
      const session = await ensureFreshSession()
      if (!session) throw new Error('NO_SESSION')
      const { data, error } = await withTimeout(supabase
        .from('wishes')
        .select(`*, wish_images(url, is_cover), wish_tags(tag), wish_tag_links(tag_id), category:categories(slug), wisher:users!wisher_id(id, prenom, nom, pseudo, type_compte, rating, is_online, avatar_url)`)
        .eq('statut', 'en_attente')
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false }))
      if (error) throw error
      const list = (data || []).map(normalizeWish)
      list.forEach(cacheWish)
      return list
    } finally {
      setLoading(false)
    }
  }

  async function getWishesByUser(userId) {
    setLoading(true)
    try {
      const session = await ensureFreshSession()
      if (!session) throw new Error('NO_SESSION')
      // On retourne TOUS les statuts (sauf pending_payment qui sont des drafts
      // non publiés). Sinon impossible de calculer les compteurs "Réalisés" /
      // "Actifs" sur la page profil — la consommation en aval (UserWishes.jsx)
      // se charge du tri/filtre selon ce qu'elle veut afficher.
      const { data, error } = await withTimeout(supabase
        .from('wishes')
        .select(`*, wish_images(url, is_cover), wish_tags(tag), wish_tag_links(tag_id), category:categories(slug), wisher:users!wisher_id(id, prenom, nom, pseudo, type_compte, rating, is_online, avatar_url)`)
        .eq('wisher_id', userId)
        .neq('statut', 'pending_payment')
        .order('created_at', { ascending: false }))
      if (error) throw error
      const list = (data || []).map(normalizeWish)
      list.forEach(cacheWish)
      return list
    } finally {
      setLoading(false)
    }
  }

  async function getWishById(id) {
    setLoading(true)
    try {
      // Timeout DUR au niveau de la requete (Promise.race), EN PLUS du
      // resilientFetch global. Raison : au retour d'arriere-plan (desktop :
      // bascule d'app), supabase-js peut rester bloque AVANT meme le fetch()
      // — dans la resolution interne de session/token (getSession/lock/refresh
      // deferred). resilientFetch ne couvre que fetch(), donc ce blocage-la
      // donnerait un spinner infini. Le race garantit que la promesse se
      // resout/rejette toujours en < 4s, quelle que soit la cause. L'appelant
      // (WishDetail) gere le retry automatique.
      const { data, error } = await withTimeout(supabase
        .from('wishes')
        .select(`*, wish_images(url, is_cover), wish_tags(tag), wish_tag_links(tag_id), category:categories(slug), wisher:users!wisher_id(id, prenom, nom, pseudo, type_compte, rating, is_online, avatar_url)`)
        .eq('id', id)
        .single())
      if (error) throw error
      return cacheWish(normalizeWish(data))
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

  async function updateWish(wishId, { titre, description, type_recompense, montant_recompense, prestation_type, prestation_montant, adresse, latitude, longitude, tags, tag_ids, category_id }) {
    setLoading(true)
    try {
      const updateFields = { titre, description, type_recompense, montant_recompense, adresse, latitude, longitude }
      if (category_id !== undefined) updateFields.category_id = category_id
      // Nouveaux champs prestation (Sur devis / Budget) — optionnels
      if (prestation_type !== undefined) updateFields.prestation_type = prestation_type
      if (prestation_montant !== undefined) updateFields.prestation_montant = prestation_montant
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
  // → envoie également une notification push au Wisher pour l'alerter qu'il a
  //   une action à faire (confirmer la réalisation dans la conversation).
  // IMPORTANT : on passe par une RPC SECURITY DEFINER car la RLS wishes_update_own
  // n'autorise que le Wisher a UPDATE — le Maker n'a pas le droit. La RPC verifie
  // que l'appelant est bien Maker dans une conversation sur ce voeu et fait le
  // UPDATE en interne.
  async function markRealizedByMaker(wishId, conversationId = null) {
    const { error } = await supabase.rpc('mark_wish_realized_by_maker', { p_wish_id: wishId })
    if (error) throw error

    // Notification push au Wisher (best-effort, ne bloque pas si ça rate)
    try {
      const { data: wish } = await supabase
        .from('wishes')
        .select('wisher_id, titre')
        .eq('id', wishId)
        .single()
      if (wish && wish.wisher_id !== user.id) {
        const { data: { session } } = await supabase.auth.getSession()
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify({
            user_id: wish.wisher_id,
            title: 'Votre vœu a été réalisé !',
            body: `Un Maker a marqué "${wish.titre}" comme réalisé. Confirmez la réalisation.`,
            url: conversationId ? `/messages/${conversationId}` : `/maker/wish/${wishId}?owner=1`,
          }),
        })
      }
    } catch (err) {
      console.warn('[markRealizedByMaker] push notif failed:', err?.message)
    }
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
