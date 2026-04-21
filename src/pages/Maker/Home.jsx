// Wish Maker v1.4
import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion'
import toast from 'react-hot-toast'
import { MapContainer, TileLayer, Marker, Circle, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import BottomTabBar from '../../components/layout/BottomTabBar'
import DragScroll from '../../components/ui/DragScroll'
import useAuthStore from '../../store/authStore'
import useMakerStore from '../../store/makerStore'
import { useWishes } from '../../hooks/useWishes'
import { useMessages } from '../../hooks/useMessages'
import { fuzzyCoordinates, FUZZY_RADIUS_METERS } from '../../lib/geo'
import FavoriteButton from '../../components/ui/FavoriteButton'
import AccountTypeBadge from '../../components/ui/AccountTypeBadge'
import { useUserTagSubscriptions } from '../../hooks/useTags'

// Fix default marker icon
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

function createWishMarker(wish) {
  const cover = wish.images?.find((img) => img.is_cover) || wish.images?.[0]
  const initials = `${wish.wisher?.prenom?.[0] || ''}${wish.wisher?.nom?.[0] || ''}`
  const rating = wish.wisher?.rating

  // Si une photo existe → on l'affiche, sinon fallback initiales (gradient or)
  const visual = cover?.url
    ? `<div style="width:48px;height:48px;border-radius:12px;background:#F5F5F7 center/cover no-repeat url('${cover.url}');border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.15);"></div>`
    : `<div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#F5C542,#E8A820);display:flex;align-items:center;justify-content:center;font-weight:700;color:#fff;font-size:14px;border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.15);">${initials}</div>`

  return L.divIcon({
    className: '',
    iconSize: [56, 68],
    iconAnchor: [28, 68],
    html: `
      <div style="display:flex;flex-direction:column;align-items:center;">
        ${visual}
        <div style="display:flex;align-items:center;gap:2px;margin-top:2px;background:#fff;padding:2px 6px;border-radius:10px;box-shadow:0 1px 4px rgba(0,0,0,0.12);">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="#F5C542"><path d="M6 1l1.35 2.74L10.5 4.27l-2.25 2.19.53 3.09L6 8.1l-2.78 1.45.53-3.09L1.5 4.27l3.15-.53L6 1z"/></svg>
          <span style="font-size:11px;font-weight:700;color:#1A1A2E;">${rating > 0 ? rating : '-'}</span>
        </div>
      </div>
    `,
  })
}

// Point bleu position utilisateur
const userLocationIcon = L.divIcon({
  className: '',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  html: `
    <div style="position:relative;width:20px;height:20px;">
      <div style="position:absolute;inset:0;border-radius:50%;background:rgba(91,107,245,0.2);animation:pulse-ring 1.5s ease-out infinite;"></div>
      <div style="position:absolute;top:4px;left:4px;width:12px;height:12px;border-radius:50%;background:#5B6BF5;border:2.5px solid white;box-shadow:0 1px 6px rgba(91,107,245,0.5);"></div>
    </div>
    <style>@keyframes pulse-ring{0%{transform:scale(1);opacity:1}100%{transform:scale(2.5);opacity:0}}</style>
  `,
})

// Force le map à se resize quand il est rendu
function MapResizer() {
  const map = useMap()
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 100)
  }, [map])
  return null
}

// Centre la carte sur la position passée
function MapCenterUpdater({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.setView(center, map.getZoom())
  }, [center])
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

function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

function distanceLabel(lat1, lng1, lat2, lng2) {
  const km = distanceKm(lat1, lng1, lat2, lng2)
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
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-black/30 backdrop-blur-sm rounded-full pr-2.5 pl-0.5 py-0.5">
          <SmallAvatar user={wish.wisher} size={24} />
          <span className="text-white text-[11px] font-medium">{wish.wisher.prenom}</span>
        </div>
        {/* Bouton favoris en overlay top-right */}
        <div className="absolute top-2 right-2">
          <FavoriteButton wish={wish} variant="overlay" size={18} />
        </div>
      </div>

      {/* Contenu texte */}
      <div className="p-3 flex flex-col" style={{ minHeight: 100 }}>
        {/* Titre + time */}
        <div className="flex items-start justify-between gap-1 mb-1">
          <h3 className="font-bold text-[#1A1A2E] text-[13px] leading-snug line-clamp-1 flex-1">{wish.titre}</h3>
          <span className="text-[10px] text-[#8A8A9A] flex-shrink-0 pt-0.5">{timeAgo(wish.created_at)}</span>
        </div>

        {/* Description — tronquée à 2 lignes */}
        <p className="text-[#8A8A9A] text-[11px] leading-relaxed line-clamp-2">{wish.description}</p>

        {/* Distance — fixée en bas */}
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

// ── Carte sponsorisée (carrousel horizontal) ──
function SponsoredCard({ wish, onClick, userLat, userLng }) {
  const coverUrl = wish.images?.[0]?.url || null
  const dist = distanceLabel(userLat, userLng, wish.latitude, wish.longitude)

  return (
    <div
      onClick={onClick}
      className="flex-shrink-0 w-[300px] h-[140px] bg-white rounded-2xl overflow-hidden shadow-[0_2px_16px_rgba(0,0,0,0.08)] cursor-pointer flex"
    >
      {/* Image côté gauche — avec capsule avatar/nom en overlay (cohérence DA) */}
      <div className="relative w-[120px] flex-shrink-0 bg-[#F0F0F5]">
        {coverUrl ? (
          <img src={coverUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ background: 'linear-gradient(135deg,#E8EAFF,#D5C8FF)' }} />
        )}
        {/* Capsule avatar + pseudo (identique aux autres cards) */}
        <div className="absolute top-1.5 left-1.5 flex items-center gap-1 bg-black/30 backdrop-blur-sm rounded-full pr-2 pl-0.5 py-0.5 max-w-[calc(100%-12px)]">
          <SmallAvatar user={wish.wisher} size={18} />
          <span className="text-white text-[10px] font-medium truncate">
            {wish.wisher.pseudo || wish.wisher.prenom}
          </span>
        </div>
      </div>
      {/* Contenu droite */}
      <div className="flex-1 p-2.5 flex flex-col justify-between min-w-0">
        <div>
          <h3 className="font-bold text-[#1A1A2E] text-sm leading-snug line-clamp-1">{wish.titre}</h3>
          <p className="text-[#8A8A9A] text-[11px] leading-snug line-clamp-1 mt-0.5">{wish.description}</p>
        </div>
        <div>
          <div className="flex items-center gap-1 text-[11px] text-[#5B6BF5] font-semibold mb-1.5">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#5B6BF5"/>
              <circle cx="12" cy="9" r="2.5" fill="white"/>
            </svg>
            {dist}
          </div>
          <button
            className="w-full h-7 rounded-full text-[11px] font-bold text-white"
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

function SwipeCard({ wish, userLat, userLng, onSwipeRight, onSwipeLeft, isTop }) {
  const x = useMotionValue(0)
  const rotate = useTransform(x, [-200, 200], [-15, 15])
  const opacityLeft = useTransform(x, [-150, -50, 0], [1, 0.5, 0])
  const opacityRight = useTransform(x, [0, 50, 150], [0, 0.5, 1])

  const coverUrl = wish.images?.[0]?.url || null
  const dist = distanceLabel(userLat, userLng, wish.latitude, wish.longitude)

  function handleDragEnd(_, info) {
    if (info.offset.x > 120) onSwipeRight()
    else if (info.offset.x < -120) onSwipeLeft()
  }

  return (
    <motion.div
      style={{ x, rotate, position: 'absolute', width: '100%' }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.8}
      onDragEnd={handleDragEnd}
      initial={{ scale: isTop ? 1 : 0.95, opacity: isTop ? 1 : 0.7 }}
      animate={{ scale: isTop ? 1 : 0.95, opacity: isTop ? 1 : 0.7 }}
      exit={{ x: 300, opacity: 0, transition: { duration: 0.3 } }}
      className="bg-white rounded-[24px] overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.12)] cursor-grab active:cursor-grabbing"
    >
      {/* Overlays swipe — couleur seule */}
      {isTop && (
        <>
          <motion.div style={{ opacity: opacityRight }}
            className="absolute inset-0 z-10 bg-green-500/20 rounded-[24px] pointer-events-none" />
          <motion.div style={{ opacity: opacityLeft }}
            className="absolute inset-0 z-10 bg-red-500/20 rounded-[24px] pointer-events-none" />
        </>
      )}

      {/* Image */}
      <div className="relative h-[170px] bg-[#F0F0F5]">
        {coverUrl ? (
          <img src={coverUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full" style={{ background: 'linear-gradient(160deg,#5B6BF5 0%,#9B59F5 100%)' }} />
        )}
        {/* Avatar + prénom en overlay (même pastille que la vue Liste) */}
        <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5 bg-black/30 backdrop-blur-sm rounded-full pr-2.5 pl-0.5 py-0.5">
          <SmallAvatar user={wish.wisher} size={24} />
          <span className="text-white text-[11px] font-medium">{wish.wisher.pseudo || wish.wisher.prenom}</span>
        </div>
        {wish.is_urgent && (
          <span className="absolute top-3 right-3 text-[11px] font-bold px-2.5 py-1 rounded-full"
            style={{ background: '#FFF4E0', color: '#F59E0B' }}>
            URGENT
          </span>
        )}
      </div>

      {/* Contenu */}
      <div className="p-5">
        <h3 className="font-extrabold text-[#1A1A2E] text-lg mb-1 line-clamp-2">{wish.titre}</h3>
        <p className="text-[#8A8A9A] text-[13px] leading-relaxed line-clamp-2 mb-3">{wish.description}</p>

        {/* Ligne 1 : distance + temps */}
        <div className="flex items-center gap-3 mb-2">
          <div className="flex items-center gap-1 text-sm text-[#5B6BF5] font-semibold">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" fill="#5B6BF5"/>
              <circle cx="12" cy="9" r="2.5" fill="white"/>
            </svg>
            {dist}
          </div>
          <span className="text-xs text-[#8A8A9A]">{timeAgo(wish.created_at)}</span>
        </div>

        {/* Ligne 2 : type de compte + récompense */}
        <div className="flex items-center gap-2 flex-wrap">
          <AccountTypeBadge type={wish.wisher.type_compte} />
          {wish.type_recompense && (
            <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full"
              style={wish.type_recompense === 'argent'
                ? { background: '#ECFDF5', color: '#059669' }
                : { background: '#EFF6FF', color: '#3B82F6' }
              }>
              {wish.type_recompense === 'argent'
                ? `${wish.montant_recompense ? wish.montant_recompense + '€' : 'Argent'}`
                : 'Bon procédé'}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )
}

export default function MakerHome() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const [view, setView] = useState(searchParams.get('view') || 'liste')
  const [search, setSearch] = useState('')
  const [selectedWish, setSelectedWish] = useState(null)
  const [swipeIndex, setSwipeIndex] = useState(0)
  const [skippedIds, setSkippedIds] = useState(new Set())
  const [acceptedWish, setAcceptedWish] = useState(null)
  const [acceptMessage, setAcceptMessage] = useState('')
  const profile = useAuthStore((s) => s.profile)
  const { sortBy, maxDistance, selectedCategories } = useMakerStore()
  const { getAvailableWishes, loading } = useWishes()
  const { tagIds: subscribedTagIds } = useUserTagSubscriptions()
  const isProMaker = profile?.type_compte === 'pro'
  const { createConversation, sendMessage } = useMessages()
  const [wishes, setWishes] = useState([])
  const [userLocation, setUserLocation] = useState(null)
  const mapRef = useRef(null)

  // Géolocalisation en temps réel
  useEffect(() => {
    if (!navigator.geolocation) return
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude])
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  useEffect(() => {
    getAvailableWishes().then(setWishes).catch(() => {})
  }, [])

  // Position : géoloc temps réel > profil > fallback Toulouse
  const center = userLocation || [
    profile?.latitude || 43.6047,
    profile?.longitude || 1.4442,
  ]

  // Filtrage textuel
  const textFiltered = wishes.filter((w) =>
    !search || w.titre.toLowerCase().includes(search.toLowerCase()) ||
    w.description.toLowerCase().includes(search.toLowerCase()) ||
    (w.tags || []).some((tag) => tag.toLowerCase().includes(search.toLowerCase()))
  )

  // Mapping catégories → tags pour le filtrage
  const CATEGORY_TAGS = {
    depannage: ['Plomberie', 'Électricité', 'Serrurerie', 'Peinture', 'Carrelage', 'Maçonnerie'],
    immobilier: ['Meubles', 'Montage de meubles', 'Décoration d\'intérieur', 'Déménagement', 'Rangement'],
    services: ['Ménage', 'Aide à domicile', 'Repassage', 'Nettoyage', 'Baby-sitting', 'Cuisine'],
    animaux: ['Garde animaux', 'Promenade chien', 'Jardinage', 'Entretien jardin', 'Vétérinaire'],
    transport: ['Livraison', 'Courses', 'Transport de personnes', 'Déplacement'],
    cours: ['Cours particuliers', 'Musique', 'Informatique', 'Langues', 'Sport', 'Soutien scolaire'],
  }

  // Filtrage par rayon de distance
  const distanceFiltered = maxDistance >= 100
    ? textFiltered
    : textFiltered.filter((w) => {
        if (!w.latitude || !w.longitude) return true
        return distanceKm(center[0], center[1], w.latitude, w.longitude) <= maxDistance
      })

  // Filtrage par catégories sélectionnées
  const categoryFiltered = selectedCategories.length === 0
    ? distanceFiltered
    : distanceFiltered.filter((w) => {
        const wishTags = (w.tags || []).map(t => t.toLowerCase())
        return selectedCategories.some((catId) => {
          const catTags = (CATEGORY_TAGS[catId] || []).map(t => t.toLowerCase())
          return catTags.some(ct => wishTags.includes(ct))
        })
      })

  // Filtrage pour les Makers pros : seulement les vœux matchant au moins un tag souscrit.
  // Si aucun tag souscrit, on affiche tout (sinon feed vide = mauvaise UX d'onboarding).
  const filtered = isProMaker && subscribedTagIds.length > 0
    ? categoryFiltered.filter((w) =>
        (w.tag_ids || []).some((tagId) => subscribedTagIds.includes(tagId))
      )
    : categoryFiltered

  const sponsored = filtered.filter((w) => w.is_sponsored || (w.is_urgent && w.urgent_until && new Date(w.urgent_until) > Date.now()))
  const nonSponsored = [...filtered]
    .filter((w) => !w.is_sponsored && !(w.is_urgent && w.urgent_until && new Date(w.urgent_until) > Date.now()))
    .sort((a, b) => {
      // Tri selon filtre actif
      if (sortBy === 'urgent') {
        const aU = a.is_urgent && a.urgent_until && new Date(a.urgent_until) > Date.now()
        const bU = b.is_urgent && b.urgent_until && new Date(b.urgent_until) > Date.now()
        if (aU && !bU) return -1
        if (!aU && bU) return 1
      }
      if (sortBy === 'distance') {
        const dA = distanceKm(center[0], center[1], a.latitude, a.longitude)
        const dB = distanceKm(center[0], center[1], b.latitude, b.longitude)
        return dA - dB
      }
      if (sortBy === 'recent') {
        return new Date(b.created_at) - new Date(a.created_at)
      }
      // Par défaut : urgents en premier
      const aUrgent = a.is_urgent && a.urgent_until && new Date(a.urgent_until) > Date.now()
      const bUrgent = b.is_urgent && b.urgent_until && new Date(b.urgent_until) > Date.now()
      if (aUrgent && !bUrgent) return -1
      if (!aUrgent && bUrgent) return 1
      return 0
    })

  // Vœux pour le mode swipe : exclure ses propres vœux + les refusés, max 30km
  const swipeWishes = filtered.filter((w) => {
    if (w.wisher_id === profile?.id || skippedIds.has(w.id)) return false
    if (w.latitude && w.longitude) {
      return distanceKm(center[0], center[1], w.latitude, w.longitude) <= 30
    }
    return true
  })

  function handleSwipeAccept(wish) {
    setAcceptedWish(wish)
    setAcceptMessage('')
    setSkippedIds((prev) => new Set(prev).add(wish.id))
  }

  function handleSwipeSkip(wishId) {
    setSkippedIds((prev) => new Set(prev).add(wishId))
    setSwipeIndex((prev) => prev + 1)
  }

  async function handleSendAcceptMessage() {
    try {
      const convId = await createConversation(acceptedWish.id, acceptedWish.wisher_id)
      if (acceptMessage.trim()) {
        await sendMessage(convId, acceptMessage.trim())
      }
      toast.success('Vœu accepté ! 🎉')
      setAcceptedWish(null)
      setAcceptMessage('')
    } catch (err) {
      console.error(err)
      toast.error('Erreur lors de la mise en relation')
    }
  }

  function handleCancelAccept() {
    if (acceptedWish) {
      setSkippedIds((prev) => {
        const next = new Set(prev)
        next.delete(acceptedWish.id)
        return next
      })
    }
    setAcceptedWish(null)
    setAcceptMessage('')
  }

  return (
    <div className="h-screen bg-white flex flex-col relative overflow-hidden">

      {/* Search bar + toggle — toujours au-dessus */}
      <div className="relative z-[500] px-4 pt-4 pb-2 flex-shrink-0 pointer-events-none">
        {/* Search — désactivé en mode Swipe */}
        <div className={`relative flex items-center mb-3 transition-opacity ${view === 'swipe' ? 'opacity-40 pointer-events-none' : 'pointer-events-auto'}`}>
          <svg className="absolute left-4" width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="#8A8A9A" strokeWidth="2"/>
            <path d="M21 21l-3.5-3.5" stroke="#8A8A9A" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={view === 'swipe' ? 'Recherche non disponible en mode Swipe' : 'Recherchez'}
            disabled={view === 'swipe'}
            className="w-full h-12 bg-white border border-[#E8E8E8] rounded-full pl-10 pr-12 text-sm text-[#1A1A2E] placeholder-[#B0B0B0] outline-none shadow-sm disabled:cursor-not-allowed"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <button className="relative p-1" onClick={() => navigate(`/maker/filters?from=${view}`)} disabled={view === 'swipe'}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M4 6h16M8 12h8M11 18h2" stroke="#1A1A2E" strokeWidth="2" strokeLinecap="round"/>
              </svg>
              {(sortBy || maxDistance !== 100) && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
                  {(sortBy ? 1 : 0) + (maxDistance !== 100 ? 1 : 0)}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Toggle Liste / Carte / Swipe */}
        <div className="flex bg-white rounded-full p-1 shadow-sm border border-[#F0F0F0] pointer-events-auto">
          {['liste', 'carte', 'swipe'].map((v) => (
            <button
              key={v}
              onClick={() => { setView(v); if (v === 'swipe') setSwipeIndex(0) }}
              className="flex-1 h-10 rounded-full text-sm font-semibold transition-all"
              style={view === v
                ? { background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)', color: '#fff' }
                : { color: '#8A8A9A' }}
            >
              {v === 'liste' ? 'Liste' : v === 'carte' ? 'Carte' : 'Swipe'}
            </button>
          ))}
        </div>
      </div>

      {/* Contenu — prend toute la hauteur */}
      <div className="flex-1 relative z-0 overflow-hidden">
        {view === 'carte' ? (  /* VUE CARTE */
          <>
            <MapContainer
              center={center}
              zoom={14}
              scrollWheelZoom
              style={{ width: '100%', height: '100%' }}
              zoomControl={false}
              ref={mapRef}
            >
              <MapResizer />
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              />
              <MapClickHandler onMapClick={() => setSelectedWish(null)} />
              {/* Point bleu position utilisateur */}
              {userLocation && (
                <>
                  <Circle center={userLocation} radius={60} pathOptions={{ color: '#5B6BF5', fillColor: '#5B6BF5', fillOpacity: 0.08, weight: 0 }} />
                  <Marker position={userLocation} icon={userLocationIcon} zIndexOffset={1000} />
                </>
              )}
              {filtered.map((wish) => {
                const [fLat, fLng] = fuzzyCoordinates(wish.latitude, wish.longitude, wish.id)
                return (
                  <Marker
                    key={wish.id}
                    position={[fLat, fLng]}
                    icon={createWishMarker(wish)}
                    eventHandlers={{ click: () => setSelectedWish(wish) }}
                  />
                )
              })}
            </MapContainer>

            {/* Bouton recentrer sur moi */}
            <button
              onClick={() => {
                if (userLocation && mapRef.current) {
                  mapRef.current.setView(userLocation, 15, { animate: true })
                } else if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition((pos) => {
                    const loc = [pos.coords.latitude, pos.coords.longitude]
                    setUserLocation(loc)
                    mapRef.current?.setView(loc, 15, { animate: true })
                  })
                }
              }}
              className="absolute z-[500] w-12 h-12 rounded-full bg-white shadow-lg flex items-center justify-center border border-[#E8E8E8] active:scale-95 transition-transform"
              style={{ bottom: 100, right: '1.25rem' }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="3" fill="#5B6BF5"/>
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" stroke="#5B6BF5" strokeWidth="2" strokeLinecap="round"/>
                <circle cx="12" cy="12" r="8" stroke="#5B6BF5" strokeWidth="1.5" fill="none"/>
              </svg>
            </button>

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
                    onViewMore={() => navigate(`/maker/wish/${selectedWish.id}?from=${view}`)}
                    onMessage={() => navigate(`/maker/wish/${selectedWish.id}?from=${view}`)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </>
        ) : view === 'liste' ? (
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
                      onClick={() => navigate(`/maker/wish/${wish.id}?from=${view}`)}
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
                      onClick={() => navigate(`/maker/wish/${wish.id}?from=${view}`)}
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
        ) : view === 'swipe' ? (
          <div className="h-full flex flex-col items-center justify-center px-6 py-4 bg-[#F7F8FC]">
            {swipeWishes.length > 0 ? (
              <>
                <div className="relative w-full flex-1">
                  <AnimatePresence>
                    {swipeWishes.slice(0, 2).reverse().map((wish, i, arr) => (
                      <SwipeCard
                        key={wish.id}
                        wish={wish}
                        userLat={center[0]}
                        userLng={center[1]}
                        isTop={i === arr.length - 1}
                        onSwipeRight={() => handleSwipeAccept(wish)}
                        onSwipeLeft={() => handleSwipeSkip(wish.id)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
                <div className="flex items-center gap-8 mt-4 pb-24">
                  <button
                    onClick={() => { if (swipeWishes[0]) handleSwipeSkip(swipeWishes[0].id) }}
                    className="w-16 h-16 rounded-full bg-white border-2 border-red-400 flex items-center justify-center shadow-lg"
                  >
                    <span className="text-red-500 text-2xl font-bold">✕</span>
                  </button>
                  <button
                    onClick={() => { if (swipeWishes[0]) handleSwipeAccept(swipeWishes[0]) }}
                    className="w-16 h-16 rounded-full bg-white border-2 border-green-400 flex items-center justify-center shadow-lg"
                  >
                    <span className="text-green-500 text-2xl font-bold">✓</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <span className="text-5xl">🌟</span>
                <p className="text-[#1A1A2E] font-bold text-sm">Plus de vœux disponibles</p>
                <p className="text-[#8A8A9A] text-xs text-center">Reviens plus tard pour découvrir de nouveaux vœux !</p>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Modal message après acceptation swipe */}
      <AnimatePresence>
        {acceptedWish && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={handleCancelAccept}
              className="fixed inset-0 bg-black/40 z-[900] overlay-backdrop" />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[28px] z-[901] px-5 pb-8 pt-4 bottom-sheet"
            >
              <div className="w-10 h-1 rounded-full bg-[#E0E0E0] mx-auto mb-4" />
              <h2 className="text-lg font-bold text-[#1A1A2E] mb-1">Vous souhaitez réaliser ce vœu !</h2>
              <p className="text-sm text-[#8A8A9A] mb-4">
                Envoyez un message à <span className="font-semibold text-[#5B6BF5]">
                  {acceptedWish.wisher?.pseudo || acceptedWish.wisher?.prenom}
                </span> pour vous présenter.
              </p>
              <p className="text-xs font-semibold text-[#1A1A2E] mb-2">{acceptedWish.titre}</p>
              <textarea
                value={acceptMessage}
                onChange={(e) => setAcceptMessage(e.target.value)}
                placeholder="Bonjour, je suis intéressé par votre vœu..."
                rows={4}
                className="w-full bg-[#F7F8FC] rounded-2xl px-4 py-3 text-sm text-[#1A1A2E] outline-none resize-none mb-4"
              />
              <button
                onClick={handleSendAcceptMessage}
                className="w-full h-12 rounded-full text-white font-bold text-sm"
                style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
              >
                {acceptMessage.trim() ? 'Envoyer le message' : 'Envoyer un message'}
              </button>
              <button
                onClick={handleCancelAccept}
                className="w-full mt-3 h-10 rounded-full border border-[#E0E0E0] text-sm text-[#8A8A9A] font-semibold"
              >
                Annuler
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <BottomTabBar />
    </div>
  )
}
