import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useTranslation } from 'react-i18next'
import Header from '../../components/layout/Header'
import Button from '../../components/ui/Button'
import BottomTabBar from '../../components/layout/BottomTabBar'
import useAuthStore from '../../store/authStore'
import { useWishes } from '../../hooks/useWishes'
import { useMessages } from '../../hooks/useMessages'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const pinIcon = L.divIcon({
  html: `<div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#5B6BF5,#9B59F5);border:3px solid white;box-shadow:0 2px 8px rgba(91,107,245,0.5);"></div>`,
  className: '',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
})

function StaticMap({ lat, lng }) {
  function MapSetup() {
    const map = useMap()
    useEffect(() => {
      map.dragging.disable()
      map.scrollWheelZoom.disable()
      map.doubleClickZoom.disable()
      map.touchZoom.disable()
      setTimeout(() => map.invalidateSize(), 100)
    }, [map])
    return null
  }

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={14}
      zoomControl={false}
      style={{ width: '100%', height: '100%' }}
      attributionControl={false}
    >
      <MapSetup />
      <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      <Marker position={[lat, lng]} icon={pinIcon} />
    </MapContainer>
  )
}

function Avatar({ user, size = 48 }) {
  const initials = `${user.prenom[0]}${user.nom[0]}`
  return (
    <div className="relative flex-shrink-0">
      <div className="rounded-full flex items-center justify-center font-bold text-white"
        style={{ width: size, height: size, background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)', fontSize: size * 0.28 }}>
        {initials}
      </div>
      {user.is_online && (
        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#22C55E] border-2 border-white" />
      )}
    </div>
  )
}

function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLng = (lng2 - lng1) * Math.PI / 180
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2
  return (R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))).toFixed(1)
}

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000
  if (diff < 60)    return 'à l\'instant'
  if (diff < 3600)  return `il y a ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`
  return `il y a ${Math.floor(diff / 86400)}j`
}

function openGoogleMaps(lat, lng) {
  window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank')
}

export default function WishDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const profile = useAuthStore((s) => s.profile)
  const { getWishById, loading } = useWishes()
  const { createConversation } = useMessages()
  const [wish, setWish] = useState(null)

  useEffect(() => {
    getWishById(id).then(setWish).catch(() => {})
  }, [id])

  if (!wish) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-[#5B6BF5] border-t-transparent animate-spin" />
      </div>
    )
  }

  const userLat = profile?.latitude || 43.6047
  const userLng = profile?.longitude || 1.4442
  const dist = distanceKm(userLat, userLng, wish.latitude, wish.longitude)

  const isOwner = searchParams.get('owner') === '1' || wish.wisher_id === profile?.id

  const heroImage = wish.images?.[0]?.url || null

  async function handleMessage() {
    try {
      const convId = await createConversation(wish.id, wish.wisher_id)
      navigate(`/messages/${convId}`)
    } catch (err) {
      console.error('Erreur création conversation:', err)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col pb-28">

      {/* Hero */}
      <div className="relative flex-shrink-0" style={{ height: 220 }}>
        {heroImage ? (
          <img src={heroImage} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full"
            style={{ background: 'linear-gradient(160deg,#5B6BF5 0%,#9B59F5 100%)' }} />
        )}
        <Header transparent onBack={() => navigate(-1)}
          rightAction={
            <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
              </svg>
            </button>
          }
        />
        {wish.tags?.[0] && (
          <div className="absolute top-20 left-5">
            <span className="text-xs font-bold px-3 py-1.5 rounded-full text-white"
              style={{ background: 'rgba(91,107,245,0.85)', backdropFilter: 'blur(8px)' }}>
              {wish.tags[0]}
            </span>
          </div>
        )}
      </div>

      {/* Contenu */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="flex-1 bg-white rounded-t-[28px] -mt-5 px-5 pt-6 flex flex-col gap-5 relative z-10"
      >
        {/* Titre */}
        <div>
          <h1 className="font-extrabold text-[#1A1A2E] text-2xl leading-tight mb-2">
            {wish.titre}
          </h1>
          <div className="flex items-center gap-4 text-xs text-[#8A8A9A] font-medium">
            <span className="flex items-center gap-1">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#8A8A9A">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z"/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
              </svg>
              {dist} km
            </span>
            <span className="flex items-center gap-1">
              <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#8A8A9A">
                <circle cx="12" cy="12" r="10" strokeWidth={2}/>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6l4 2"/>
              </svg>
              {timeAgo(wish.created_at)}
            </span>
            {wish.is_sponsored && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold"
                style={{ background: '#FFF4E0', color: '#F59E0B' }}>
                ✦ Sponsorisé
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <p className="text-[#4A4A5A] text-sm leading-relaxed">{wish.description}</p>

        {/* Wisher */}
        <div className="flex items-center gap-3 p-4 rounded-2xl bg-[#F7F8FC]">
          <Avatar user={wish.wisher} />
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[#1A1A2E] text-sm">{wish.wisher.prenom} {wish.wisher.nom}</p>
            <p className="text-xs text-[#8A8A9A]">Utilisateur</p>
          </div>
          <button
            onClick={handleMessage}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: '#EEF0FF' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
                stroke="#5B6BF5" strokeWidth="2" strokeLinejoin="round"/>
            </svg>
          </button>
          <button
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: '#E6FBF0' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.86 9.5a19.79 19.79 0 01-3.07-8.67A2 2 0 012.77 1h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.91 8.14a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 15.16z"
                stroke="#22C55E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Mots clefs */}
        {wish.tags?.length > 0 && (
          <div>
            <p className="text-sm font-bold text-[#1A1A2E] mb-3">Mots clefs</p>
            <div className="flex flex-wrap gap-2">
              {wish.tags.map((tag) => (
                <span key={tag} className="text-sm px-4 py-1.5 rounded-full border border-[#E0E0E0] text-[#1A1A2E]">
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Photos du voeu */}
        {wish.images?.length > 0 && (
          <div>
            <p className="text-sm font-bold text-[#1A1A2E] mb-3">Photos du voeu</p>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {wish.images.map((img, i) => (
                <div key={i} className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-[#F5F5F7]">
                  <img src={img.url} alt="" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Localisation */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-[#1A1A2E]">Localisation</p>
            <button
              onClick={() => openGoogleMaps(wish.latitude, wish.longitude)}
              className="text-xs font-semibold text-[#5B6BF5]">
              {t('maker.detail.ouvrir_map')}
            </button>
          </div>

          <div className="rounded-2xl overflow-hidden border border-[#E8E8E8]" style={{ height: 160 }}>
            <StaticMap lat={wish.latitude} lng={wish.longitude} />
          </div>

          <div className="flex items-center gap-2 mt-3">
            <svg width="14" height="14" fill="#5B6BF5" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
            </svg>
            <p className="text-xs text-[#8A8A9A] font-medium">{wish.adresse}</p>
          </div>
        </div>

        {/* CTA */}
        <div className="pt-2 pb-6">
          <Button onClick={() => navigate('/maker/success')}>
            {t('maker.detail.realiser')}
          </Button>
        </div>
      </motion.div>

      <BottomTabBar />
    </div>
  )
}
