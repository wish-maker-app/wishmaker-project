import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import BottomTabBar from '../../components/layout/BottomTabBar'
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

function Avatar({ user, size = 36 }) {
  const initials = `${user.prenom[0]}${user.nom[0]}`
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white text-xs"
      style={{ width: size, height: size, background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
    >
      {initials}
    </div>
  )
}

function StatusBadge({ statut }) {
  const map = {
    en_attente: { label: 'En attente', bg: '#EEF0FF', color: '#5B6BF5' },
    en_cours:   { label: 'En cours',   bg: '#FFF4E0', color: '#F59E0B' },
    terminé:    { label: 'Terminé',    bg: '#E6FBF0', color: '#22C55E' },
  }
  const s = map[statut] || map.en_attente
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000
  if (diff < 60)   return 'à l\'instant'
  if (diff < 3600) return `${Math.floor(diff / 60)}min`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`
  return `${Math.floor(diff / 86400)}j`
}

function WishCard({ wish, onClick }) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      onClick={onClick}
      className="bg-white rounded-[20px] p-4 shadow-[0_4px_20px_rgba(0,0,0,0.07)] active:scale-[0.99] transition-transform cursor-pointer"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <Avatar user={wish.wisher} size={40} />
          <div className="min-w-0">
            <p className="text-sm font-bold text-[#1A1A2E] truncate">{wish.wisher.prenom} {wish.wisher.nom}</p>
            <span className="flex items-center gap-0.5 text-xs font-semibold text-[#1A1A2E]">
              <svg width="11" height="11" viewBox="0 0 12 12" fill="#F5C542"><path d="M6 1l1.35 2.74L10.5 4.27l-2.25 2.19.53 3.09L6 8.1l-2.78 1.45.53-3.09L1.5 4.27l3.15-.53L6 1z"/></svg>
              {wish.wisher.rating}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <StatusBadge statut={wish.statut} />
          <span className="text-[10px] text-[#8A8A9A]">{timeAgo(wish.created_at)}</span>
        </div>
      </div>
      <h3 className="font-bold text-[#1A1A2E] text-sm mb-1 leading-snug">{wish.titre}</h3>
      <p className="text-[#8A8A9A] text-xs leading-relaxed line-clamp-2 mb-3">{wish.description}</p>
      {wish.tags?.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {wish.tags.map((tag) => (
            <span key={tag} className="text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{ background: '#EEF0FF', color: '#5B6BF5' }}>
              {tag}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-center gap-1.5 text-xs text-[#8A8A9A]">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" stroke="#8A8A9A" strokeWidth="2"/>
          <circle cx="12" cy="9" r="2.5" stroke="#8A8A9A" strokeWidth="2"/>
        </svg>
        {wish.adresse}
      </div>
    </motion.div>
  )
}

export default function MakerHome() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [view, setView] = useState('carte')
  const [search, setSearch] = useState('')
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
          <MapContainer
            center={center}
            zoom={14}
            scrollWheelZoom
            style={{ width: '100%', height: '100%' }}
            zoomControl={false}
          >
            <MapResizer />
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {filtered.map((wish) => (
              <Marker
                key={wish.id}
                position={[wish.latitude, wish.longitude]}
                icon={createAvatarIcon(
                  `${wish.wisher.prenom[0]}${wish.wisher.nom[0]}`,
                  wish.wisher.rating
                )}
                eventHandlers={{ click: () => navigate(`/maker/wish/${wish.id}`) }}
              />
            ))}
          </MapContainer>
        ) : (
          <div className="h-full px-4 pt-2 pb-24 overflow-y-auto bg-[#F7F8FC]">
            <p className="text-xs text-[#8A8A9A] font-medium mb-3">
              {filtered.length} vœu{filtered.length > 1 ? 'x' : ''} près de vous
            </p>
            <AnimatePresence mode="popLayout">
              {filtered.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {filtered.map((wish) => (
                    <WishCard key={wish.id} wish={wish} onClick={() => navigate(`/maker/wish/${wish.id}`)} />
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
