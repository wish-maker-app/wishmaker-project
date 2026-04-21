import { useState, useEffect, useCallback } from 'react'
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

function SmallAvatar({ user, size = 24 }) {
  const initials = `${user?.prenom?.[0] || ''}${user?.nom?.[0] || ''}`
  if (user?.avatar_url) {
    return (
      <img src={user.avatar_url} alt="" className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }} />
    )
  }
  return (
    <div className="rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.35, background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}>
      {initials}
    </div>
  )
}

function WishGridCard({ wish, userLat, userLng, onClick }) {
  const coverUrl = wish.images?.[0]?.url || null
  const dist = distanceLabel(userLat, userLng, wish.latitude, wish.longitude)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      onClick={onClick}
      className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06)] cursor-pointer"
    >
      {/* Cover image + avatar overlay */}
      <div className="relative aspect-[4/3] bg-[#F0F0F5]">
        {coverUrl ? (
          <img src={coverUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ background: 'linear-gradient(135deg,#E8EAFF,#D5C8FF)' }} />
        )}
        {/* Avatar + prénom en overlay */}
        {wish.wisher && (
          <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-black/30 backdrop-blur-sm rounded-full pr-2.5 pl-0.5 py-0.5">
            <SmallAvatar user={wish.wisher} size={24} />
            <span className="text-white text-[11px] font-medium">{wish.wisher.prenom || wish.wisher.pseudo}</span>
          </div>
        )}
      </div>

      {/* Contenu texte */}
      <div className="p-3 flex flex-col" style={{ minHeight: 100 }}>
        <div className="flex items-start justify-between gap-1 mb-1">
          <h3 className="font-bold text-[#1A1A2E] text-[13px] leading-snug line-clamp-1 flex-1">{wish.titre}</h3>
          <span className="text-[10px] text-[#8A8A9A] flex-shrink-0 pt-0.5">{timeAgo(wish.created_at)}</span>
        </div>
        <p className="text-[#8A8A9A] text-[11px] leading-relaxed line-clamp-2">{wish.description}</p>
        <div className="flex items-center gap-1 text-[11px] text-[#5B6BF5] font-semibold mt-auto pt-2">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#5B6BF5"/>
            <circle cx="12" cy="9" r="2.5" fill="white"/>
          </svg>
          {dist}
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
  const [userLocation, setUserLocation] = useState(null)
  const [ratings, setRatings] = useState([])

  // Géolocalisation en temps réel
  useEffect(() => {
    if (!navigator.geolocation) return
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  useEffect(() => {
    getWishesByUser(userId).then(setWishes).catch(() => {})
    supabase.from('users').select('id, prenom, nom, pseudo, avatar_url, rating, rating_count, type_compte').eq('id', userId).single()
      .then(({ data }) => setUserData(data))
    supabase
      .from('ratings')
      .select('id, note, commentaire, created_at, from_user:users!ratings_from_user_fkey(id, prenom, nom, avatar_url)')
      .eq('to_user', userId)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) console.error('[UserWishes] ratings error:', error)
        setRatings(data || [])
      })
  }, [userId])

  const userLat = userLocation?.[0] || profile?.latitude || 43.6047
  const userLng = userLocation?.[1] || profile?.longitude || 1.4442

  const realiseCount = wishes.filter(w => w.statut === 'realise').length
  const activeWishes = wishes.filter(w => w.statut !== 'realise' && w.statut !== 'annule')

  return (
    <div className="h-screen bg-[#F7F7FA] flex flex-col overflow-y-auto" style={{ paddingBottom: 90 }}>

      {/* Hero header gradient */}
      <div className="relative overflow-hidden flex-shrink-0" style={{ background: 'linear-gradient(160deg, #7C6AFA 0%, #9B8BFF 50%, #B8ADFF 100%)', padding: '52px 20px 60px' }}>
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

      {/* Wish cards — grille 2 colonnes */}
      <div className="px-5">
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <div className="w-6 h-6 rounded-full border-[3px] border-[#5B6BF5] border-t-transparent animate-spin" />
          </div>
        ) : activeWishes.length > 0 ? (
          <div className="grid grid-cols-2 gap-3">
            {activeWishes.map((wish) => (
              <WishGridCard
                key={wish.id}
                wish={wish}
                userLat={userLat}
                userLng={userLng}
                onClick={() => navigate(`/maker/wish/${wish.id}`)}
              />
            ))}
          </div>
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

      {/* Section Avis */}
      <div className="px-5 pt-6 pb-4">
        <h2 className="text-[19px] font-bold text-[#1A1A2E] m-0 mb-4">
          Avis
          <span className="ml-2 text-[13px] font-semibold bg-[#5B6BF5] text-white rounded-xl px-2.5 py-0.5 align-middle">
            {ratings.length}
          </span>
        </h2>
        {ratings.length > 0 ? (
          <div className="flex flex-col gap-3">
            {ratings.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
                <div className="flex items-center gap-2.5 mb-2">
                  <SmallAvatar user={r.from_user} size={32} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#1A1A2E]">{r.from_user?.prenom}</p>
                    <p className="text-[11px] text-[#8A8A9A]">{timeAgo(r.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <svg key={i} width="12" height="12" viewBox="0 0 24 24" fill={i <= Math.round(r.note) ? '#F5C542' : '#E0E0E0'}>
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    ))}
                  </div>
                </div>
                {r.commentaire && (
                  <p className="text-[13px] text-[#4A4A5A] leading-relaxed">{r.commentaire}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center py-8 gap-2"
          >
            <span className="text-[32px]">💬</span>
            <p className="text-[14px] font-medium text-[#AAA]">Aucun avis pour le moment</p>
          </motion.div>
        )}
      </div>

      <BottomTabBar />
    </div>
  )
}
