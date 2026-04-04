import { useState, useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import useAuthStore from '../store/authStore'

export function useNotifications() {
  const user = useAuthStore((s) => s.user)
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)
  const [expiringWishesCount, setExpiringWishesCount] = useState(0)
  const channelRef = useRef(null)

  // Compte les messages non lus
  async function fetchUnreadCount() {
    if (!user) return
    // Récupère les conversations du user
    const { data: convs } = await supabase
      .from('conversations')
      .select('id')
      .or(`wisher_id.eq.${user.id},maker_id.eq.${user.id}`)
    if (!convs || convs.length === 0) { setUnreadMessagesCount(0); return }

    const convIds = convs.map((c) => c.id)
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', convIds)
      .neq('sender_id', user.id)
      .eq('is_read', false)

    setUnreadMessagesCount(count || 0)
  }

  // Compte les vœux qui expirent dans moins de 24h
  async function fetchExpiringCount() {
    if (!user) return
    const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    const now = new Date().toISOString()
    const { count } = await supabase
      .from('wishes')
      .select('*', { count: 'exact', head: true })
      .eq('wisher_id', user.id)
      .eq('statut', 'en_attente')
      .gt('expires_at', now)
      .lt('expires_at', in24h)

    setExpiringWishesCount(count || 0)
  }

  // Met à jour le badge sur l'icône PWA
  function updateAppBadge(count) {
    if ('setAppBadge' in navigator) {
      if (count > 0) {
        navigator.setAppBadge(count).catch(() => {})
      } else {
        navigator.clearAppBadge().catch(() => {})
      }
    }
  }

  useEffect(() => {
    if (!user) return

    fetchUnreadCount()
    fetchExpiringCount()

    // Realtime sur les messages
    const channel = supabase
      .channel('notifications-messages')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        fetchUnreadCount()
      })
      .subscribe()
    channelRef.current = channel

    // Rafraîchir les vœux expirants toutes les 5 minutes
    const interval = setInterval(fetchExpiringCount, 5 * 60 * 1000)

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
      clearInterval(interval)
    }
  }, [user?.id])

  // Mettre à jour le badge PWA quand le compteur change
  useEffect(() => {
    updateAppBadge(unreadMessagesCount)
  }, [unreadMessagesCount])

  return { unreadMessagesCount, expiringWishesCount }
}
