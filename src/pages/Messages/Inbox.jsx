import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from 'framer-motion'
import toast from 'react-hot-toast'
import BottomTabBar from '../../components/layout/BottomTabBar'
import useAuthStore from '../../store/authStore'
import { useMessages } from '../../hooks/useMessages'
import { supabase } from '../../lib/supabase'

const SWIPE_REVEAL = 80  // px que le bouton occupe quand révélé
const SWIPE_THRESHOLD = 50  // px minimum à draguer pour snap ouvert

function Avatar({ user, size = 52 }) {
  const initials = `${user.prenom[0]}${user.nom[0]}`
  return (
    <div className="relative flex-shrink-0">
      <div
        className="rounded-full flex items-center justify-center font-bold text-white overflow-hidden border border-[#E8E8E8]"
        style={{ width: size, height: size, background: 'linear-gradient(135deg,#8A8A9A,#B0B0B0)' }}
      >
        {user.avatar_url ? (
          <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <span className="text-sm">{initials}</span>
        )}
      </div>
      {user.is_online && (
        <span className="absolute bottom-0.5 left-0.5 w-3 h-3 rounded-full bg-[#22C55E] border-2 border-white" />
      )}
    </div>
  )
}

function WishThumb({ wish, size = 52 }) {
  const coverUrl = wish?.wish_images?.[0]?.url
  return (
    <div
      className="rounded-full flex-shrink-0 overflow-hidden flex items-center justify-center bg-[#EEF0FF]"
      style={{ width: size, height: size }}
    >
      {coverUrl ? (
        <img src={coverUrl} alt="" className="w-full h-full object-cover" />
      ) : (
        <span className="text-lg">✨</span>
      )}
    </div>
  )
}

/**
 * Ligne de conversation avec swipe-to-delete (style iOS / Vinted).
 * - Drag horizontal à gauche révèle un bouton rouge "Supprimer"
 * - Tap ailleurs ou swipe right referme
 * - Tap sur la ligne (quand fermée) ouvre la conversation
 */
function ConversationItem({ conv, onClick, onDelete }) {
  const x = useMotionValue(0)
  const bgOpacity = useTransform(x, [-SWIPE_REVEAL, -20, 0], [1, 0.6, 0])
  const [isOpen, setIsOpen] = useState(false)

  function handleDragEnd(_, info) {
    if (info.offset.x < -SWIPE_THRESHOLD) {
      animate(x, -SWIPE_REVEAL, { type: 'spring', stiffness: 380, damping: 32 })
      setIsOpen(true)
    } else {
      animate(x, 0, { type: 'spring', stiffness: 380, damping: 32 })
      setIsOpen(false)
    }
  }

  function close() {
    animate(x, 0, { type: 'spring', stiffness: 380, damping: 32 })
    setIsOpen(false)
  }

  function handleClick() {
    if (isOpen) { close(); return }
    onClick()
  }

  return (
    <div className="relative overflow-hidden">
      {/* Action rouge en dessous */}
      <motion.div
        style={{ opacity: bgOpacity }}
        className="absolute inset-y-0 right-0 flex items-center"
      >
        <button
          onClick={() => { close(); onDelete(conv) }}
          className="h-full px-5 flex flex-col items-center justify-center gap-1 text-white font-semibold text-[11px]"
          style={{ background: '#EF4444', width: SWIPE_REVEAL }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="3,6 5,6 21,6"/>
            <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            <path d="M10 11v6M14 11v6"/>
          </svg>
          Supprimer
        </button>
      </motion.div>

      {/* Contenu draggable */}
      <motion.div
        drag="x"
        dragConstraints={{ left: -SWIPE_REVEAL, right: 0 }}
        dragElastic={0.1}
        style={{ x }}
        onDragEnd={handleDragEnd}
        className="bg-white"
      >
        <motion.button
          whileTap={{ scale: isOpen ? 1 : 0.98 }}
          onClick={handleClick}
          className="flex items-center gap-3 w-full px-5 py-3 text-left bg-white"
        >
          <WishThumb wish={conv.wish} />
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-[#1A1A2E] truncate">
              {conv.wish_titre || 'Vœu'}
            </p>
            <p className="text-[13px] font-medium text-[#4A4A5A] truncate">{conv.dernier_message}</p>
            <p className="text-[12px] text-[#B0B0B0] truncate">
              {conv.interlocuteur.pseudo || conv.interlocuteur.prenom}
              {conv.date && <span className="ml-1">· {conv.date}</span>}
            </p>
          </div>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            <span className="text-[12px] text-[#8A8A9A]">{conv.heure}</span>
            {conv.non_lus > 0 && (
              <span className="w-5 h-5 rounded-full bg-[#5B6BF5] text-white text-[10px] font-bold flex items-center justify-center">
                {conv.non_lus}
              </span>
            )}
          </div>
        </motion.button>
      </motion.div>
    </div>
  )
}

function ConfirmDeleteModal({ open, convName, onClose, onConfirm, loading }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-[900] overlay-backdrop"
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[28px] z-[901] px-5 pb-8 pt-4 bottom-sheet"
          >
            <div className="w-10 h-1 rounded-full bg-[#E0E0E0] mx-auto mb-4" />
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
                Toute la conversation {convName ? `avec ${convName}` : ''} et ses messages seront supprimés définitivement. Cette action est irréversible.
              </p>
            </div>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="w-full h-[52px] rounded-full text-white font-bold text-[15px] mb-2 disabled:opacity-50"
              style={{ background: '#EF4444' }}
            >
              {loading ? 'Suppression…' : 'Supprimer définitivement'}
            </button>
            <button onClick={onClose} className="w-full text-sm text-[#8A8A9A] py-2">
              Annuler
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

function transformConversation(conv, userId) {
  const isWisher = conv.wisher_id === userId
  const interlocuteur = isWisher ? conv.maker : conv.wisher
  const msgs = conv.messages || []
  const lastMsg = msgs.length > 0
    ? msgs.reduce((a, b) => new Date(a.created_at) > new Date(b.created_at) ? a : b)
    : null
  const nonLus = msgs.filter((m) => m.sender_id !== userId && !m.is_read).length

  return {
    id: conv.id,
    type: isWisher ? 'voeu' : 'mission',
    wish: conv.wish,
    wish_titre: conv.wish?.titre || '',
    interlocuteur: interlocuteur || { prenom: '?', nom: '?', pseudo: null, is_online: false, avatar_url: null },
    dernier_message: lastMsg?.contenu || '',
    heure: lastMsg ? new Date(lastMsg.created_at).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '',
    date: lastMsg ? new Date(lastMsg.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }) : '',
    non_lus: nonLus,
  }
}

export default function Inbox() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const [tab, setTab] = useState(searchParams.get('tab') || 'missions')
  const [search, setSearch] = useState('')
  const [toDelete, setToDelete] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const userId = useAuthStore((s) => s.user?.id)
  const authTick = useAuthStore((s) => s.authTick)
  const { loadConversations, conversations, loading, deleteConversation } = useMessages()

  useEffect(() => {
    loadConversations().catch((err) => console.error('[Inbox]', err))
  }, [authTick])

  // Realtime : nouveau message dans n'importe quelle conv → refetch silencieux
  // pour mettre à jour le compteur "non lus" et le dernier aperçu
  useEffect(() => {
    if (!userId) return
    const channel = supabase
      .channel('inbox-messages')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        () => {
          loadConversations().catch(() => {})
        }
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'conversations' },
        () => {
          loadConversations().catch(() => {})
        }
      )
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        () => {
          loadConversations().catch(() => {})
        }
      )
      .subscribe()
    return () => { supabase.removeChannel(channel) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  // Polling fallback toutes les 30s (au cas où Realtime drop)
  useEffect(() => {
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadConversations().catch(() => {})
      }
    }, 30000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Refetch quand l'user revient sur l'onglet (focus / visibility)
  useEffect(() => {
    function onFocus() {
      loadConversations().catch((err) => console.error('[Inbox refocus]', err))
    }
    function onVisibility() {
      if (document.visibilityState === 'visible') onFocus()
    }
    window.addEventListener('focus', onFocus)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('focus', onFocus)
      document.removeEventListener('visibilitychange', onVisibility)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function confirmDelete() {
    if (!toDelete) return
    setDeleting(true)
    const { error } = await deleteConversation(toDelete.id)
    setDeleting(false)
    if (error) {
      toast.error('Impossible de supprimer la conversation')
      console.error('[inbox delete]', error)
      return
    }
    toast.success('Conversation supprimée')
    setToDelete(null)
  }

  const transformed = conversations.map((c) => transformConversation(c, userId))

  const unreadVoeux = transformed.filter((c) => c.type === 'voeu' && c.non_lus > 0).reduce((sum, c) => sum + c.non_lus, 0)
  const unreadMissions = transformed.filter((c) => c.type === 'mission' && c.non_lus > 0).reduce((sum, c) => sum + c.non_lus, 0)

  const filtered = transformed
    .filter(c => tab === 'missions' ? c.type === 'mission' : c.type === 'voeu')
    .filter(c =>
      !search ||
      (c.interlocuteur.pseudo || '').toLowerCase().includes(search.toLowerCase()) ||
      `${c.interlocuteur.prenom} ${c.interlocuteur.nom}`.toLowerCase().includes(search.toLowerCase()) ||
      (c.wish_titre || '').toLowerCase().includes(search.toLowerCase()) ||
      c.dernier_message.toLowerCase().includes(search.toLowerCase())
    )

  return (
    <div className="h-screen bg-white flex flex-col overflow-hidden">

      {/* Header */}
      <div className="px-5 pt-4 pb-2">
        <h1 className="text-xl font-bold text-[#1A1A2E] text-center">{t('messages.titre')}</h1>
      </div>

      {/* Barre de recherche */}
      <div className="px-5 pt-3 pb-2">
        <div className="relative flex items-center">
          <svg className="absolute left-4 text-[#8A8A9A]" width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="#8A8A9A" strokeWidth="2"/>
            <path d="M21 21l-3.5-3.5" stroke="#8A8A9A" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t('messages.recherche')}
            className="w-full h-12 bg-white border border-[#E8E8E8] rounded-full pl-10 pr-12 text-sm text-[#1A1A2E] placeholder-[#B0B0B0] outline-none focus:border-[#5B6BF5] transition-colors"
          />
        </div>
      </div>

      {/* Toggle Mes voeux / Mes missions */}
      <div className="px-5 py-2">
        <div className="flex bg-[#F5F5F5] rounded-full p-1">
          <button
            onClick={() => setTab('voeux')}
            className="flex-1 h-10 rounded-full text-sm font-semibold transition-all flex items-center justify-center gap-1.5"
            style={tab === 'voeux'
              ? { background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)', color: '#fff' }
              : { color: '#8A8A9A' }}
          >
            {t('messages.mes_voeux')}
            {unreadVoeux > 0 && (
              <span className="min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold px-1"
                style={tab === 'voeux'
                  ? { background: 'rgba(255,255,255,0.3)', color: '#fff' }
                  : { background: '#EF4444', color: '#fff' }
                }>
                {unreadVoeux > 9 ? '9+' : unreadVoeux}
              </span>
            )}
          </button>
          <button
            onClick={() => setTab('missions')}
            className="flex-1 h-10 rounded-full text-sm font-semibold transition-all flex items-center justify-center gap-1.5"
            style={tab === 'missions'
              ? { background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)', color: '#fff' }
              : { color: '#8A8A9A' }}
          >
            {t('messages.mes_missions')}
            {unreadMissions > 0 && (
              <span className="min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-[10px] font-bold px-1"
                style={tab === 'missions'
                  ? { background: 'rgba(255,255,255,0.3)', color: '#fff' }
                  : { background: '#EF4444', color: '#fff' }
                }>
                {unreadMissions > 9 ? '9+' : unreadMissions}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Liste des conversations */}
      <div className="flex-1 pb-28 overflow-y-auto">
        <AnimatePresence initial={false}>
          {filtered.length > 0 ? (
            filtered.map((conv) => (
              <motion.div
                key={conv.id}
                initial={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0, overflow: 'hidden' }}
                transition={{ duration: 0.2 }}
              >
                <ConversationItem
                  conv={conv}
                  onClick={() => navigate(`/messages/${conv.id}?tab=${tab}`)}
                  onDelete={(c) => setToDelete(c)}
                />
              </motion.div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" stroke="#E0E0E0" strokeWidth="1.5"/>
              </svg>
              <p className="text-[#8A8A9A] text-sm">{t('messages.vide')}</p>
            </div>
          )}
        </AnimatePresence>
      </div>

      <ConfirmDeleteModal
        open={!!toDelete}
        convName={toDelete?.interlocuteur?.pseudo || toDelete?.interlocuteur?.prenom}
        loading={deleting}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
      />

      <BottomTabBar />
    </div>
  )
}
