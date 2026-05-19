import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import Header from '../../components/layout/Header'
import FavoriteButton from '../../components/ui/FavoriteButton'
import useAuthStore from '../../store/authStore'
import { useFavoriteWishes } from '../../hooks/useFavorites'
import { formatLocation } from '../../lib/geo'
import { formatDistance, getDistance } from '../../lib/utils'
import CategoryFallback from '../../components/ui/CategoryFallback'

function timeAgo(iso, t, locale = 'fr-FR') {
  if (!iso) return ''
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return t('wisher.home.il_y_a_instant')
  if (diff < 3600) return t('wisher.home.il_y_a_min', { n: Math.floor(diff / 60) })
  if (diff < 86400) return t('wisher.home.il_y_a_h', { n: Math.floor(diff / 3600) })
  if (diff < 86400 * 7) return t('wisher.home.il_y_a_j', { n: Math.floor(diff / 86400) })
  return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short' })
}

function SmallAvatar({ user, size = 24 }) {
  if (user?.avatar_url) {
    return (
      <img src={user.avatar_url} alt="" loading="lazy" decoding="async" className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }} />
    )
  }
  return (
    <div className="rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.4, background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}>
      {user?.prenom?.[0]}{user?.nom?.[0]}
    </div>
  )
}

function FavoriteCard({ wish, onClick, userLat, userLng, index }) {
  const { t, i18n } = useTranslation()
  const coverUrl = wish.images?.[0]?.url || null
  const dist = wish.latitude && wish.longitude && userLat && userLng
    ? formatDistance(getDistance(userLat, userLng, wish.latitude, wish.longitude))
    : null

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.22, delay: Math.min(index * 0.03, 0.15) }}
      layout
      onClick={onClick}
      className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06)] cursor-pointer"
    >
      <div className="relative aspect-[4/3] bg-[#F0F0F5]">
        {coverUrl ? (
          <img src={coverUrl} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
        ) : (
          <CategoryFallback slug={wish.category_slug} iconSize={56} />
        )}
        {/* Pastille avatar + prénom */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-black/30 backdrop-blur-sm rounded-full pr-2.5 pl-0.5 py-0.5">
          <SmallAvatar user={wish.wisher} size={24} />
          <span className="text-white text-[11px] font-medium">{wish.wisher?.prenom || wish.wisher?.pseudo}</span>
        </div>
        {/* Cœur toujours actif sur cette page */}
        <div className="absolute top-2 right-2">
          <FavoriteButton wish={wish} variant="overlay" size={18} />
        </div>
      </div>

      <div className="p-3 flex flex-col" style={{ minHeight: 100 }}>
        <div className="flex items-start justify-between gap-1 mb-1">
          <h3 className="font-bold text-[#1A1A2E] text-[13px] leading-snug line-clamp-1 flex-1">{wish.titre}</h3>
          <span className="text-[10px] text-[#8A8A9A] flex-shrink-0 pt-0.5">{timeAgo(wish.created_at, t, i18n.language === 'en' ? 'en-US' : 'fr-FR')}</span>
        </div>
        <p className="text-[#8A8A9A] text-[11px] leading-relaxed line-clamp-2">{wish.description}</p>
        <div className="flex items-center gap-2 text-[11px] text-[#5B6BF5] font-semibold mt-auto pt-2">
          {dist && (
            <div className="flex items-center gap-1">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#5B6BF5"/>
                <circle cx="12" cy="9" r="2.5" fill="white"/>
              </svg>
              {dist}
            </div>
          )}
          {formatLocation(wish) && (
            <span className="text-[#8A8A9A] font-medium truncate">· {formatLocation(wish)}</span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function EmptyState() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-24 text-center px-6"
    >
      <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'linear-gradient(135deg, rgba(91,107,245,0.10), rgba(155,89,245,0.10))' }}>
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5B6BF5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      </div>
      <p className="text-[15px] font-bold text-[#1A1A2E]">{t('profile.favorites.vide_titre')}</p>
      <p className="text-[12.5px] text-[#8A8A9A] mt-1.5 max-w-[280px] leading-[1.5]">
        {t('profile.favorites.vide_text')}
      </p>
      <button
        onClick={() => navigate('/maker')}
        className="mt-6 px-6 h-11 rounded-full text-white font-bold text-sm"
        style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
      >
        {t('profile.favorites.btn_explorer')}
      </button>
    </motion.div>
  )
}

export default function Favorites() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const profile = useAuthStore((s) => s.profile)
  const { wishes, loading } = useFavoriteWishes()
  const [userLocation, setUserLocation] = useState(null)

  useEffect(() => {
    if (profile?.latitude && profile?.longitude) {
      setUserLocation([profile.latitude, profile.longitude])
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation([pos.coords.latitude, pos.coords.longitude]),
        () => {}
      )
    }
  }, [profile?.latitude, profile?.longitude])

  const userLat = userLocation?.[0]
  const userLng = userLocation?.[1]

  return (
    <div className="h-screen bg-[#FAFAFA] flex flex-col">
      <Header title={t('profile.favorites.titre')} onBack={() => navigate('/profile')} />

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 rounded-full border-[2px] border-[#5B6BF5] border-t-transparent animate-spin" />
          </div>
        ) : wishes.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="px-4 pt-3 pb-8">
            {/* Compteur */}
            <p className="text-[13px] mb-3 px-1" style={{ color: '#8A8A9A' }}>
              <span className="font-semibold text-[#1A1A2E]">{wishes.length}</span>{' '}
              {wishes.length > 1 ? t('profile.favorites.compteur_pluriel') : t('profile.favorites.compteur_un')}
            </p>

            {/* Grille 2 colonnes */}
            <div className="grid grid-cols-2 gap-3">
              <AnimatePresence mode="popLayout">
                {wishes.map((wish, idx) => (
                  <FavoriteCard
                    key={wish.id}
                    wish={wish}
                    index={idx}
                    userLat={userLat}
                    userLng={userLng}
                    onClick={() => navigate(`/maker/wish/${wish.id}`)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
