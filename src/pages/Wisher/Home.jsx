import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import BottomTabBar from '../../components/layout/BottomTabBar'
import useAuthStore from '../../store/authStore'
import { useWishes } from '../../hooks/useWishes'

const TABS = ['en_attente', 'realise', 'annule']
const TAB_LABELS = { en_attente: 'En attente', realise: 'Réalisé', annule: 'Annulé' }

const STATUS_MAP = {
  en_attente: 'en_attente',
  en_cours: 'en_attente',
  terminé: 'realise',
  realise: 'realise',
  annule: 'annule',
}

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000
  if (diff < 60)    return "à l'instant"
  if (diff < 3600)  return `il y a ${Math.floor(diff / 60)}min`
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`
  return `il y a ${Math.floor(diff / 86400)}j`
}

function expirationInfo(expiresAt) {
  if (!expiresAt) return null
  const diff = new Date(expiresAt) - Date.now()
  if (diff <= 0) return { label: 'Expiré', color: '#EF4444' }
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  const label = hours > 0 ? `Expire dans ${hours}h ${minutes}min` : `Expire dans ${minutes}min`
  const color = hours < 6 ? '#EF4444' : hours < 24 ? '#F59E0B' : '#22C55E'
  return { label, color }
}

function ConfirmModal({ open, onClose, title, description, price, buttonLabel, onConfirm, loading }) {
  if (!open) return null
  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 bg-black/40 z-[900] overlay-backdrop" />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[28px] z-[901] px-5 pb-8 pt-4 bottom-sheet"
      >
        <div className="w-10 h-1 rounded-full bg-[#E0E0E0] mx-auto mb-4" />
        <h2 className="text-lg font-bold text-[#1A1A2E] mb-2">{title}</h2>
        <p className="text-sm text-[#8A8A9A] mb-1">{description}</p>
        <p className="text-base font-bold text-[#1A1A2E] mb-5">{price}</p>
        <button
          onClick={onConfirm}
          disabled={loading}
          className="w-full h-12 rounded-full text-white font-bold text-sm"
          style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
        >
          {loading ? 'Traitement...' : buttonLabel}
        </button>
        <button onClick={onClose} className="w-full mt-3 text-sm text-[#8A8A9A] text-center">Annuler</button>
      </motion.div>
    </>
  )
}

function WishCard({ wish, onExtend, onMakeUrgent, onDelete }) {
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const exp = expirationInfo(wish.expires_at)
  const isActive = wish.statut === 'en_attente' || wish.statut === 'en_cours'
  const coverUrl = wish.images?.[0]?.url || null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-white rounded-[20px] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06)] relative"
    >
      {/* Menu 3 points */}
      <button
        onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
        className="absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full flex items-center justify-center bg-white/80 backdrop-blur-sm shadow-sm"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#1A1A2E">
          <circle cx="12" cy="5" r="2"/>
          <circle cx="12" cy="12" r="2"/>
          <circle cx="12" cy="19" r="2"/>
        </svg>
      </button>

      {/* Menu déroulant */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[50]" onClick={() => setMenuOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute right-4 top-12 bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.12)] z-[51] overflow-hidden min-w-[160px]"
            >
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(wish) }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#EF4444] hover:bg-red-50 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Supprimer
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div onClick={() => navigate(`/maker/wish/${wish.id}?owner=1`)} className="active:scale-[0.99] transition-transform cursor-pointer">
        {/* Photo de couverture */}
        {coverUrl && (
          <div className="relative h-[140px] bg-[#F0F0F5]">
            <img src={coverUrl} alt="" className="w-full h-full object-cover" />
            {wish.is_urgent && (
              <span className="absolute top-2.5 left-2.5 text-[10px] font-bold px-2 py-1 rounded-full"
                style={{ background: '#FFF4E0', color: '#F59E0B' }}>
                URGENT
              </span>
            )}
          </div>
        )}
        <div className="p-4">
          <h3 className="font-bold text-[#1A1A2E] text-base leading-snug mb-1">{wish.titre}</h3>
          <p className="text-[#8A8A9A] text-xs leading-relaxed line-clamp-2 mb-3">{wish.description}</p>

          {exp && isActive && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: exp.color }} />
              <span className="text-xs font-semibold" style={{ color: exp.color }}>{exp.label}</span>
            </div>
          )}
        </div>
      </div>

      {/* CTA Buttons — visibles en bas de la carte */}
      {isActive && (
        <div className="px-4 pb-4 flex items-center gap-2">
          {!wish.is_extended && (
            <button
              onClick={(e) => { e.stopPropagation(); onExtend(wish) }}
              className="flex-1 h-10 rounded-full text-xs font-bold flex items-center justify-center border border-[#5B6BF5] text-[#5B6BF5] active:scale-[0.97] transition-transform"
            >
              Prolonger
            </button>
          )}
          {!wish.is_urgent && (
            <button
              onClick={(e) => { e.stopPropagation(); onMakeUrgent(wish) }}
              className="flex-1 h-10 rounded-full text-xs font-bold flex items-center justify-center text-white active:scale-[0.97] transition-transform"
              style={{ background: 'linear-gradient(135deg,#F59E0B,#F97316)' }}
            >
              Mettre en Urgent
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}

export default function WisherHome() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.profile)
  const { getMyWishes, extendWish, makeUrgent, deleteWish } = useWishes()
  const [wishes, setWishes] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('en_attente')
  const [modal, setModal] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    getMyWishes()
      .then((w) => { setWishes(w); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-[#5B6BF5] border-t-transparent animate-spin" />
      </div>
    )
  }

  const tabCounts = {
    en_attente: wishes.filter((w) => STATUS_MAP[w.statut] === 'en_attente').length,
    realise: wishes.filter((w) => STATUS_MAP[w.statut] === 'realise').length,
    annule: wishes.filter((w) => STATUS_MAP[w.statut] === 'annule').length,
  }

  const filtered = wishes.filter((w) => STATUS_MAP[w.statut] === activeTab)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  async function handleExtend() {
    if (!modal?.wish) return
    setActionLoading(true)
    try {
      await extendWish(modal.wish.id)
      toast.success('Vœu prolongé avec succès !')
      const updated = await getMyWishes()
      setWishes(updated)
      setModal(null)
    } catch (err) {
      toast.error(err.message || 'Erreur')
    } finally { setActionLoading(false) }
  }

  async function handleMakeUrgent() {
    if (!modal?.wish) return
    setActionLoading(true)
    try {
      await makeUrgent(modal.wish.id)
      toast.success('Vœu mis en urgent !')
      const updated = await getMyWishes()
      setWishes(updated)
      setModal(null)
    } catch (err) {
      toast.error(err.message || 'Erreur')
    } finally { setActionLoading(false) }
  }

  async function handleDelete() {
    if (!modal?.wish) return
    setActionLoading(true)
    try {
      await deleteWish(modal.wish.id)
      toast.success('Vœu supprimé')
      setWishes((prev) => prev.filter((w) => w.id !== modal.wish.id))
      setModal(null)
    } catch (err) {
      toast.error(err.message || 'Erreur')
    } finally { setActionLoading(false) }
  }

  return (
    <div className="h-screen bg-[#FAFAFA] flex flex-col overflow-hidden">

      {/* Header */}
      <div className="px-5 pt-8 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border border-[#E8E8E8]">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-white text-sm"
                style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}>
                {user.prenom[0]}{user.nom[0]}
              </div>
            )}
          </div>
          <div>
            <p className="text-[13px] text-[#8A8A9A]">{greeting}</p>
            <p className="text-[16px] font-bold text-[#1A1A2E]">{user.prenom} {user.nom}</p>
          </div>
        </div>
      </div>

      {/* Contenu scrollable */}
      <div className="flex-1 overflow-y-auto pb-28">

        {/* CTA principal — Faire un vœu */}
        <div className="px-5 mb-5">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/wisher/create/1')}
            className="w-full rounded-[20px] p-5 text-left relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg,#5B6BF5 0%,#9B59F5 100%)' }}
          >
            <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10" />
            <div className="absolute -bottom-4 -right-10 w-20 h-20 rounded-full bg-white/5" />
            <div className="relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </div>
              <h3 className="text-white font-bold text-lg mb-1">{t('wisher.home.faire_voeu')}</h3>
              <p className="text-white/70 text-sm">Publie ton vœu et laisse les Makers t'aider</p>
            </div>
          </motion.button>
        </div>

        {/* Astuce */}
        <div className="px-5 mb-5">
          <div className="rounded-2xl bg-white border border-[#F0F0F0] p-4 flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFF4E0] flex items-center justify-center flex-shrink-0">
              <span className="text-lg">💡</span>
            </div>
            <div>
              <p className="text-sm font-bold text-[#1A1A2E] mb-0.5">Astuce</p>
              <p className="text-xs text-[#8A8A9A] leading-relaxed">
                Ajoute des photos et une localisation précise à tes vœux pour attirer plus de Makers !
              </p>
            </div>
          </div>
        </div>

        {/* Section Mes vœux */}
        <div className="px-5">
          <h2 className="font-bold text-[#1A1A2E] text-base mb-3">Mes vœux</h2>

          {/* Onglets */}
          <div className="flex bg-[#F5F5F7] rounded-full p-1 mb-4">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 py-2.5 rounded-full text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                style={activeTab === tab
                  ? { background: 'white', color: '#5B6BF5', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
                  : { color: '#8A8A9A' }
                }
              >
                {TAB_LABELS[tab]}
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px]"
                  style={activeTab === tab
                    ? { background: '#EEF0FF', color: '#5B6BF5' }
                    : { background: '#E8E8E8', color: '#8A8A9A' }
                  }>
                  {tabCounts[tab]}
                </span>
              </button>
            ))}
          </div>

          {/* Liste des vœux filtrés */}
          <div className="flex flex-col gap-3">
            <AnimatePresence mode="popLayout">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-6 h-6 rounded-full border-3 border-[#5B6BF5] border-t-transparent animate-spin" />
                </div>
              ) : filtered.length > 0 ? (
                filtered.map((wish) => (
                  <WishCard
                    key={wish.id}
                    wish={wish}
                    onExtend={(w) => setModal({ type: 'extend', wish: w })}
                    onMakeUrgent={(w) => setModal({ type: 'urgent', wish: w })}
                    onDelete={(w) => setModal({ type: 'delete', wish: w })}
                  />
                ))
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-16 gap-3"
                >
                  <div className="w-16 h-16 rounded-full bg-[#EEF0FF] flex items-center justify-center">
                    <span className="text-3xl">
                      {activeTab === 'en_attente' ? '✨' : activeTab === 'realise' ? '🎉' : '📭'}
                    </span>
                  </div>
                  <p className="text-[#1A1A2E] font-bold text-sm">Aucun vœu ici pour le moment</p>
                  <p className="text-[#8A8A9A] text-xs text-center max-w-[220px]">
                    {activeTab === 'en_attente'
                      ? 'Crée ton premier vœu et laisse la magie opérer !'
                      : activeTab === 'realise'
                        ? 'Tes vœux réalisés apparaîtront ici.'
                        : 'Tes vœux annulés apparaîtront ici.'}
                  </p>
                  {activeTab === 'en_attente' && (
                    <button
                      onClick={() => navigate('/wisher/create/1')}
                      className="mt-1 px-6 h-10 rounded-full text-sm font-semibold text-white"
                      style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
                    >
                      Créer un vœu
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>

      {/* Modals */}
      <AnimatePresence>
        {modal?.type === 'extend' && (
          <ConfirmModal
            open
            onClose={() => setModal(null)}
            title="Prolonger mon vœu"
            description="Prolongez votre vœu de 72h supplémentaires."
            price="2,99€"
            buttonLabel="Payer et prolonger"
            onConfirm={handleExtend}
            loading={actionLoading}
          />
        )}
        {modal?.type === 'urgent' && (
          <ConfirmModal
            open
            onClose={() => setModal(null)}
            title="Mettre en Urgent"
            description="Votre vœu sera mis en avant pendant 24h."
            price="4,99€"
            buttonLabel="Payer et activer"
            onConfirm={handleMakeUrgent}
            loading={actionLoading}
          />
        )}
        {modal?.type === 'delete' && (
          <ConfirmModal
            open
            onClose={() => setModal(null)}
            title="Supprimer ce vœu ?"
            description="Cette action est irréversible. Le vœu et toutes ses données seront supprimés définitivement."
            price=""
            buttonLabel="Supprimer"
            onConfirm={handleDelete}
            loading={actionLoading}
            danger
          />
        )}
      </AnimatePresence>

      <BottomTabBar />
    </div>
  )
}
