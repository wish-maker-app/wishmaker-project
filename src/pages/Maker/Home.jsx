import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import BottomTabBar from '../../components/layout/BottomTabBar'
import DragScroll from '../../components/ui/DragScroll'
import useAuthStore from '../../store/authStore'
import { useWishes } from '../../hooks/useWishes'

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function createAvatarIcon(initials, rating) {
  return L.divIcon({
    className: '',
    iconSize: [56, 68],
    iconAnchor: [28, 68],
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#F5C542,#E8A820);display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:14px;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.15);">
          ${initials}
        </div>
        <div style="display:flex;align-items:center;gap:2px;margin-top:2px;">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="#F5C542"><path d="M6 1l1.35 2.74L10.5 4.27l-2.25 2.19.53 3.09L6 8.1l-2.78 1.45.53-3.09L1.5 4.27l3.15-.53L6 1z"/></svg>
          <span style="font-size:11px;font-weight:700;color:#1A1A2E;">${rating}</span>
        </div>
      </div>
    `,
  })
}

// Force le map à se resize quand il est rendu
function MapResizer() {
  const map = useMap()
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 100)
  }, [map])
  return null
}

function SmallAvatar({ user, size = 28 }) {
  const initials = `${user.prenom[0]}${user.nom[0]}`
  if (user.avatar_url) {
    return (
      <img
        src={user.avatar_url}
        alt={user.prenom}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    )
  }
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.35, background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
    >
      {initials}
    </div>
  )
}

function distanceLabel(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  const km = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`
}

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000
  if (diff < 60)   return 'à l\'instant'
  if (diff < 3600) return `Il y a ${Math.floor(diff / 60)}min`
  if (diff < 86400) return `Il y a ${Math.floor(diff / 3600)}h`
  return `Il y a ${Math.floor(diff / 86400)} jours`
}

// ── Carte vœu grille 2 colonnes (style maquette) ──
function WishGridCard({ wish, onClick, userLat, userLng }) {
  const coverUrl = wish.images?.[0]?.url || null
  const dist = distanceLabel(userLat, userLng, wish.latitude, wish.longitude)

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      onClick={onClick}
      className="bg-white rounded-2xl overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06)] active:scale-[0.98] transition-transform cursor-pointer"
    >
      {/* Cover image + avatar overlay */}
      <div className="relative aspect-[4/3] bg-[#F0F0F5]">
        {coverUrl ? (
          <img src={coverUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ background: 'linear-gradient(135deg,#E8EAFF,#D5C8FF)' }} />
        )}
        {/* Avatar + prénom en overlay */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-black/30 backdrop-blur-sm rounded-full pr-2.5 pl-0.5 py-0.5">
          <SmallAvatar user={wish.wisher} size={24} />
          <span className="text-white text-[11px] font-medium">{wish.wisher.prenom}</span>
        </div>
      </div>

      {/* Contenu texte */}
      <div className="p-3">
        {/* Titre + time */}
        <div className="flex items-start justify-between gap-1 mb-1">
          <h3 className="font-bold text-[#1A1A2E] text-[13px] leading-snug line-clamp-1 flex-1">{wish.titre}</h3>
          <span className="text-[10px] text-[#8A8A9A] flex-shrink-0 pt-0.5">{timeAgo(wish.created_at)}</span>
        </div>

        {/* Description */}
        <p className="text-[#8A8A9A] text-[11px] leading-relaxed line-clamp-3 mb-2.5">{wish.description}</p>

        {/* Distance */}
        <div className="flex items-center gap-1 text-[11px] text-[#5B6BF5] font-semibold">
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

// ── Carte sponsorisée (carrousel horizontal) ──
function SponsoredCard({ wish, onClick, userLat, userLng }) {
  const coverUrl = wish.images?.[0]?.url || null
  const dist = distanceLabel(userLat, userLng, wish.latitude, wish.longitude)

  return (
    <div
      onClick={onClick}
      className="flex-shrink-0 w-[300px] bg-white rounded-2xl overflow-hidden shadow-[0_2px_16px_rgba(0,0,0,0.08)] active:scale-[0.98] transition-transform cursor-pointer flex"
    >
      {/* Image côté gauche */}
      <div className="w-[120px] flex-shrink-0 bg-[#F0F0F5]">
        {coverUrl ? (
          <img src={coverUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ background: 'linear-gradient(135deg,#E8EAFF,#D5C8FF)' }} />
        )}
      </div>
      {/* Contenu droite */}
      <div className="flex-1 p-3 flex flex-col justify-between">
        <div>
          <h3 className="font-bold text-[#1A1A2E] text-sm leading-snug mb-1">{wish.titre}</h3>
          <p className="text-[#8A8A9A] text-[11px] leading-relaxed line-clamp-3 mb-2">{wish.description}</p>
        </div>
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <SmallAvatar user={wish.wisher} size={20} />
            <span className="text-xs font-semibold text-[#1A1A2E]">{wish.wisher.prenom}</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-[#5B6BF5] font-semibold mb-2">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#5B6BF5"/>
              <circle cx="12" cy="9" r="2.5" fill="white"/>
            </svg>
            {dist}
          </div>
          <button
            className="w-full h-8 rounded-full text-xs font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
          >
            Voir plus
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Fermer l'overlay quand on clique sur la carte ──
function MapClickHandler({ onMapClick }) {
  useMapEvents({
    click: () => onMapClick(),
  })
  return null
}

// ── Overlay aperçu vœu (bottom sheet sur la carte) ──
function WishPreviewCard({ wish, userLat, userLng, onViewMore, onMessage }) {
  const coverUrl = wish.images?.[0]?.url || null
  const dist = distanceLabel(userLat, userLng, wish.latitude, wish.longitude)

  return (
    <div className="bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.12)] flex overflow-hidden">
      {/* Image gauche */}
      <div className="w-[110px] flex-shrink-0 bg-[#F0F0F5]">
        {coverUrl ? (
          <img src={coverUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ background: 'linear-gradient(135deg,#E8EAFF,#D5C8FF)' }} />
        )}
      </div>

      {/* Contenu droite */}
      <div className="flex-1 p-3.5 flex flex-col justify-between min-w-0">
        <div>
          <h3 className="font-bold text-[#1A1A2E] text-[15px] leading-snug mb-1 truncate">{wish.titre}</h3>
          <p className="text-[#8A8A9A] text-[11px] leading-relaxed line-clamp-3 mb-2.5">{wish.description}</p>
        </div>

        <div>
          {/* Avatar + nom */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <SmallAvatar user={wish.wisher} size={20} />
            <span className="text-xs font-semibold text-[#1A1A2E]">{wish.wisher.prenom}</span>
          </div>

          {/* Distance */}
          <div className="flex items-center gap-1 text-[11px] text-[#5B6BF5] font-semibold mb-2.5">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#5B6BF5"/>
              <circle cx="12" cy="9" r="2.5" fill="white"/>
            </svg>
            {dist}
          </div>

          {/* Boutons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onViewMore}
              className="flex-1 h-9 rounded-full text-xs font-bold text-white"
              style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
            >
              Voir plus
            </button>
            <button
              onClick={onMessage}
              className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 border border-[#E0E0E0]"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
                  stroke="#5B6BF5" strokeWidth="2" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function MakerHome() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [view, setView] = useState('carte')
  const [search, setSearch] = useState('')
  const [selectedWish, setSelectedWish] = useState(null)
  const profile = useAuthStore((s) => s.profile)
  const { getAvailableWishes, loading } = useWishes()
  const [wishes, setWishes] = useState([])

  useEffect(() => {
    getAvailableWishes().then(setWishes).catch(() => {})
  }, [])

  const filtered = wishes.filter((w) =>
    w.titre.toLowerCase().includes(search.toLowerCase()) ||
    w.description.toLowerCase().includes(search.toLowerCase()) ||
    (w.tags || []).some((tag) => tag.toLowerCase().includes(search.toLowerCase()))
  )

  const sponsored = filtered.filter((w) => w.is_sponsored)
  const nonSponsored = filtered.filter((w) => !w.is_sponsored)

  // Fallback Toulouse si profil sans localisation
  const center = [
    profile?.latitude || 43.6047,
    profile?.longitude || 1.4442,
  ]

  return (
    <div className="h-screen bg-white flex flex-col relative overflow-hidden">

      {/* Search bar + toggle — toujours au-dessus */}
      <div className="relative z-[500] px-4 pt-14 pb-2 pointer-events-none">
        {/* Search */}
        <div className="relative flex items-center mb-3 pointer-events-auto">
          <svg className="absolute left-4" width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="#8A8A9A" strokeWidth="2"/>
            <path d="M21 21l-3.5-3.5" stroke="#8A8A9A" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Recherchez"
            className="w-full h-12 bg-white border border-[#E8E8E8] rounded-full pl-10 pr-12 text-sm text-[#1A1A2E] placeholder-[#B0B0B0] outline-none shadow-sm"
          />
          <button className="absolute right-3" onClick={() => navigate('/maker/filters')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M4 6h16M8 12h8M11 18h2" stroke="#1A1A2E" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Toggle Liste / Carte */}
        <div className="flex bg-white rounded-full p-1 shadow-sm border border-[#F0F0F0] pointer-events-auto">
          <button
            onClick={() => setView('liste')}
            className="flex-1 h-10 rounded-full text-sm font-semibold transition-all"
            style={view === 'liste'
              ? { background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)', color: '#fff' }
              : { color: '#8A8A9A' }}
          >
            Liste
          </button>
          <button
            onClick={() => setView('carte')}
            className="flex-1 h-10 rounded-full text-sm font-semibold transition-all"
            style={view === 'carte'
              ? { background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)', color: '#fff' }
              : { color: '#8A8A9A' }}
          >
            Carte
          </button>
        </div>
      </div>

      {/* Contenu — même conteneur flex-1 pour les deux vues */}
      <div className="flex-1 relative z-0 overflow-hidden">
        {view === 'carte' ? (
          <>
            <MapContainer
              center={center}
              zoom={14}
              scrollWheelZoom
              style={{ width: '100%', height: '100%' }}
              zoomControl={false}
            >
              <MapResizer />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              />
              <MapClickHandler onMapClick={() => setSelectedWish(null)} />
              {filtered.map((wish) => (
                <Marker
                  key={wish.id}
                  position={[wish.latitude, wish.longitude]}
                  icon={createAvatarIcon(
                    `${wish.wisher.prenom[0]}${wish.wisher.nom[0]}`,
                    wish.wisher.rating
                  )}
                  eventHandlers={{ click: () => setSelectedWish(wish) }}
                />
              ))}
            </MapContainer>

            {/* Overlay aperçu vœu */}
            <AnimatePresence>
              {selectedWish && (
                <motion.div
                  initial={{ y: '100%', opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: '100%', opacity: 0 }}
                  transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                  className="absolute bottom-20 left-4 right-4 z-[600]"
                >
                  <WishPreviewCard
                    wish={selectedWish}
                    userLat={center[0]}
                    userLng={center[1]}
                    onViewMore={() => navigate(`/maker/wish/${selectedWish.id}`)}
                    onMessage={() => navigate(`/maker/wish/${selectedWish.id}`)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <div className="h-full px-4 pt-2 pb-24 overflow-y-auto bg-[#F7F8FC]">
            {/* Section sponsorisés */}
            {sponsored.length > 0 && (
              <div className="mb-5">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-bold text-[#1A1A2E] text-base">Vœux sponsorisés</h2>
                  {sponsored.length > 1 && (
                    <div className="flex gap-1">
                      {sponsored.map((_, i) => (
                        <div key={i} className="w-1.5 h-1.5 rounded-full" style={{ background: i === 0 ? '#5B6BF5' : '#D0D0D0' }} />
                      ))}
                    </div>
                  )}
                </div>
                <DragScroll className="flex gap-3 pb-2 -mx-4 px-4">
                  {sponsored.map((wish) => (
                    <SponsoredCard
                      key={wish.id}
                      wish={wish}
                      onClick={() => navigate(`/maker/wish/${wish.id}`)}
                      userLat={center[0]}
                      userLng={center[1]}
                    />
                  ))}
                </DragScroll>
              </div>
            )}

            {/* Section vœux trouvés */}
            <h2 className="font-bold text-[#1A1A2E] text-base mb-3">
              Vœux trouvés ({nonSponsored.length})
            </h2>

            <AnimatePresence mode="popLayout">
              {nonSponsored.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {nonSponsored.map((wish) => (
                    <WishGridCard
                      key={wish.id}
                      wish={wish}
                      onClick={() => navigate(`/maker/wish/${wish.id}`)}
                      userLat={center[0]}
                      userLng={center[1]}
                    />
                  ))}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-16 gap-3"
                >
                  <p className="text-[#1A1A2E] font-bold text-sm">Aucun vœu trouvé</p>
                  <p className="text-[#8A8A9A] text-xs">Essaie d'autres mots-clés</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <BottomTabBar />
    </div>
  )
}
