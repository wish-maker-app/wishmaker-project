import { useState, useEffect, useRef } from 'react'
import { supabase, withTimeout, ensureFreshSession } from '../lib/supabase'
import { subscribeResilient } from '../lib/realtimeResilient'
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
  // Dédup fetchMessages par conversation + garde anti-résultat-périmé quand on
  // change de conversation pendant qu'un fetch est en vol.
  const msgsFetchRef = useRef({})
  const activeConvRef = useRef(null)

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
      // Session valide OBLIGATOIRE : les policies conversations_select_* sont
      // réservées au rôle authenticated. Sans session, la requête part en
      // anonyme → 0 ligne SANS erreur → fausse "boîte vide" + cache pollué. On
      // lève NO_SESSION (réessayable) plutôt que de requêter en anonyme. (cf.
      // ensureFreshSession : bornée + retry cold-start, ne hang jamais → le
      // finally tourne, le garde inFlight ne reste pas bloqué.)
      const session = await ensureFreshSession()
      if (!session) throw new Error('NO_SESSION')
      const { data, error } = await withTimeout(supabase
        .from('conversations')
        .select(`
          *,
          wish:wishes(id, titre, statut, type_recompense, montant_recompense, prestation_type, prestation_montant, marked_realized_at, marked_realized_by, wish_images(url, is_cover), category:categories(slug)),
          wisher:users!wisher_id(id, prenom, nom, pseudo, avatar_url, is_online, rating, type_compte),
          maker:users!maker_id(id, prenom, nom, pseudo, avatar_url, is_online, rating, type_compte),
          messages(contenu, created_at, is_read, sender_id)
        `)
        .or(`wisher_id.eq.${user.id},maker_id.eq.${user.id}`)
        .order('created_at', { ascending: false }))
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
      // Cooldown 1.5s declenche UNIQUEMENT apres un succes (sinon un echec
      // bloquerait les retries pendant 1.5s).
      lastConvTsRef.current = Date.now()
    } finally {
      setLoading(false)
      convInFlightRef.current = false
    }
  }

  // Fusion par id : on garde les messages de prev absents du snapshot (envoi
  // optimiste pas encore committé, INSERT realtime arrivé pendant le fetch) —
  // un remplacement sec faisait disparaître transitoirement ces messages.
  function mergeMessages(fresh, prev) {
    const ids = new Set(fresh.map((m) => m.id))
    const extra = (prev || []).filter((m) => !ids.has(m.id))
    if (extra.length === 0) return fresh
    return [...fresh, ...extra].sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
  }

  // Fetch des messages d'une conversation (sans la partie souscription).
  // Sert aussi de refetch de RATTRAPAGE quand le canal realtime se re-joint
  // après un trou (les events manqués pendant le trou ne sont pas rejoués).
  // Dédup par conversation (inFlight + cooldown 1.5s) : au réveil, authTick et
  // la re-jointe du canal déclenchent ce fetch quasi en même temps.
  async function fetchMessages(convId) {
    const slot = msgsFetchRef.current[convId] || (msgsFetchRef.current[convId] = { inFlight: false, ts: 0 })
    if (slot.inFlight) return
    if (Date.now() - slot.ts < 1500) return
    slot.inFlight = true
    try {
      const cacheKey = `messages_${convId}`
      // Session valide OBLIGATOIRE (comme loadConversations) : en anonyme la
      // RLS renvoie [] SANS erreur → chat vidé + cache empoisonné.
      const session = await ensureFreshSession()
      if (!session) throw new Error('NO_SESSION')
      const { data, error } = await withTimeout(supabase
        .from('messages')
        .select(`*, sender:users!sender_id(id, prenom, nom, avatar_url)`)
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true }))
      if (error) throw error
      // Résultat périmé (l'utilisateur a changé de conversation pendant le
      // fetch) → on ne touche ni au state ni au cache de l'autre conv.
      if (activeConvRef.current !== convId) return
      const list = data || []
      if (mountedRef.current) {
        setMessages((prev) => {
          const merged = mergeMessages(list, prev)
          // Pas d'écrasement du cache par du vide si on a déjà du contenu.
          const existing = getCached(cacheKey)?.value
          if (merged.length > 0 || !existing || existing.length === 0) setCached(cacheKey, merged)
          return merged
        })
      }
      slot.ts = Date.now()

      // Marque les messages non lus comme lus (best-effort, on ne throw pas si ça rate)
      try {
        await withTimeout(supabase
          .from('messages')
          .update({ is_read: true })
          .eq('conversation_id', convId)
          .neq('sender_id', user?.id)
          .eq('is_read', false))
      } catch { /* best-effort */ }
    } finally {
      slot.inFlight = false
    }
  }

  // Charge les messages d'une conversation + Realtime
  async function loadMessages(convId) {
    if (!convId) return
    activeConvRef.current = convId
    // Hydrate depuis cache pour éviter écran vide pendant le fetch
    const cacheKey = `messages_${convId}`
    const cached = getCached(cacheKey)?.value
    if (cached) setMessages(cached)
    if (!cached) setLoading(true)
    try {
      // Souscription AUTO-RÉPARANTE, créée AVANT le fetch (le handler dédup
      // par id absorbe le chevauchement → pas de trou entre le snapshot et le
      // join) et RÉUTILISÉE si déjà en place pour cette conversation : le sub
      // se répare seul, le recréer à chaque authTick remettait son compteur de
      // jointes à zéro et perdait le refetch de rattrapage des re-jointes.
      const topic = `messages:${convId}`
      if (mountedRef.current && channelRef.current?.topic !== topic) {
        try { channelRef.current?.handle?.dispose() } catch { /* déjà disposé */ }
        channelRef.current = {
          topic,
          handle: subscribeResilient({
            topic,
            label: 'ChatMessages',
            build: (ch) => ch.on(
              'postgres_changes',
              { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${convId}` },
              (payload) => {
                // Garde anti-pollution : un event encore en file pour l'ANCIENNE
                // conversation ne doit pas s'ajouter à la liste de la nouvelle.
                if (!mountedRef.current || activeConvRef.current !== convId) return
                setMessages((prev) => {
                  // Dédup : l'envoi optimiste a pu déjà ajouter ce message.
                  if (prev.some((m) => m.id === payload.new.id)) return prev
                  const next = [...prev, payload.new]
                  setCached(cacheKey, next)
                  return next
                })
              }
            ),
            onResubscribed: () => {
              if (mountedRef.current) fetchMessages(convId).catch(() => {})
            },
          }),
        }
      }
      await fetchMessages(convId)
    } catch (err) {
      // Timeout / reseau (ex: connexion morte au retour d'arriere-plan) :
      // on garde les messages en cache deja affiches, pas d'ecran vide ni de
      // rejection non geree. Le prochain authTick (reveil) relancera.
      console.warn('[useMessages] loadMessages echec, cache conserve:', err?.message)
    } finally {
      setLoading(false)
    }
  }

  async function sendMessage(convId, contenu) {
    if (!user || !contenu.trim()) return
    // Écritures protégées comme les lectures : session valide obligatoire
    // (sinon l'insert part en anonyme → rejeté par la RLS) + withTimeout
    // (sinon un hang interne de supabase-js au retour d'arrière-plan laisse
    // la promesse pendante POUR TOUJOURS → le finally de l'appelant ne tourne
    // jamais → bouton « Envoi... » bloqué jusqu'au kill de l'app).
    const session = await ensureFreshSession()
    if (!session) throw new Error('NO_SESSION')
    const { data, error } = await withTimeout(supabase
      .from('messages')
      .insert({ conversation_id: convId, sender_id: user.id, contenu })
      .select('*, sender:users!sender_id(id, prenom, nom, avatar_url)')
      .single())
    if (error) throw error
    // Affichage OPTIMISTE : on ajoute le message immédiatement, sans dépendre du
    // Realtime (qui peut être en retard ou filtré si le JWT du socket n'est pas
    // à jour). Dédup par id car le handler Realtime peut livrer le même message.
    // On met aussi à jour le cache → si le Chat (re)monte juste après (flux
    // « proposer un vœu »), il s'hydrate avec le message déjà présent.
    if (data) {
      setMessages((prev) => (prev.some((m) => m.id === data.id) ? prev : [...prev, data]))
      const ck = `messages_${convId}`
      const cached = getCached(ck)?.value || []
      if (!cached.some((m) => m.id === data.id)) setCached(ck, [...cached, data])
    }
    return data
  }

  async function deleteConversation(convId) {
    if (!convId) return { error: new Error('convId required') }
    try {
      const session = await ensureFreshSession()
      if (!session) return { error: new Error('NO_SESSION') }
      const { error } = await withTimeout(supabase
        .from('conversations')
        .delete()
        .eq('id', convId))
      if (!error) {
        setConversations((prev) => prev.filter((c) => c.id !== convId))
      }
      return { error }
    } catch (err) {
      // QUERY_TIMEOUT → l'appelant affiche son toast d'échec au lieu de hanger
      return { error: err }
    }
  }

  async function createConversation(wishId, wisherId) {
    // Même protection que sendMessage : sans session l'INSERT est rejeté par
    // la RLS, et sans timeout un hang post-resume bloque « Envoi... » à vie.
    const session = await ensureFreshSession()
    if (!session) throw new Error('NO_SESSION')
    const { data: existing } = await withTimeout(supabase
      .from('conversations')
      .select('id')
      .eq('wish_id', wishId)
      .eq('maker_id', user.id)
      .single())
    if (existing) return existing.id

    const { data, error } = await withTimeout(supabase
      .from('conversations')
      .insert({ wish_id: wishId, wisher_id: wisherId, maker_id: user.id })
      .select()
      .single())
    if (error) throw error
    return data.id
  }

  // Cleanup Realtime + flag mounted (évite warnings sur unmounted).
  // dispose() fait un vrai removeChannel — l'ancien unsubscribe() laissait des
  // canaux zombies dans supabase.getChannels() au fil des navigations.
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      if (channelRef.current) {
        try { channelRef.current.handle?.dispose() } catch { /* déjà disposé */ }
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
