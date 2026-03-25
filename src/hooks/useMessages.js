import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import useAuthStore from '../store/authStore'

export function useMessages(conversationId = null) {
  const { user } = useAuthStore()
  const [messages, setMessages] = useState([])
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(false)
  const channelRef = useRef(null)

  // Charge les conversations de l'utilisateur
  async function loadConversations() {
    if (!user) return
    setLoading(true)
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        wish:wishes(id, titre, statut, type_recompense, montant_recompense, wish_images(url, is_cover)),
        wisher:users!wisher_id(id, prenom, nom, pseudo, avatar_url, is_online, rating, type_compte),
        maker:users!maker_id(id, prenom, nom, pseudo, avatar_url, is_online, rating, type_compte),
        messages(contenu, created_at, is_read, sender_id)
      `)
      .or(`wisher_id.eq.${user.id},maker_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    setLoading(false)
    if (error) throw error
    setConversations(data || [])
  }

  // Charge les messages d'une conversation + Realtime
  async function loadMessages(convId) {
    if (!convId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('messages')
      .select(`*, sender:users!sender_id(id, prenom, nom, avatar_url)`)
      .eq('conversation_id', convId)
      .order('created_at', { ascending: true })

    setLoading(false)
    if (error) throw error
    setMessages(data || [])

    // Marque les messages non lus comme lus
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', convId)
      .neq('sender_id', user?.id)
      .eq('is_read', false)

    // Souscription Realtime
    channelRef.current = supabase
      .channel(`messages:${convId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new])
        }
      )
      .subscribe()
  }

  async function sendMessage(convId, contenu) {
    if (!user || !contenu.trim()) return
    const { error } = await supabase
      .from('messages')
      .insert({ conversation_id: convId, sender_id: user.id, contenu })
    if (error) throw error
  }

  async function createConversation(wishId, wisherId) {
    // Cherche si une conversation existe déjà
    const { data: existing } = await supabase
      .from('conversations')
      .select('id')
      .eq('wish_id', wishId)
      .eq('maker_id', user.id)
      .single()

    if (existing) return existing.id

    const { data, error } = await supabase
      .from('conversations')
      .insert({ wish_id: wishId, wisher_id: wisherId, maker_id: user.id })
      .select()
      .single()

    if (error) throw error
    return data.id
  }

  // Nettoyage Realtime
  useEffect(() => {
    return () => {
      channelRef.current?.unsubscribe()
    }
  }, [])

  return {
    messages,
    conversations,
    loading,
    loadConversations,
    loadMessages,
    sendMessage,
    createConversation,
  }
}
