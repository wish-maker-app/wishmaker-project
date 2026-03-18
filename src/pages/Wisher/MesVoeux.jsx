import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
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

function WishCard({ wish }) {
  const navigate = useNavigate()
  const statusLabel = { en_attente: 'En attente', en_cours: 'En cours', terminé: 'Terminé', annule: 'Annulé' }
  const statusStyle = {
    en_attente: { bg: '#EEF0FF', color: '#5B6BF5' },
    en_cours:   { bg: '#FFF4E0', color: '#F59E0B' },
    terminé:    { bg: '#E6FBF0', color: '#22C55E' },
    annule:     { bg: '#FFF0F0', color: '#EF4444' },
  }
  const s = statusStyle[wish.statut] || statusStyle.en_attente

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      onClick={() => navigate(`/maker/wish/${wish.id}`)}
      className="bg-white rounded-[20px] p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] active:scale-[0.99] transition-transform cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <h3 className="font-bold text-[#1A1A2E] text-sm leading-snug flex-1">{wish.titre}</h3>
        <span className="text-[10px] font-bold px-2.5 py-1 rounded-full flex-shrink-0"
          style={{ background: s.bg, color: s.color }}>
          {statusLabel[wish.statut]}
        </span>
      </div>

      <p className="text-[#8A8A9A] text-xs leading-relaxed line-clamp-2 mb-3">{wish.description}</p>

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
    </motion.div>
  )
}

export default function MesVoeux() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('en_cours')
  const { getMyWishes, loading } = useWishes()
  const [wishes, setWishes] = useState([])

  useEffect(() => {
    getMyWishes().then(setWishes).catch(() => {})
  }, [])

  const filtered = wishes.filter((w) => STATUS_MAP[w.statut] === activeTab)

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
            filtered.map((wish) => <WishCard key={wish.id} wish={wish} />)
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

      <BottomTabBar />
    </div>
  )
}
