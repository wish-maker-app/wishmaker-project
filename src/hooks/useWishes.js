import { useState } from 'react'
import { supabase } from '../lib/supabase'
import useAuthStore from '../store/authStore'

export function useWishes() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)

  async function getMyWishes(statut = null) {
    if (!user) return []
    setLoading(true)
    let query = supabase
      .from('wishes')
      .select(`*, wish_images(url, is_cover), wish_tags(tag)`)
      .eq('wisher_id', user.id)
      .order('created_at', { ascending: false })

    if (statut) query = query.eq('statut', statut)

    const { data, error } = await query
    setLoading(false)
    if (error) throw error
    return data || []
  }

  async function createWish({ titre, description, latitude, longitude, adresse, tags, images }) {
    setLoading(true)
    const { data: wish, error } = await supabase
      .from('wishes')
      .insert({ titre, description, latitude, longitude, adresse, wisher_id: user.id })
      .select()
      .single()

    if (error) { setLoading(false); throw error }

    // Tags
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

  return { loading, getMyWishes, createWish, updateWishStatus }
}
