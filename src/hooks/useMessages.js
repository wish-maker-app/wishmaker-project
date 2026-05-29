import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import useAuthStore from '../store/authStore'
import { getCached, setCached } from '../lib/wishesCache'

export function useMessages(conversationId = null) {
  const user = useAuthStore((s) => s.user)
  const [messages, setMessages] = useState([])
  // Hydrate les conversations depuis le cache → pas d'écran vide au retour
  const [conversations, setConversations] = useState(() => getCached('conversations')?.value || [])
  const [loading, setLoading] = useState(false)
  const channelRef = useRef(null)
  const mountedRef = useRef(true)
  // Dedup loadConversations : l'Inbox declenche cette query via plusieurs
  // sources qui se chevauchent (authTick, realtime x3, focus/visibility).
  // inFlight = requete en cours ; lastTs = dernier chargement. On skip si une
  // requete tourne deja ou si la derniere date de < 1.5s (sauf force=true).
  const convInFlightRef = useRef(false)
  const lastConvTsRef = useRef(0)

  // Charge les conversations de l'utilisateur
  async function loadConversations(opts = {}) {
    if (!user) return
    const { force = false } = opts
    if (convInFlightRef.current) return
    if (!force && Date.now() - lastConvTsRef.current < 1500) return
    convInFlightRef.current = true
    // On ne déclenche un loading "blocking" que s'il n'y a rien en cache.
    // Sinon le user voit ses conversations cachées et le refetch se fait silencieux.
    const hasCache = !!getCached('conversations')
    if (!hasCache) setLoading(true)
    try {
      // Force la résolution de la session (sinon RLS filtre tout en anonyme au mount)
      await supabase.auth.getSession()
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          wish:wishes(id, titre, statut, type_recompense, montant_recompense, prestation_type, prestation_montant, marked_realized_at, marked_realized_by, wish_images(url, is_cover), category:categories(slug)),
          wisher:users!wisher_id(id, prenom, nom, pseudo, avatar_url, is_online, rating, type_compte),
          maker:users!maker_id(id, prenom, nom, pseudo, avatar_url, is_online, rating, type_compte),
          messages(contenu, created_at, is_read, sender_id)
        `)
        .or(`wisher_id.eq.${user.id},maker_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
      if (error) throw error
      const list = data || []
      setConversations(list)
      // On NE met PAS à jour le cache si la liste est vide ET qu'on a déjà
      // du contenu en cache : ça évite de "geler" un écran "aucune conversation"
      // si la query retourne [] à cause d'une session pas encore prête (RLS).
      // Si list a du contenu OU si le cache est vide, on cache normalement.
      const existingCache = getCached('conversations')?.value
      if (list.length > 0 || !existingCache || existingCache.length === 0) {
        setCached('conversations', list)
      }
    } finally {
      setLoading(false)
      convInFlightRef.current = false
      lastConvTsRef.current = Date.now()
    }
  }

  // Charge les messages d'une conversation + Realtime
  async function loadMessages(convId) {
    if (!convId) return
    // Hydrate depuis cache pour éviter écran vide pendant le fetch
    const cacheKey = `messages_${convId}`
    const cached = getCached(cacheKey)?.value
    if (cached) setMessages(cached)
    if (!cached) setLoading(true)
    try {
      await supabase.auth.getSession()
      const { data, error } = await supabase
        .from('messages')
        .select(`*, sender:users!sender_id(id, prenom, nom, avatar_url)`)
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true })
      if (error) throw error
      const list = data || []
      setMessages(list)
      setCached(cacheKey, list)

      // Marque les messages non lus comme lus (best-effort, on ne throw pas si ça rate)
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', convId)
        .neq('sender_id', user?.id)
        .eq('is_read', false)

      // Cleanup ancien channel avant d'en créer un nouveau (évite le leak si on
      // change de conversation sans démonter le composant)
      if (channelRef.current) {
        try { await channelRef.current.unsubscribe() } catch {}
        channelRef.current = null
      }

      // Souscription Realtime — guard contre les updates sur composant unmounted
      channelRef.current = supabase
        .channel(`messages:${convId}`)
        .on(
          'postgres_changes',
          { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convId}` },
          (payload) => {
            if (!mountedRef.current) return
            setMessages((prev) => {
              const next = [...prev, payload.new]
              setCached(cacheKey, next)
              return next
            })
          }
        )
        .subscribe()
    } finally {
      setLoading(false)
    }
  }

  async function sendMessage(convId, contenu) {
    if (!user || !contenu.trim()) return
    const { error } = await supabase
      .from('messages')
      .insert({ conversation_id: convId, sender_id: user.id, contenu })
    if (error) throw error
  }

  async function deleteConversation(convId) {
    if (!convId) return { error: new Error('convId required') }
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', convId)
    if (!error) {
      setConversations((prev) => prev.filter((c) => c.id !== convId))
    }
    return { error }
  }

  async function createConversation(wishId, wisherId) {
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

  // Cleanup Realtime + flag mounted (évite warnings sur unmounted)
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (channelRef.current) {
        try { channelRef.current.unsubscribe() } catch {}
        channelRef.current = null
      }
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
    deleteConversation,
  }
}
