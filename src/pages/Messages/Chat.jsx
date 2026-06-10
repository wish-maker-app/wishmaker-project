import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import { useMessages } from '../../hooks/useMessages'
import { useWishes } from '../../hooks/useWishes'
import { checkContent, prewarmModeration } from '../../lib/moderation'
import { supabase, withTimeout, ensureFreshSession } from '../../lib/supabase'
import { subscribeResilient } from '../../lib/realtimeResilient'
import CategoryFallback from '../../components/ui/CategoryFallback'
import BottomSheet from '../../components/ui/BottomSheet'
import ReportSheet from '../../components/ui/ReportSheet'

function RatingModal({ open, onClose, onSubmit, interlocuteurName, loading }) {
  const [note, setNote] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [commentaire, setCommentaire] = useState('')

  return (
    <BottomSheet open={open} onClose={onClose}>
        <div className="text-center mb-5">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="#F5C542" aria-hidden="true" className="mx-auto mb-2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
          <h2 className="text-lg font-bold text-[#1A1A2E] mb-1">Notez {interlocuteurName}</h2>
          <p className="text-sm text-[#8A8A9A]">Comment s'est passée cette expérience ?</p>
        </div>

        {/* Étoiles */}
        <div className="flex items-center justify-center gap-3 mb-5">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setNote(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              className="transition-transform active:scale-90"
            >
              <svg width="40" height="40" viewBox="0 0 24 24"
                fill={(hovered || note) >= star ? '#F5C542' : '#E0E0E0'}
              >
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
              </svg>
            </button>
          ))}
        </div>

        {/* Labels */}
        {note > 0 && (
          <p className="text-center text-sm font-semibold mb-4" style={{ color: '#F5C542' }}>
            {note === 1 ? 'Décevant' : note === 2 ? 'Moyen' : note === 3 ? 'Bien' : note === 4 ? 'Très bien' : 'Excellent !'}
          </p>
        )}

        {/* Commentaire optionnel */}
        <textarea
          value={commentaire}
          onChange={(e) => setCommentaire(e.target.value)}
          placeholder="Laissez un commentaire (optionnel)"
          rows={3}
          className="w-full bg-[#F7F8FC] rounded-2xl px-4 py-3 text-sm text-[#1A1A2E] outline-none resize-none mb-4"
        />

        <button
          onClick={() => onSubmit(note, commentaire)}
          disabled={note === 0 || loading}
          className="w-full h-12 rounded-full text-white font-bold text-sm disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
        >
          {loading ? 'Envoi...' : 'Envoyer ma note'}
        </button>
        <button onClick={onClose} className="w-full mt-3 text-sm text-[#8A8A9A] text-center">
          Plus tard
        </button>
    </BottomSheet>
  )
}

export default function Chat() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const fromTab = searchParams.get('tab') || 'missions'
  const isDraft = id === 'new'
  const draftWishId = searchParams.get('wishId')
  const draftWisherId = searchParams.get('wisherId')
  const [input, setInput] = useState('')
  const scrollRef = useRef(null)
  // Garde anti double-envoi : empêche qu'un re-clic (pendant que le 1er envoi
  // est en cours) ne reparte. Combiné au vidage immédiat du champ ci-dessous.
  const sendingRef = useRef(false)
  const userId = useAuthStore((s) => s.user?.id)
  const authTick = useAuthStore((s) => s.authTick)
  const { messages, loadMessages, sendMessage, createConversation, loadConversations, conversations, loading, deleteConversation } = useMessages()
  const { markWishRealized, markRealizedByMaker, confirmRealization, submitRating, getUserRating } = useWishes()
  const [interlocuteur, setInterlocuteur] = useState({ prenom: 'Utilisateur', nom: '', pseudo: null, is_online: false })
  const [wishTitre, setWishTitre] = useState('')
  const [convData, setConvData] = useState(null)
  const [isWisher, setIsWisher] = useState(false)
  const [wishStatut, setWishStatut] = useState('')
  const [showRating, setShowRating] = useState(false)
  const [alreadyRated, setAlreadyRated] = useState(false)
  const [ratingLoading, setRatingLoading] = useState(false)
  const [showConfirmRealise, setShowConfirmRealise] = useState(false)
  const [showWisherConfirm, setShowWisherConfirm] = useState(false)
  const [markedRealizedAt, setMarkedRealizedAt] = useState(null)
  const [markedRealizedBy, setMarkedRealizedBy] = useState(null)
  // User qui a effectivement clique "J'ai realise ce voeu" — fetch dynamiquement
  // depuis markedRealizedBy (qui est l'auth.uid() au moment du clic). On l'affiche
  // dans la banniere cote Wisher au lieu de presumer que c'est l'interlocuteur.
  const [markedRealizedByUser, setMarkedRealizedByUser] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [convId, setConvId] = useState(isDraft ? null : id)
  const [showMenu, setShowMenu] = useState(false)
  const [showReport, setShowReport] = useState(false)
  const [showDeleteConv, setShowDeleteConv] = useState(false)
  const [deletingConv, setDeletingConv] = useState(false)

  async function handleDeleteConv() {
    if (!convId) return
    setDeletingConv(true)
    const { error } = await deleteConversation(convId)
    setDeletingConv(false)
    if (error) {
      toast.error('Impossible de supprimer la conversation')
      console.error('[chat delete]', error)
      return
    }
    toast.success('Conversation supprimée')
    setShowDeleteConv(false)
    navigate(`/messages?tab=${fromTab}`, { replace: true })
  }

  // Signalement de la conversation (= l'interlocuteur, pour son comportement /
  // ses messages). Type 'conversation' + lien vers la conversation → l'admin
  // pourra lire l'échange pour trancher.
  const CONV_REPORT_REASONS = ['Tentative d\'arnaque', 'Messages insultants', 'Spam / publicité', 'Contenu inapproprié', 'Autre']
  async function submitReport(raison) {
    const interlocuteurId = isWisher ? convData?.maker_id : convData?.wisher_id
    if (!interlocuteurId || !userId) { toast.error('Impossible de signaler ici.'); return }
    try {
      // Session + timeout : sans ça, l'insert peut rester pendu après un
      // retour d'arrière-plan → « Envoi... » bloqué à vie dans ReportSheet.
      const session = await ensureFreshSession()
      if (!session) { toast.error('Connexion expirée, réessaie.'); return }
      const { error } = await withTimeout(supabase.from('reports').insert({
        reporter_id: userId,
        reported_user_id: interlocuteurId,
        reported_conversation_id: convData?.id || convId || null,
        type: 'conversation',
        raison,
      }))
      if (error) throw error
    } catch (err) {
      toast.error("Impossible d'envoyer le signalement.")
      console.error('[chat report] error:', err)
      return
    }
    setShowReport(false)
    toast.success('Signalement envoyé, merci !')
  }

  useEffect(() => {
    let cancelled = false
    let timer = null
    let attempt = 0
    if (!isDraft) {
      // Retry borné (2s/5s/15s, app visible uniquement) : au réveil PWA le 1er
      // chargement part souvent sur une connexion zombie — sans replanification
      // les messages restaient périmés jusqu'à un improbable prochain authTick.
      function tryLoad() {
        loadMessages(id).then((ok) => {
          if (cancelled || ok) return
          if (attempt < 3) {
            const delay = [2000, 5000, 15000][attempt]
            attempt += 1
            timer = setTimeout(() => {
              timer = null
              if (!cancelled && document.visibilityState === 'visible') tryLoad()
            }, delay)
          }
        })
      }
      tryLoad()
      loadConversations().catch(() => {})
    } else if (draftWisherId) {
      // Mode brouillon : charger les infos du wisher
      import('../../lib/supabase').then(({ supabase }) => {
        supabase.from('users').select('id, prenom, nom, pseudo, avatar_url, is_online, rating').eq('id', draftWisherId).single()
          .then(({ data }) => { if (data) setInterlocuteur(data) })
        supabase.from('wishes').select('id, titre, statut, type_recompense, montant_recompense, prestation_type, prestation_montant, wish_images(url, is_cover), category:categories(slug)').eq('id', draftWishId).single()
          .then(({ data }) => {
            if (data) {
              setWishTitre(data.titre || '')
              setWishStatut(data.statut || '')
              setConvData({ wish: data, wisher_id: draftWisherId, maker_id: userId })
            }
          })
      })
    }
    // authTick : au réveil de l'app (focus/visibility → bump dans useAuth), on
    // recharge les messages + on re-souscrit le Realtime avec un token frais →
    // plus besoin de rafraîchir manuellement pour voir les nouveaux messages.
    return () => { cancelled = true; if (timer) clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, authTick])

  useEffect(() => {
    if (isDraft) return
    const conv = conversations.find((c) => c.id === id)
    if (conv) {
      const wisher = conv.wisher_id === userId
      setIsWisher(wisher)
      setInterlocuteur(wisher ? conv.maker : conv.wisher)
      setWishTitre(conv.wish?.titre || '')
      setWishStatut(conv.wish?.statut || '')
      setMarkedRealizedAt(conv.wish?.marked_realized_at || null)
      setMarkedRealizedBy(conv.wish?.marked_realized_by || null)
      setConvData(conv)

      // Vérifier si l'utilisateur a déjà noté
      const wid = conv.wish_id || conv.wish?.id
      if (wid) {
        getUserRating(wid, userId).then((r) => {
          if (r) setAlreadyRated(true)
        })
      }
    }
  }, [conversations, id, userId])

  // Fetch dynamiquement le user qui a clique "J'ai realise ce voeu" pour
  // afficher SON pseudo dans la banniere (et pas presumer que c'est
  // l'interlocuteur, qui dans certains cas peut etre mal identifie).
  // Si markedRealizedBy === userId (cote Maker qui vient de cliquer), on
  // sait que c'est lui — pas besoin de re-fetch.
  useEffect(() => {
    if (!markedRealizedBy) { setMarkedRealizedByUser(null); return }
    if (markedRealizedBy === userId) {
      // C'est moi (le Maker qui a clique) — pas besoin de fetch
      setMarkedRealizedByUser({
        id: userId,
        pseudo: useAuthStore.getState().profile?.pseudo,
        prenom: useAuthStore.getState().profile?.prenom,
        nom: useAuthStore.getState().profile?.nom,
        avatar_url: useAuthStore.getState().profile?.avatar_url,
      })
      return
    }
    // Sinon (cote Wisher : on doit savoir qui est le Maker qui a clique)
    supabase
      .from('users')
      .select('id, pseudo, prenom, nom, avatar_url')
      .eq('id', markedRealizedBy)
      .single()
      .then(({ data }) => { if (data) setMarkedRealizedByUser(data) })
  }, [markedRealizedBy, userId])

  // Realtime listener sur le voeu de cette conversation. Sans ca, quand le
  // Maker clique "J'ai realise ce voeu", le Wisher (deja dans le chat) ne
  // voit jamais la banniere de confirmation apparaitre — il faudrait qu'il
  // ferme et reouvre la conv. Le listener fait remonter les updates instant.
  useEffect(() => {
    const wid = convData?.wish_id || convData?.wish?.id
    if (!wid) return
    // Souscription auto-réparante. Rattrapage au re-join : re-fetch DIRECT du
    // vœu (statut, marked_realized_*) — fonctionne aussi en mode brouillon, où
    // l'effet dérivé [conversations] est inopérant (early-return isDraft).
    const sub = subscribeResilient({
      topic: `wish:${wid}`,
      label: 'ChatWish',
      build: (ch) => ch.on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'wishes', filter: `id=eq.${wid}` },
        (payload) => {
          const fresh = payload.new
          if (!fresh) return
          setWishStatut(fresh.statut || '')
          setMarkedRealizedAt(fresh.marked_realized_at || null)
          setMarkedRealizedBy(fresh.marked_realized_by || null)
        }
      ),
      onResubscribed: () => {
        withTimeout(supabase
          .from('wishes')
          .select('statut, marked_realized_at, marked_realized_by')
          .eq('id', wid)
          .single())
          .then(({ data }) => {
            if (!data) return
            setWishStatut(data.statut || '')
            setMarkedRealizedAt(data.marked_realized_at || null)
            setMarkedRealizedBy(data.marked_realized_by || null)
          })
          .catch(() => { /* best-effort */ })
      },
    })
    return () => sub.dispose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [convData?.wish_id, convData?.wish?.id])

  // Ne PAS ouvrir automatiquement la modal — l'utilisateur clique sur "Noter" s'il veut noter

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  // Pré-chauffe la modération texte dès l'ouverture du chat → le 1er message
  // n'attend pas le chargement des dictionnaires + de la liste forbidden_words.
  useEffect(() => { prewarmModeration() }, [])

  const [chatModerationError, setChatModerationError] = useState('')

  async function handleSend(e) {
    e.preventDefault()
    const text = input.trim()
    // Garde : champ vide OU envoi déjà en cours → on ignore. Avec le vidage
    // immédiat du champ ci-dessous, ça élimine les doublons quand l'user
    // re-clique parce que "rien ne se passe".
    if (!text || sendingRef.current) return
    // Vœu déjà réalisé + conversation pas encore créée (brouillon) = on bloque
    // la création d'une nouvelle proposition (cohérent avec la RLS backend).
    if (isDraft && wishStatut === 'realise') {
      toast.error('Ce vœu a déjà été réalisé.')
      return
    }
    sendingRef.current = true
    setInput('')            // vide le champ TOUT DE SUITE → un re-clic ne renvoie rien
    setChatModerationError('')
    try {
      const result = await checkContent(text)
      if (!result.isClean) {
        setChatModerationError('Message non envoyé : contenu inapproprié.')
        setInput((cur) => cur || text) // on restaure pour correction
        return
      }
      // Mode brouillon : créer la conversation au premier message
      let targetConvId = convId
      if (!targetConvId && isDraft && draftWishId && draftWisherId) {
        targetConvId = await createConversation(draftWishId, draftWisherId)
        setConvId(targetConvId)
        // Remplacer l'URL sans ajouter à l'historique
        navigate(`/messages/${targetConvId}`, { replace: true })
        loadMessages(targetConvId)
        loadConversations()
      }
      await sendMessage(targetConvId, text)
    } catch (err) {
      // Échec (réseau / création conv) → on restaure le texte pour réessayer.
      toast.error('Message non envoyé, réessaie.')
      setInput((cur) => cur || text)
      console.warn('[chat] send failed:', err?.message)
    } finally {
      sendingRef.current = false
    }
  }

  async function handleMarkRealized() {
    try {
      await markWishRealized(convData.wish_id || convData.wish?.id)
      setWishStatut('realise')
      setShowConfirmRealise(false)
      toast.success('Vœu marqué comme réalisé ! 🎉')
      setShowRating(true)
    } catch (err) {
      toast.error(err.message || 'Erreur')
    }
  }

  // Maker → indique avoir réalisé le vœu
  async function handleMakerMarkRealized() {
    setActionLoading(true)
    try {
      const wishId = convData.wish_id || convData.wish?.id
      // On passe le conv_id pour que la notif push redirige le Wisher droit
      // sur la bonne conversation (au lieu de la page détail du vœu).
      await markRealizedByMaker(wishId, convData.id || id)
      setMarkedRealizedAt(new Date().toISOString())
      setMarkedRealizedBy(userId)
      toast.success('En attente de confirmation du Wisher')
    } catch (err) {
      toast.error(err.message || 'Erreur')
    } finally {
      setActionLoading(false)
    }
  }

  // Wisher → confirme la réalisation
  async function handleWisherConfirm() {
    setActionLoading(true)
    try {
      const wishId = convData.wish_id || convData.wish?.id
      await confirmRealization(wishId)
      setWishStatut('realise')
      setShowWisherConfirm(false)
      toast.success('Vœu confirmé comme réalisé ! 🎉')
      setShowRating(true)
    } catch (err) {
      toast.error(err.message || 'Erreur')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleSubmitRating(note, commentaire) {
    if (!convData) return
    setRatingLoading(true)
    try {
      // Modération du commentaire avant envoi
      if (commentaire && commentaire.trim()) {
        const mod = await checkContent(commentaire)
        if (!mod.isClean) {
          toast.error('Votre commentaire contient des mots non autorisés')
          setRatingLoading(false)
          return
        }
      }

      const wishId = convData.wish_id || convData.wish?.id
      const toUser = isWisher ? convData.maker_id : convData.wisher_id
      await submitRating({ wishId, fromUser: userId, toUser, note, commentaire })
      toast.success('Merci pour votre note ! ⭐')
      setShowRating(false)
      setAlreadyRated(true)
    } catch (err) {
      if (err.message?.includes('duplicate') || err.code === '23505') {
        toast.error('Vous avez déjà noté cette personne')
        setShowRating(false)
        setAlreadyRated(true)
      } else {
        toast.error(err.message || 'Erreur')
      }
    } finally {
      setRatingLoading(false)
    }
  }

  const interlocuteurName = interlocuteur.pseudo || interlocuteur.prenom

  return (
    <div className="h-screen bg-[#FAFAFA] flex flex-col">

      {/* Header */}
      <div className="bg-white px-4 pt-4 pb-3 flex items-center gap-3 border-b border-[#F0F0F0]">
        <button onClick={() => navigate(`/messages?tab=${fromTab}`)} className="p-1">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="#1A1A2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div
          className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer active:opacity-80 transition-opacity"
          onClick={() => {
            const interlocuteurId = isWisher ? convData?.maker_id : convData?.wisher_id
            if (interlocuteurId) navigate(`/maker/user/${interlocuteurId}`)
          }}
        >
          <div className="relative flex-shrink-0">
            {interlocuteur?.avatar_url ? (
              <img
                src={interlocuteur.avatar_url}
                alt=""
                loading="lazy"
                decoding="async"
                className="w-10 h-10 rounded-full object-cover border border-[#E8E8E8]"
              />
            ) : (
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-xs border border-[#E8E8E8]"
                style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}>
                {(interlocuteur?.prenom?.[0] || '') + (interlocuteur?.nom?.[0] || '') || '?'}
              </div>
            )}
            {interlocuteur.is_online && (
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#22C55E] border-2 border-white" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[15px] font-bold text-[#1A1A2E] truncate">
                {interlocuteur.pseudo || `user_${(interlocuteur.id || '0000').slice(0, 4)}`}
              </p>
              {interlocuteur.rating > 0 && (
                <span className="flex items-center gap-0.5 text-xs font-semibold text-[#F59E0B]">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#F59E0B">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                  </svg>
                  {Number(interlocuteur.rating).toFixed(1)}
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#8A8A9A]">
              {interlocuteur.is_online ? 'En ligne' : 'Hors ligne'}
            </p>
          </div>
        </div>
        <div className="relative">
          <button className="p-1" onClick={() => setShowMenu((v) => !v)} aria-label="Options">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="5" r="1.5" fill="#1A1A2E"/>
              <circle cx="12" cy="12" r="1.5" fill="#1A1A2E"/>
              <circle cx="12" cy="19" r="1.5" fill="#1A1A2E"/>
            </svg>
          </button>

          <AnimatePresence>
            {showMenu && (
              <>
                {/* Backdrop transparent pour fermer au clic extérieur */}
                <div
                  className="fixed inset-0 z-[800]"
                  onClick={() => setShowMenu(false)}
                />
                {/* Popup */}
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-1 w-56 bg-white rounded-2xl shadow-xl border border-[#F0F0F0] overflow-hidden z-[801]"
                  style={{ transformOrigin: 'top right' }}
                >
                  <button
                    onClick={() => {
                      const interlocuteurId = isWisher ? convData?.maker_id : convData?.wisher_id
                      setShowMenu(false)
                      if (interlocuteurId) navigate(`/maker/user/${interlocuteurId}`)
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 active:bg-[#F5F5F7] transition-colors text-left"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1A1A2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                      <circle cx="12" cy="7" r="4"/>
                    </svg>
                    <span className="text-sm font-medium text-[#1A1A2E] truncate">Voir le profil</span>
                  </button>

                  <div className="h-px bg-[#F0F0F0]" />

                  <button
                    onClick={() => { setShowMenu(false); setShowReport(true) }}
                    className="w-full flex items-center gap-3 px-4 py-3 active:bg-[#FEF2F2] transition-colors text-left"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/>
                      <line x1="4" y1="22" x2="4" y2="15"/>
                    </svg>
                    <span className="text-sm font-medium text-[#EF4444] truncate">Signaler</span>
                  </button>

                  <div className="h-px bg-[#F0F0F0]" />

                  <button
                    disabled={deletingConv}
                    onClick={() => { setShowMenu(false); setShowDeleteConv(true) }}
                    className="w-full flex items-center gap-3 px-4 py-3 active:bg-[#FEF2F2] transition-colors text-left disabled:opacity-50"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                      <polyline points="3,6 5,6 21,6"/>
                      <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
                      <path d="M10 11v6M14 11v6"/>
                    </svg>
                    <span className="text-sm font-medium text-[#EF4444] truncate">Supprimer la conversation</span>
                  </button>
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Encart récap du voeu */}
      {convData?.wish && (
        <div
          onClick={() => navigate(`/maker/wish/${convData.wish.id}${isWisher ? '?owner=1' : ''}`)}
          className="bg-white px-4 py-3 border-b border-[#F0F0F0] flex items-center gap-3 cursor-pointer active:bg-[#F9F9FB] transition-colors"
        >
          {convData.wish.wish_images?.[0]?.url ? (
            <img src={convData.wish.wish_images[0].url} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
          ) : (
            <div className="w-12 h-12 rounded-xl flex-shrink-0 overflow-hidden">
              <CategoryFallback slug={convData.wish.category?.slug} iconSize={24} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#1A1A2E] truncate">{convData.wish.titre}</p>
            {(convData.wish.type_recompense || convData.wish.prestation_type) && (
              <p className="text-xs font-medium text-[#8A8A9A] mt-0.5">
                {convData.wish.type_recompense && (
                  <span style={{ color: convData.wish.type_recompense === 'argent' ? '#059669' : '#3B82F6', fontWeight: 'bold' }}>
                    {convData.wish.type_recompense === 'argent'
                      ? `${convData.wish.montant_recompense ? convData.wish.montant_recompense + '€' : 'Argent'}`
                      : 'Bon procédé'}
                  </span>
                )}
                {convData.wish.type_recompense && convData.wish.prestation_type && ' · '}
                {convData.wish.prestation_type === 'devis' && (
                  <span style={{ color: '#7C3AED', fontWeight: 'bold' }}>Sur devis</span>
                )}
                {convData.wish.prestation_type === 'budget' && convData.wish.prestation_montant && (
                  <span style={{ color: '#7C3AED', fontWeight: 'bold' }}>Budget {convData.wish.prestation_montant}€</span>
                )}
              </p>
            )}
          </div>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
            <path d="M9 18l6-6-6-6" stroke="#8A8A9A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      )}

      {/* Bannière statut réalisé */}
      {wishStatut === 'realise' && (
        <div className="bg-[#ECFDF5] px-4 py-2.5 flex items-center justify-center gap-2">
          <span className="text-lg">🎉</span>
          <span className="text-xs font-semibold text-[#059669]">Ce vœu a été réalisé !</span>
          {!alreadyRated && (
            <button
              onClick={() => setShowRating(true)}
              className="ml-2 text-[11px] font-bold text-white px-3 py-1 rounded-full"
              style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
            >
              Noter
            </button>
          )}
        </div>
      )}

      {/* ─── MAKER : bouton "J'ai réalisé ce vœu" (etat initial) ─── */}
      {!isWisher && wishStatut !== 'realise' && wishStatut !== 'annule' && !markedRealizedAt && (
        <div className="px-4 py-3 bg-white border-b border-[#F0F0F0]">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleMakerMarkRealized}
            disabled={actionLoading}
            className="w-full h-11 rounded-full text-[13.5px] font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-60 transition-all"
            style={{
              background: 'linear-gradient(135deg,#22C55E,#16A34A)',
              boxShadow: '0 4px 14px -2px rgba(34, 197, 94, 0.35)',
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            J'ai réalisé ce vœu
          </motion.button>
        </div>
      )}

      {/* ─── MAKER : en attente de confirmation du Wisher (apres clic) ─── */}
      {!isWisher && wishStatut !== 'realise' && markedRealizedAt && markedRealizedBy === userId && (
        <div
          className="px-4 py-3.5 border-b"
          style={{
            background: 'linear-gradient(135deg, #FFF7ED, #FFEDD5)',
            borderColor: '#FED7AA',
          }}
        >
          <div className="flex items-center gap-3">
            {/* Icône horloge animée */}
            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-[0_2px_6px_rgba(234,88,12,0.15)]">
              <motion.svg
                animate={{ rotate: 360 }}
                transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
                width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#EA580C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M12 7v5l3 2" />
              </motion.svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-[#9A3412] leading-tight">
                En attente de confirmation
              </p>
              <p className="text-[11.5px] text-[#C2410C] mt-0.5 leading-snug">
                {interlocuteur?.pseudo || interlocuteur?.prenom || 'Le Wisher'} doit valider que le vœu a bien été réalisé.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── WISHER : banniere "Le Maker indique avoir realise ce voeu" ─── */}
      {isWisher && wishStatut !== 'realise' && markedRealizedAt && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-4 border-b relative overflow-hidden"
          style={{
            background: 'linear-gradient(135deg, #ECFDF5, #D1FAE5)',
            borderColor: '#A7F3D0',
          }}
        >
          {/* Glow décoratif en haut à droite */}
          <div
            className="absolute -top-8 -right-8 w-24 h-24 rounded-full opacity-40 pointer-events-none"
            style={{ background: 'radial-gradient(circle, #6EE7B7, transparent 70%)' }}
          />

          {/* Header : avatar + nom de la personne qui a marque le voeu comme realise
              (fetch dynamiquement depuis markedRealizedBy → toujours juste). */}
          <div className="relative flex items-center gap-3 mb-3">
            <div className="relative">
              {markedRealizedByUser?.avatar_url ? (
                <img
                  src={markedRealizedByUser.avatar_url}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm border-2 border-white shadow-sm"
                  style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
                >
                  {(markedRealizedByUser?.prenom?.[0] || '') + (markedRealizedByUser?.nom?.[0] || '') || '?'}
                </div>
              )}
              {/* Petit badge check vert */}
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white flex items-center justify-center">
                <div
                  className="w-4 h-4 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,#22C55E,#16A34A)' }}
                >
                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[#065F46] truncate">
                @{markedRealizedByUser?.pseudo || markedRealizedByUser?.prenom || '…'}
              </p>
              <p className="text-[13.5px] font-bold text-[#064E3B] leading-snug">
                indique avoir réalisé votre vœu
              </p>
            </div>
          </div>

          {/* Sous-texte explicatif */}
          <p className="relative text-[11.5px] text-[#047857] leading-snug mb-3 pl-0.5">
            Confirmez si c'est bien le cas pour clôturer la mise en relation.
            Sinon, signalez un souci pour discuter avec le Maker.
          </p>

          {/* CTAs */}
          <div className="relative flex gap-2">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleWisherConfirm}
              disabled={actionLoading}
              className="flex-1 h-10 rounded-full text-[13px] font-bold text-white flex items-center justify-center gap-1.5 disabled:opacity-60 transition-all"
              style={{
                background: 'linear-gradient(135deg,#22C55E,#16A34A)',
                boxShadow: '0 4px 12px -2px rgba(34, 197, 94, 0.4)',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
              Confirmer
            </motion.button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowMenu(true)}
              disabled={actionLoading}
              className="h-10 px-4 rounded-full text-[12.5px] font-semibold flex items-center justify-center disabled:opacity-60 bg-white border border-[#A7F3D0] text-[#065F46] transition-all"
            >
              Signaler
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3">
        {messages.map((msg) => {
          const isMe = msg.sender_id === userId
          const time = msg.created_at
            ? new Date(msg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
            : ''
          return (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-[75%] px-4 py-2.5 ${
                isMe
                  ? 'rounded-[18px_18px_4px_18px] text-white'
                  : 'rounded-[18px_18px_18px_4px] bg-white text-[#1A1A2E] border border-[#F0F0F0]'
              }`}
                style={isMe ? { background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' } : undefined}
              >
                <p className="text-[14px] leading-relaxed">{msg.contenu}</p>
                <p className={`text-[10px] mt-1 ${isMe ? 'text-white/60' : 'text-[#8A8A9A]'}`}>
                  {time}
                </p>
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* Warning modération */}
      {chatModerationError && (
        <div className="bg-red-50 px-4 py-2 border-b border-red-100">
          <p className="text-xs text-red-500">{chatModerationError}</p>
        </div>
      )}

      {/* Input — ou bandeau lecture seule si nouvelle proposition sur vœu réalisé */}
      {isDraft && wishStatut === 'realise' ? (
        <div className="bg-white border-t border-[#F0F0F0] px-4 py-4 text-center"
          style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom, 0px))' }}>
          <p className="text-sm font-semibold text-[#8A8A9A]">Ce vœu a déjà été réalisé.</p>
          <p className="text-xs text-[#B0B0B0] mt-0.5">Vous ne pouvez plus envoyer de proposition.</p>
        </div>
      ) : (
        <form onSubmit={handleSend} className="bg-white border-t border-[#F0F0F0] px-4 py-3 flex items-center gap-3"
          style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom, 0px))' }}>
          <input
            value={input}
            onChange={(e) => { setInput(e.target.value); setChatModerationError('') }}
            placeholder={t('messages.envoyer')}
            className="flex-1 h-11 bg-[#F5F5F5] rounded-full px-4 text-sm text-[#1A1A2E] placeholder-[#B0B0B0] outline-none"
          />
          <button
            type="submit"
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M22 2L11 13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M22 2L15 22l-4-9-9-4L22 2z" stroke="white" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
          </button>
        </form>
      )}

      {/* Modal confirmation "Marquer comme réalisé" */}
      <BottomSheet open={showConfirmRealise} onClose={() => setShowConfirmRealise(false)}>
        <div className="text-center mb-5">
          <span className="text-4xl mb-2 block">✅</span>
          <h2 className="text-lg font-bold text-[#1A1A2E] mb-1">Confirmer la réalisation</h2>
          <p className="text-sm text-[#8A8A9A]">
            Confirmez-vous que <span className="font-semibold text-[#5B6BF5]">{interlocuteurName}</span> a bien réalisé votre vœu ?
          </p>
        </div>
        <button
          onClick={handleMarkRealized}
          className="w-full h-12 rounded-full text-white font-bold text-sm"
          style={{ background: 'linear-gradient(135deg,#22C55E,#16A34A)' }}
        >
          Oui, le vœu est réalisé !
        </button>
        <button onClick={() => setShowConfirmRealise(false)}
          className="w-full mt-3 text-sm text-[#8A8A9A] text-center">
          Annuler
        </button>
      </BottomSheet>

      {/* Modal notation */}
      <RatingModal
        open={showRating}
        onClose={() => setShowRating(false)}
        onSubmit={handleSubmitRating}
        interlocuteurName={interlocuteurName}
        loading={ratingLoading}
      />

      {/* Feuille de signalement de la conversation (motif) */}
      <ReportSheet
        open={showReport}
        onClose={() => setShowReport(false)}
        title="Signaler la conversation"
        reasons={CONV_REPORT_REASONS}
        onSubmit={submitReport}
      />

      {/* Modal confirmation suppression conversation */}
      <BottomSheet open={showDeleteConv} onClose={() => setShowDeleteConv(false)}>
        <div className="text-center mb-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: '#FEE2E2' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3,6 5,6 21,6"/>
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              <path d="M10 11v6M14 11v6"/>
            </svg>
          </div>
          <h2 className="text-lg font-bold text-[#1A1A2E]">Supprimer la conversation</h2>
          <p className="text-sm text-[#8A8A9A] mt-1 max-w-[280px] mx-auto">
            Toute la conversation avec {interlocuteurName} et ses messages seront supprimés définitivement. Cette action est irréversible.
          </p>
        </div>
        <button
          onClick={handleDeleteConv}
          disabled={deletingConv}
          className="w-full h-[52px] rounded-full text-white font-bold text-[15px] mb-2 disabled:opacity-50"
          style={{ background: '#EF4444' }}
        >
          {deletingConv ? 'Suppression…' : 'Supprimer définitivement'}
        </button>
        <button onClick={() => setShowDeleteConv(false)} className="w-full text-sm text-[#8A8A9A] py-2">
          Annuler
        </button>
      </BottomSheet>

    </div>
  )
}
