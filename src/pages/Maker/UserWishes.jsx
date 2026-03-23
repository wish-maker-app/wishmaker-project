import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import BottomTabBar from '../../components/layout/BottomTabBar'
import useAuthStore from '../../store/authStore'
import { useWishes } from '../../hooks/useWishes'
import { supabase } from '../../lib/supabase'

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000
  if (diff < 60)    return "à l'instant"
  if (diff < 3600)  return `il y a ${Math.floor(diff / 60)}min`
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`
  return `il y a ${Math.floor(diff / 86400)}j`
}

function distanceLabel(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`
}

function WishCard({ wish, index, userLat, userLng, onClick }) {
  const coverUrl = wish.images?.[0]?.url || null
  const dist = distanceLabel(userLat, userLng, wish.latitude, wish.longitude)
  const isRealise = wish.statut === 'realise'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
      onClick={onClick}
      className="bg-white rounded-[18px] overflow-hidden shadow-[0_2px_12px_rgba(30,20,60,0.07)] cursor-pointer active:scale-[0.98] transition-transform"
    >
      {/* Image */}
      <div className="relative h-[180px] overflow-hidden bg-[#F0F0F5]">
        {coverUrl ? (
          <img src={coverUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[40px]"
            style={{ background: 'linear-gradient(135deg, #E8E5FF, #D4CFFF)' }}>
            ✨
          </div>
        )}

        {/* Tag overlay */}
        {wish.tags?.[0] && (
          <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-[8px] px-3 py-1 rounded-full text-[11px] font-semibold text-[#5B6BF5] tracking-wide">
            {wish.tags[0]}
          </div>
        )}

        {/* Status réalisé */}
        {isRealise && (
          <div className="absolute top-3 right-3 bg-[rgba(39,174,96,0.9)] backdrop-blur-[8px] px-3 py-1 rounded-full text-[11px] font-semibold text-white">
            Réalisé ✓
          </div>
        )}

        {/* Gradient overlay bottom */}
        <div className="absolute bottom-0 left-0 right-0 h-[60px]"
          style={{ background: 'linear-gradient(transparent, rgba(0,0,0,0.35))' }} />

        {/* Price badge */}
        {wish.type_recompense && (
          <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-[8px] px-3.5 py-1.5 rounded-full text-[15px] font-bold text-[#1A1A2E] shadow-[0_2px_8px_rgba(0,0,0,0.1)]">
            {wish.type_recompense === 'argent'
              ? `${wish.montant_recompense || 0}€`
              : '🤝'}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="px-4 pt-3.5 pb-4">
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-bold text-[#1A1A2E] text-[16px] leading-snug flex-1 m-0">{wish.titre}</h3>
          <span className="text-[11px] text-[#AAA] whitespace-nowrap ml-2 mt-0.5">{timeAgo(wish.created_at)}</span>
        </div>
        <p className="text-[13px] text-[#888] leading-relaxed line-clamp-2 mb-2.5">{wish.description}</p>
        <div className="flex items-center gap-1.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5B6BF5" strokeWidth="2.5" strokeLinecap="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span className="text-[13px] font-medium text-[#5B6BF5]">{dist}</span>
        </div>
      </div>
    </motion.div>
  )
}

export default function UserWishes() {
  const { userId } = useParams()
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const { getWishesByUser, loading } = useWishes()
  const [wishes, setWishes] = useState([])
  const [userData, setUserData] = useState(null)

  useEffect(() => {
    getWishesByUser(userId).then(setWishes).catch(() => {})
    supabase.from('users').select('id, prenom, nom, pseudo, avatar_url, rating, rating_count, type_compte').eq('id', userId).single()
      .then(({ data }) => setUserData(data))
  }, [userId])

  const userLat = profile?.latitude || 43.6047
  const userLng = profile?.longitude || 1.4442

  const realiseCount = wishes.filter(w => w.statut === 'realise').length
  const activeWishes = wishes.filter(w => w.statut !== 'realise' && w.statut !== 'annule')

  return (
    <div className="min-h-screen bg-[#F7F7FA] flex flex-col" style={{ paddingBottom: 90 }}>

      {/* Hero header gradient */}
      <div className="relative overflow-hidden" style={{ background: 'linear-gradient(160deg, #7C6AFA 0%, #9B8BFF 50%, #B8ADFF 100%)', padding: '52px 20px 60px' }}>
        {/* Cercles décoratifs */}
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/[0.08]" />
        <div className="absolute -bottom-5 -left-8 w-24 h-24 rounded-full bg-white/[0.06]" />

        {/* Bouton retour */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-12 left-4 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-[10px]"
          style={{ background: 'rgba(255,255,255,0.2)' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M15 18l-6-6 6-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* Avatar + infos */}
        {userData && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="flex flex-col items-center mt-5"
          >
            <div className="w-[88px] h-[88px] rounded-full flex items-center justify-center text-[28px] font-bold text-white mb-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.15)]"
              style={{ background: 'rgba(255,255,255,0.25)', border: '3px solid rgba(255,255,255,0.5)' }}>
              {userData.avatar_url ? (
                <img src={userData.avatar_url} alt="" className="w-full h-full rounded-full object-cover" />
              ) : (
                `${userData.prenom?.[0] || ''}${userData.nom?.[0] || ''}`
              )}
            </div>
            <h1 className="text-[22px] font-bold text-white m-0">
              {userData.pseudo || `user_${(userData.id || '0000').slice(0, 4)}`}
            </h1>
            <div className="mt-2 px-3.5 py-1 rounded-full text-[12px] font-semibold text-white backdrop-blur-[8px]"
              style={{ background: 'rgba(255,255,255,0.2)' }}>
              {userData.type_compte === 'pro' ? 'Professionnel' : 'Particulier'}
            </div>
          </motion.div>
        )}
      </div>

      {/* Stats bar — chevauche le header */}
      {userData && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-[18px] flex justify-around shadow-[0_4px_20px_rgba(30,20,60,0.08)] relative z-[2]"
          style={{ margin: '-28px 20px 0', padding: '18px 10px' }}
        >
          <div className="text-center">
            <div className="text-[22px] font-bold text-[#1A1A2E]">{wishes.length}</div>
            <div className="text-[11px] text-[#999] font-medium mt-0.5">Vœux publiés</div>
          </div>
          <div className="w-px bg-[#EDEDF2]" />
          <div className="text-center">
            <div className="text-[22px] font-bold text-[#1A1A2E]">{realiseCount}</div>
            <div className="text-[11px] text-[#999] font-medium mt-0.5">Réalisés</div>
          </div>
          <div className="w-px bg-[#EDEDF2]" />
          <div className="text-center">
            <div className="text-[22px] font-bold text-[#1A1A2E]">
              ⭐ {userData.rating > 0 ? userData.rating : '—'}
            </div>
            <div className="text-[11px] text-[#999] font-medium mt-0.5">Évaluation</div>
          </div>
        </motion.div>
      )}

      {/* Section title */}
      <div className="px-5 pt-6">
        <h2 className="text-[19px] font-bold text-[#1A1A2E] m-0 mb-4">
          Ses vœux
          <span className="ml-2 text-[13px] font-semibold bg-[#5B6BF5] text-white rounded-xl px-2.5 py-0.5 align-middle">
            {activeWishes.length}
          </span>
        </h2>
      </div>

      {/* Wish cards */}
      <div className="px-5 flex flex-col gap-4">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 rounded-full border-[3px] border-[#5B6BF5] border-t-transparent animate-spin" />
          </div>
        ) : activeWishes.length > 0 ? (
          activeWishes.map((wish, i) => (
            <WishCard
              key={wish.id}
              wish={wish}
              index={i}
              userLat={userLat}
              userLng={userLng}
              onClick={() => navigate(`/maker/wish/${wish.id}`)}
            />
          ))
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center py-12 gap-2"
          >
            <span className="text-[40px]">✨</span>
            <p className="text-[15px] font-medium text-[#AAA]">Aucun vœu actif</p>
          </motion.div>
        )}
      </div>

      <BottomTabBar />
    </div>
  )
}
