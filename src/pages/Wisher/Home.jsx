import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import BottomTabBar from '../../components/layout/BottomTabBar'
import DragScroll from '../../components/ui/DragScroll'
import useAuthStore from '../../store/authStore'
import { useWishes } from '../../hooks/useWishes'

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000
  if (diff < 60)    return "à l'instant"
  if (diff < 3600)  return `${Math.floor(diff / 60)}min`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}j`
}

const statusConfig = {
  en_attente: { label: 'En attente', bg: '#EEF0FF', color: '#5B6BF5', icon: '⏳' },
  en_cours:   { label: 'En cours',   bg: '#FFF4E0', color: '#F59E0B', icon: '⚡' },
  terminé:    { label: 'Terminé',    bg: '#E6FBF0', color: '#22C55E', icon: '✅' },
}

function StatCard({ count, label, icon, bg, color }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex-1 rounded-2xl p-3.5"
      style={{ background: bg }}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-lg">{icon}</span>
        <span className="text-2xl font-bold" style={{ color }}>{count}</span>
      </div>
      <p className="text-[11px] font-semibold" style={{ color }}>{label}</p>
    </motion.div>
  )
}

function RecentWishCard({ wish, onClick }) {
  const coverUrl = wish.images?.[0]?.url || null
  const s = statusConfig[wish.statut] || statusConfig.en_attente

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={onClick}
      className="flex-shrink-0 w-[260px] bg-white rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06)] active:scale-[0.98] transition-transform cursor-pointer"
    >
      {/* Cover */}
      <div className="relative h-[120px] bg-[#F0F0F5]">
        {coverUrl ? (
          <img src={coverUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#E8EAFF,#D5C8FF)' }}>
            <span className="text-4xl opacity-50">✨</span>
          </div>
        )}
        {/* Status badge */}
        <span className="absolute top-2.5 right-2.5 text-[10px] font-bold px-2.5 py-1 rounded-full"
          style={{ background: s.bg, color: s.color }}>
          {s.label}
        </span>
      </div>
      {/* Contenu */}
      <div className="p-3.5">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-bold text-[#1A1A2E] text-[13px] leading-snug truncate flex-1 mr-2">{wish.titre}</h3>
          <span className="text-[10px] text-[#8A8A9A] flex-shrink-0">{timeAgo(wish.created_at)}</span>
        </div>
        <p className="text-[#8A8A9A] text-[11px] leading-relaxed line-clamp-2 mb-2">{wish.description}</p>
        <div className="flex items-center gap-1 text-[11px] text-[#8A8A9A]">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="#8A8A9A">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          </svg>
          <span className="truncate">{wish.adresse}</span>
        </div>
      </div>
    </motion.div>
  )
}

export default function WisherHome() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.profile)
  const { getMyWishes } = useWishes()
  const [wishes, setWishes] = useState([])
  const [loading, setLoading] = useState(true)

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

  const stats = {
    en_attente: wishes.filter((w) => w.statut === 'en_attente').length,
    en_cours: wishes.filter((w) => w.statut === 'en_cours').length,
    terminé: wishes.filter((w) => w.statut === 'terminé').length,
  }

  const recentWishes = wishes.slice(0, 5)
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">

      {/* Header */}
      <div className="px-5 pt-14 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
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
        <button
          onClick={() => navigate('/messages')}
          className="w-11 h-11 rounded-full border border-[#E8E8E8] flex items-center justify-center relative bg-white"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
              stroke="#1A1A2E" strokeWidth="1.8" strokeLinejoin="round"/>
          </svg>
        </button>
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
            {/* Cercles décoratifs */}
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

        {/* Stats */}
        <div className="px-5 mb-5">
          <div className="flex gap-2.5">
            <StatCard
              count={stats.en_attente}
              label="En attente"
              icon="⏳"
              bg="#EEF0FF"
              color="#5B6BF5"
            />
            <StatCard
              count={stats.en_cours}
              label="En cours"
              icon="⚡"
              bg="#FFF4E0"
              color="#F59E0B"
            />
            <StatCard
              count={stats.terminé}
              label="Terminés"
              icon="✅"
              bg="#E6FBF0"
              color="#22C55E"
            />
          </div>
        </div>

        {/* Mes vœux récents */}
        <div className="mb-5">
          <div className="flex items-center justify-between px-5 mb-3">
            <h2 className="font-bold text-[#1A1A2E] text-base">Mes vœux récents</h2>
            {wishes.length > 0 && (
              <button onClick={() => navigate('/wisher/mes-voeux')}
                className="text-xs font-semibold text-[#5B6BF5]">
                Voir tout
              </button>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-6 h-6 rounded-full border-3 border-[#5B6BF5] border-t-transparent animate-spin" />
            </div>
          ) : recentWishes.length > 0 ? (
            <DragScroll className="flex gap-3 px-5 pb-2">
              {recentWishes.map((wish) => (
                <RecentWishCard
                  key={wish.id}
                  wish={wish}
                  onClick={() => navigate(`/maker/wish/${wish.id}?owner=1`)}
                />
              ))}
            </DragScroll>
          ) : (
            <div className="mx-5 py-10 flex flex-col items-center gap-3 bg-white rounded-2xl border border-[#F0F0F0]">
              <div className="w-16 h-16 rounded-full bg-[#EEF0FF] flex items-center justify-center">
                <span className="text-3xl">✨</span>
              </div>
              <p className="text-sm font-bold text-[#1A1A2E]">Aucun vœu pour le moment</p>
              <p className="text-xs text-[#8A8A9A] text-center max-w-[220px]">
                Crée ton premier vœu et laisse la magie opérer !
              </p>
              <button
                onClick={() => navigate('/wisher/create/1')}
                className="mt-1 px-6 h-10 rounded-full text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
              >
                Créer un vœu
              </button>
            </div>
          )}
        </div>

        {/* Tip / aide rapide */}
        <div className="px-5">
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

      </div>

      <BottomTabBar />
    </div>
  )
}
