import { useState, useRef, useEffect } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import useAuthStore from '../../store/authStore'
import { useMessages } from '../../hooks/useMessages'
import { useWishes } from '../../hooks/useWishes'

function RatingModal({ open, onClose, onSubmit, interlocuteurName, loading }) {
  const [note, setNote] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [commentaire, setCommentaire] = useState('')

  if (!open) return null

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/40 z-[900] overlay-backdrop" />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[28px] z-[901] px-5 pb-8 pt-4 bottom-sheet"
      >
        <div className="w-10 h-1 rounded-full bg-[#E0E0E0] mx-auto mb-4" />
        <div className="text-center mb-5">
          <span className="text-4xl mb-2 block">⭐</span>
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
      </motion.div>
    </>
  )
}

export default function Chat() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const fromTab = searchParams.get('tab') || 'missions'
  const [input, setInput] = useState('')
  const scrollRef = useRef(null)
  const userId = useAuthStore((s) => s.user?.id)
  const { messages, loadMessages, sendMessage, loadConversations, conversations, loading } = useMessages()
  const { markWishRealized, submitRating, getUserRating } = useWishes()
  const [interlocuteur, setInterlocuteur] = useState({ prenom: 'Utilisateur', nom: '', pseudo: null, is_online: false })
  const [wishTitre, setWishTitre] = useState('')
  const [convData, setConvData] = useState(null)
  const [isWisher, setIsWisher] = useState(false)
  const [wishStatut, setWishStatut] = useState('')
  const [showRating, setShowRating] = useState(false)
  const [alreadyRated, setAlreadyRated] = useState(false)
  const [ratingLoading, setRatingLoading] = useState(false)
  const [showConfirmRealise, setShowConfirmRealise] = useState(false)

  useEffect(() => {
    loadMessages(id)
    loadConversations().then(() => {})
  }, [id])

  useEffect(() => {
    const conv = conversations.find((c) => c.id === id)
    if (conv) {
      const wisher = conv.wisher_id === userId
      setIsWisher(wisher)
      setInterlocuteur(wisher ? conv.maker : conv.wisher)
      setWishTitre(conv.wish?.titre || '')
      setWishStatut(conv.wish?.statut || '')
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

  // Ne PAS ouvrir automatiquement la modal — l'utilisateur clique sur "Noter" s'il veut noter

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight })
  }, [messages])

  async function handleSend(e) {
    e.preventDefault()
    if (!input.trim()) return
    await sendMessage(id, input.trim())
    setInput('')
  }

  async function handleMarkRealized() {
    try {
      await markWishRealized(convData.wish_id || convData.wish?.id)
      setWishStatut('realise')
      setShowConfirmRealise(false)
      toast.success('Vœu marqué comme réalisé ! 🎉')
      // Montrer directement la modal de notation
      setShowRating(true)
    } catch (err) {
      toast.error(err.message || 'Erreur')
    }
  }

  async function handleSubmitRating(note, commentaire) {
    if (!convData) return
    setRatingLoading(true)
    try {
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
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">

      {/* Header */}
      <div className="bg-white px-4 pt-8 pb-3 flex items-center gap-3 border-b border-[#F0F0F0]">
        <button onClick={() => navigate(`/messages?tab=${fromTab}`)} className="p-1">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="#1A1A2E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
        <div className="relative flex-shrink-0">
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-xs border border-[#E8E8E8]"
            style={{ background: 'linear-gradient(135deg,#8A8A9A,#B0B0B0)' }}>
            {interlocuteur?.prenom?.[0]}{interlocuteur?.nom?.[0]}
          </div>
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
        <button className="p-1">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="5" r="1.5" fill="#1A1A2E"/>
            <circle cx="12" cy="12" r="1.5" fill="#1A1A2E"/>
            <circle cx="12" cy="19" r="1.5" fill="#1A1A2E"/>
          </svg>
        </button>
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
            <div className="w-12 h-12 rounded-xl flex-shrink-0 flex items-center justify-center bg-[#EEF0FF]">
              <span className="text-lg">✨</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#1A1A2E] truncate">{convData.wish.titre}</p>
            {convData.wish.type_recompense && (
              <p className="text-xs font-bold mt-0.5" style={{
                color: convData.wish.type_recompense === 'argent' ? '#059669' : '#3B82F6'
              }}>
                {convData.wish.type_recompense === 'argent'
                  ? `${convData.wish.montant_recompense ? convData.wish.montant_recompense + ' €' : 'Argent'}`
                  : 'Bon procédé'}
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

      {/* Bouton "Marquer comme réalisé" pour le Wisher */}
      {isWisher && wishStatut === 'en_attente' && (
        <div className="bg-white px-4 py-3 border-b border-[#F0F0F0]">
          <button
            onClick={() => setShowConfirmRealise(true)}
            className="w-full h-11 rounded-full text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#22C55E,#16A34A)' }}
          >
            ✅ Marquer comme réalisé
          </button>
        </div>
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

      {/* Input */}
      <form onSubmit={handleSend} className="bg-white border-t border-[#F0F0F0] px-4 py-3 flex items-center gap-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
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

      {/* Modal confirmation "Marquer comme réalisé" */}
      <AnimatePresence>
        {showConfirmRealise && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowConfirmRealise(false)}
              className="fixed inset-0 bg-black/40 z-[900] overlay-backdrop" />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[28px] z-[901] px-5 pb-8 pt-4 bottom-sheet"
            >
              <div className="w-10 h-1 rounded-full bg-[#E0E0E0] mx-auto mb-4" />
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
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modal notation */}
      <AnimatePresence>
        <RatingModal
          open={showRating}
          onClose={() => setShowRating(false)}
          onSubmit={handleSubmitRating}
          interlocuteurName={interlocuteurName}
          loading={ratingLoading}
        />
      </AnimatePresence>
    </div>
  )
}
