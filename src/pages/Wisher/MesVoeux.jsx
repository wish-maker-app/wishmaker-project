import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import Header from '../../components/layout/Header'
import BottomTabBar from '../../components/layout/BottomTabBar'
import { useWishes } from '../../hooks/useWishes'

const TABS = ['en_cours', 'realise', 'annule']

const STATUS_MAP = {
  en_attente: 'en_cours',
  en_cours: 'en_cours',
  terminé: 'realise',
  annule: 'annule',
}

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000
  if (diff < 60)    return "à l'instant"
  if (diff < 3600)  return `${Math.floor(diff / 60)}min`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}j`
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
        onClick={onClose} className="fixed inset-0 bg-black/40 z-[900]" />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[28px] z-[901] px-5 pb-8 pt-4"
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

function WishCard({ wish, onExtend, onMakeUrgent }) {
  const navigate = useNavigate()
  const statusLabel = { en_attente: 'En attente', en_cours: 'En cours', terminé: 'Terminé', annule: 'Annulé' }
  const statusStyle = {
    en_attente: { bg: '#EEF0FF', color: '#5B6BF5' },
    en_cours:   { bg: '#FFF4E0', color: '#F59E0B' },
    terminé:    { bg: '#E6FBF0', color: '#22C55E' },
    annule:     { bg: '#FFF0F0', color: '#EF4444' },
  }
  const s = statusStyle[wish.statut] || statusStyle.en_attente
  const exp = expirationInfo(wish.expires_at)
  const isActive = wish.statut === 'en_attente' || wish.statut === 'en_cours'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-white rounded-[20px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
    >
      <div onClick={() => navigate(`/maker/wish/${wish.id}`)} className="active:scale-[0.99] transition-transform cursor-pointer">
        <div className="flex items-start justify-between gap-3 mb-2">
          <h3 className="font-bold text-[#1A1A2E] text-sm leading-snug flex-1">{wish.titre}</h3>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {wish.is_urgent && (
              <span className="text-[10px] font-bold px-2 py-1 rounded-full" style={{ background: '#FFF4E0', color: '#F59E0B' }}>
                ⚡ URGENT
              </span>
            )}
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full"
              style={{ background: s.bg, color: s.color }}>
              {statusLabel[wish.statut]}
            </span>
          </div>
        </div>

        <p className="text-[#8A8A9A] text-xs leading-relaxed line-clamp-2 mb-3">{wish.description}</p>

        {/* Compte à rebours */}
        {exp && isActive && (
          <div className="flex items-center gap-1.5 mb-3">
            <span className="w-2 h-2 rounded-full" style={{ background: exp.color }} />
            <span className="text-xs font-semibold" style={{ color: exp.color }}>{exp.label}</span>
          </div>
        )}

        {/* Badge récompense */}
        {wish.type_recompense && (
          <div className="mb-3">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full"
              style={wish.type_recompense === 'argent'
                ? { background: '#ECFDF5', color: '#059669' }
                : { background: '#EFF6FF', color: '#3B82F6' }
              }>
              {wish.type_recompense === 'argent'
                ? `💰 ${wish.montant_recompense ? wish.montant_recompense + '€' : 'Argent'}`
                : '🤝 Bon procédé'}
            </span>
          </div>
        )}

        {wish.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {wish.tags.map((tag) => (
              <span key={tag} className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
                style={{ background: '#EEF0FF', color: '#5B6BF5' }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-[#8A8A9A]">
          <div className="flex items-center gap-1">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#8A8A9A">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            </svg>
            {wish.adresse}
          </div>
          <span>{timeAgo(wish.created_at)}</span>
        </div>
      </div>

      {/* Boutons options payantes */}
      {isActive && (
        <div className="flex gap-2 mt-3 pt-3 border-t border-[#F0F0F0]">
          <button
            onClick={(e) => { e.stopPropagation(); onExtend(wish) }}
            className="flex-1 h-9 rounded-full text-xs font-semibold border border-[#E0E0E0] text-[#1A1A2E] bg-white"
          >
            ⏱ Prolonger
          </button>
          {!wish.is_urgent && (
            <button
              onClick={(e) => { e.stopPropagation(); onMakeUrgent(wish) }}
              className="flex-1 h-9 rounded-full text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#F59E0B,#F97316)' }}
            >
              ⚡ Mettre en Urgent
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}

export default function MesVoeux() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('en_cours')
  const { getMyWishes, extendWish, makeUrgent, loading } = useWishes()
  const [wishes, setWishes] = useState([])
  const [modal, setModal] = useState(null) // { type: 'extend' | 'urgent', wish }
  const [actionLoading, setActionLoading] = useState(false)

  useEffect(() => {
    getMyWishes().then(setWishes).catch(() => {})
  }, [])

  const filtered = wishes.filter((w) => STATUS_MAP[w.statut] === activeTab)

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

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">
      <Header title={t('wisher.mes_voeux.titre')} />

      {/* Tabs */}
      <div className="px-5 pt-2 pb-4">
        <div className="flex bg-[#F5F5F7] rounded-full p-1">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex-1 py-2.5 rounded-full text-xs font-semibold transition-all"
              style={activeTab === tab ? {
                background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)',
                color: 'white',
              } : { color: '#8A8A9A' }}
            >
              {t(`wisher.mes_voeux.${tab}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Liste */}
      <div className="flex-1 px-5 pb-28 flex flex-col gap-3">
        <AnimatePresence mode="popLayout">
          {filtered.length > 0 ? (
            filtered.map((wish) => (
              <WishCard
                key={wish.id}
                wish={wish}
                onExtend={(w) => setModal({ type: 'extend', wish: w })}
                onMakeUrgent={(w) => setModal({ type: 'urgent', wish: w })}
              />
            ))
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-20 gap-3"
            >
              <span className="text-5xl">🌟</span>
              <p className="text-[#1A1A2E] font-bold text-sm">{t('wisher.mes_voeux.vide')}</p>
              <p className="text-[#8A8A9A] text-xs text-center max-w-[200px]">
                Tes vœux apparaîtront ici une fois publiés.
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal Prolonger */}
      <AnimatePresence>
        {modal?.type === 'extend' && (
          <ConfirmModal
            open
            onClose={() => setModal(null)}
            title="⏱ Prolonger mon vœu"
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
            title="⚡ Mettre en Urgent"
            description="Votre vœu sera mis en avant pendant 24h."
            price="4,99€"
            buttonLabel="Payer et activer"
            onConfirm={handleMakeUrgent}
            loading={actionLoading}
          />
        )}
      </AnimatePresence>

      <BottomTabBar />
    </div>
  )
}
