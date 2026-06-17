import { useState, useEffect } from 'react'
import { supabase, withTimeout, ensureFreshSession } from '../lib/supabase'
import { subscribeResilient } from '../lib/realtimeResilient'
import { realtimeProbe } from '../lib/realtimeProbe'
import useAuthStore from '../store/authStore'

export function useNotifications() {
  const user = useAuthStore((s) => s.user)
  const [unreadMessagesCount, setUnreadMessagesCount] = useState(0)
  const [expiringWishesCount, setExpiringWishesCount] = useState(0)

  // Compte les messages non lus.
  // Session obligatoire + timeout + bail silencieux sur erreur : sans ça, une
  // requête anonyme (RLS → [] sans erreur) ou un échec réseau au réveil
  // posait un FAUX 0 → le badge PWA s'effaçait à tort.
  async function fetchUnreadCount() {
    if (!user) return
    try {
      const session = await ensureFreshSession()
      if (!session) return // pas de session → on garde la valeur courante
      const { data: convs, error: e1 } = await withTimeout(supabase
        .from('conversations')
        .select('id')
        .or(`wisher_id.eq.${user.id},maker_id.eq.${user.id}`))
      if (e1 || !convs) return
      if (convs.length === 0) { setUnreadMessagesCount(0); return } // vrai zéro

      const convIds = convs.map((c) => c.id)
      const { count, error: e2 } = await withTimeout(supabase
        .from('messages')
        .select('*', { count: 'exact', head: true })
        .in('conversation_id', convIds)
        .neq('sender_id', user.id)
        .eq('is_read', false))
      if (e2) return
      setUnreadMessagesCount(count || 0)
    } catch { /* timeout / réseau → on garde la valeur courante */ }
  }

  // Compte les vœux qui expirent dans moins de 24h
  async function fetchExpiringCount() {
    if (!user) return
    try {
      const session = await ensureFreshSession()
      if (!session) return
      const in24h = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      const now = new Date().toISOString()
      const { count, error } = await withTimeout(supabase
        .from('wishes')
        .select('*', { count: 'exact', head: true })
        .eq('wisher_id', user.id)
        .eq('statut', 'en_attente')
        .gt('expires_at', now)
        .lt('expires_at', in24h))
      if (error) return
      setExpiringWishesCount(count || 0)
    } catch { /* on garde la valeur courante */ }
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

    realtimeProbe.setUser(user.id)
    fetchUnreadCount()   // valeur initiale immédiate (avant le 1er tick de sonde)
    fetchExpiringCount()

    // Pastille non-lus pilotée par la SONDE unique partagée (ré+ fiable que le
    // Realtime seul, et sans le double-poll du v56). La sonde est instantanée
    // via le nudge ci-dessous quand le Realtime marche, et garantit la fraîcheur
    // en ~3 s pendant un trou Realtime.
    const unsubProbe = realtimeProbe.subscribe(({ unread }) => setUnreadMessagesCount(unread))

    // Realtime sur les messages — souscription auto-réparante. Un event ne
    // requête plus directement : il « nudge » la sonde (cadence rapide + sonde
    // immédiate, dédupliquée). onSuspect : idem si le canal hoquette.
    const sub = subscribeResilient({
      topic: 'notifications-messages',
      label: 'NotifBadge',
      build: (ch) => ch.on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => {
        realtimeProbe.nudge()
      }),
      onResubscribed: () => { realtimeProbe.nudge() },
      onSuspect: () => { realtimeProbe.nudge() },
    })

    // Rafraîchir les vœux expirants toutes les 5 minutes
    const interval = setInterval(fetchExpiringCount, 5 * 60 * 1000)

    return () => {
      unsubProbe()
      sub.dispose()
      clearInterval(interval)
    }
  }, [user?.id])

  // Mettre à jour le badge PWA quand le compteur change
  useEffect(() => {
    updateAppBadge(unreadMessagesCount)
  }, [unreadMessagesCount])

  return { unreadMessagesCount, expiringWishesCount }
}
