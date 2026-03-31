import { useState, useEffect } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { MapContainer, TileLayer, Marker, Circle, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import Header from '../../components/layout/Header'
import Button from '../../components/ui/Button'
import AccountTypeBadge from '../../components/ui/AccountTypeBadge'
import BottomTabBar from '../../components/layout/BottomTabBar'
import useAuthStore from '../../store/authStore'
import { supabase } from '../../lib/supabase'
import { useWishes } from '../../hooks/useWishes'
import { useMessages } from '../../hooks/useMessages'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const pinIcon = L.divIcon({
  html: `<div style="width:16px;height:16px;border-radius:50%;background:linear-gradient(135deg,#5B6BF5,#9B59F5);border:2px solid white;box-shadow:0 2px 6px rgba(91,107,245,0.4);"></div>`,
  className: '',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
})

// Génère des coordonnées floues déterministes basées sur l'ID du vœu
function seededRandom(seed) {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0
  }
  return ((h & 0x7fffffff) % 10000) / 10000
}

function fuzzyCoordinates(lat, lng, id, radiusMeters = 400) {
  const latOffset = (seededRandom(id + 'lat') - 0.5) * (radiusMeters / 111320)
  const lngOffset = (seededRandom(id + 'lng') - 0.5) * (radiusMeters / (111320 * Math.cos(lat * Math.PI / 180)))
  return [lat + latOffset, lng + lngOffset]
}

function StaticMap({ lat, lng, wishId }) {
  const [fuzzyLat, fuzzyLng] = fuzzyCoordinates(lat, lng, wishId)

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
      center={[fuzzyLat, fuzzyLng]}
      zoom={13}
      zoomControl={false}
      style={{ width: '100%', height: '100%' }}
      attributionControl={false}
    >
      <MapSetup />
      <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
      <Circle
        center={[fuzzyLat, fuzzyLng]}
        radius={400}
        pathOptions={{ color: '#5B6BF5', fillColor: '#5B6BF5', fillOpacity: 0.12, weight: 2 }}
      />
      <Marker position={[fuzzyLat, fuzzyLng]} icon={pinIcon} />
    </MapContainer>
  )
}

function Avatar({ user, size = 48 }) {
  const initials = `${user.prenom?.[0] || ''}${user.nom?.[0] || ''}`
  return (
    <div className="relative flex-shrink-0">
      {user.avatar_url ? (
        <img src={user.avatar_url} alt="" className="rounded-full object-cover"
          style={{ width: size, height: size }} />
      ) : (
        <div className="rounded-full flex items-center justify-center font-bold text-white"
          style={{ width: size, height: size, background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)', fontSize: size * 0.28 }}>
          {initials}
        </div>
      )}
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

const REPORT_REASONS_WISH = ['Contenu inapproprié', 'Arnaque potentielle', 'Doublon', 'Autre']
const REPORT_REASONS_PROFILE = ['Faux profil', 'Comportement inapproprié', 'Spam', 'Autre']

function ReportModal({ open, onClose, type, reasons, onSubmit }) {
  const [selectedReason, setSelectedReason] = useState('')
  const [otherText, setOtherText] = useState('')
  const [sending, setSending] = useState(false)

  if (!open) return null

  async function handleSubmit() {
    const raison = selectedReason === 'Autre' ? otherText : selectedReason
    if (!raison.trim()) return
    setSending(true)
    await onSubmit(raison)
    setSending(false)
    onClose()
  }

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose} className="fixed inset-0 bg-black/40 z-[900] overlay-backdrop" />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[28px] z-[901] px-5 pb-8 pt-4 max-h-[80vh] overflow-y-auto bottom-sheet"
      >
        <div className="w-10 h-1 rounded-full bg-[#E0E0E0] mx-auto mb-4" />
        <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">
          🚩 Signaler ce {type === 'voeu' ? 'vœu' : 'profil'}
        </h2>
        <div className="flex flex-col gap-2 mb-4">
          {reasons.map((reason) => (
            <button
              key={reason}
              onClick={() => setSelectedReason(reason)}
              className="flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left"
              style={selectedReason === reason
                ? { borderColor: '#5B6BF5', background: '#EEF0FF' }
                : { borderColor: '#F0F0F0' }
              }
            >
              <span className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedReason === reason ? 'border-[#5B6BF5]' : 'border-[#D0D0D0]'}`}>
                {selectedReason === reason && <span className="w-2 h-2 rounded-full bg-[#5B6BF5]" />}
              </span>
              <span className="text-sm text-[#1A1A2E]">{reason}</span>
            </button>
          ))}
        </div>
        {selectedReason === 'Autre' && (
          <textarea
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
            placeholder="Décrivez la raison..."
            rows={3}
            className="w-full bg-[#F7F8FC] rounded-2xl px-4 py-3 text-sm text-[#1A1A2E] outline-none resize-none mb-4"
          />
        )}
        <button
          onClick={handleSubmit}
          disabled={sending || (!selectedReason || (selectedReason === 'Autre' && !otherText.trim()))}
          className="w-full h-12 rounded-full text-white font-bold text-sm disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg,#EF4444,#DC2626)' }}
        >
          {sending ? 'Envoi...' : 'Envoyer le signalement'}
        </button>
      </motion.div>
    </>
  )
}

export default function WishDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const profile = useAuthStore((s) => s.profile)
  const { getWishById, deleteWish, loading } = useWishes()
  const { createConversation, sendMessage } = useMessages()
  const [wish, setWish] = useState(null)
  const [showMenu, setShowMenu] = useState(false)
  const [showReportWish, setShowReportWish] = useState(false)
  const [showReportProfile, setShowReportProfile] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showProposal, setShowProposal] = useState(false)
  const [showFullMap, setShowFullMap] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [proposalMsg, setProposalMsg] = useState('')
  const [sendingProposal, setSendingProposal] = useState(false)

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

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteWish(wish.id)
      toast.success('Vœu supprimé')
      navigate(-1)
    } catch (err) {
      toast.error(err.message || 'Erreur lors de la suppression')
    } finally { setDeleting(false) }
  }

  async function handleMessage() {
    try {
      // Vérifier si une conversation existe déjà
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('wish_id', wish.id)
        .eq('maker_id', profile.id)
        .single()

      if (existing) {
        navigate(`/messages/${existing.id}`)
      } else {
        // Pas de conversation existante — ouvrir le chat en mode brouillon
        navigate(`/messages/new?wishId=${wish.id}&wisherId=${wish.wisher_id}`)
      }
    } catch (err) {
      // .single() throws si pas de résultat — c'est normal, on ouvre en mode brouillon
      navigate(`/messages/new?wishId=${wish.id}&wisherId=${wish.wisher_id}`)
    }
  }

  return (
    <div className="h-screen bg-white flex flex-col overflow-y-auto">

      {/* Hero */}
      <div className="relative flex-shrink-0" style={{ height: 220 }}>
        {heroImage ? (
          <img src={heroImage} alt="" className="w-full h-full object-cover cursor-pointer" onClick={() => setLightboxIndex(0)} />
        ) : (
          <div className="w-full h-full"
            style={{ background: 'linear-gradient(160deg,#5B6BF5 0%,#9B59F5 100%)' }} />
        )}
        <Header transparent onBack={() => {
            const fromView = searchParams.get('from')
            if (fromView) {
              navigate(`/maker?view=${fromView}`)
            } else {
              navigate(-1)
            }
          }}
          rightAction={
            <div className="relative">
              <button onClick={() => setShowMenu(!showMenu)} className="w-10 h-10 rounded-full bg-white/20 backdrop-blur flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                </svg>
              </button>
              {showMenu && (
                <div className="absolute right-0 top-12 bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.12)] py-1 min-w-[200px] z-50 overflow-hidden">
                  {isOwner ? (
                    <button onClick={() => { setShowMenu(false); setShowDeleteConfirm(true) }}
                      className="w-full px-4 py-3 text-left text-sm text-red-500 active:bg-red-50/60 flex items-center gap-2.5 transition-colors">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Supprimer ce vœu
                    </button>
                  ) : (
                    <>
                      <button onClick={() => { setShowMenu(false); setShowReportWish(true) }}
                        className="w-full px-4 py-3 text-left text-sm text-[#1A1A2E] active:bg-black/5 flex items-center gap-2.5 transition-colors">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          <line x1="4" y1="22" x2="4" y2="15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                        </svg>
                        Signaler ce vœu
                      </button>
                      <div className="mx-3 h-px bg-black/5" />
                      <button onClick={() => { setShowMenu(false); setShowReportProfile(true) }}
                        className="w-full px-4 py-3 text-left text-sm text-[#1A1A2E] active:bg-black/5 flex items-center gap-2.5 transition-colors">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          <line x1="4" y1="22" x2="4" y2="15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                        </svg>
                        Signaler ce profil
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          }
        />
{/* Rating badge désactivé pour l'instant
        {wish.tags?.[0] && (
          <div className="absolute top-20 left-5">
            <span className="text-xs font-bold px-3 py-1.5 rounded-full text-white"
              style={{ background: 'rgba(91,107,245,0.85)', backdropFilter: 'blur(8px)' }}>
              {wish.tags[0]}
            </span>
          </div>
        )}
*/}
      </div>

      {/* Contenu */}
      <motion.div
        initial={{ y: 30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="flex-1 bg-white rounded-t-[28px] -mt-5 px-5 pt-6 pb-32 flex flex-col gap-5 relative z-10"
      >
        {/* Titre */}
        <div>
          <h1 className="font-extrabold text-[#1A1A2E] text-2xl leading-tight mb-2 line-clamp-2 break-words">
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
          {/* Expiration */}
          {(() => {
            const exp = expirationInfo(wish.expires_at)
            if (!exp) return null
            return (
              <div className="flex items-center gap-1.5 mt-2">
                <span className="w-2 h-2 rounded-full" style={{ background: exp.color }} />
                <span className="text-xs font-semibold" style={{ color: exp.color }}>{exp.label}</span>
              </div>
            )
          })()}
          {/* Badge récompense */}
          {wish.type_recompense && (
            <div className="mt-2">
              <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full"
                style={wish.type_recompense === 'argent'
                  ? { background: '#ECFDF5', color: '#059669' }
                  : { background: '#EFF6FF', color: '#3B82F6' }
                }>
                {wish.type_recompense === 'argent'
                  ? `${wish.montant_recompense ? wish.montant_recompense + '€' : 'Argent'}`
                  : 'Bon procédé'}
              </span>
            </div>
          )}
        </div>

        {/* Description */}
        <p className="text-[#4A4A5A] text-sm leading-relaxed line-clamp-5 break-words">{wish.description}</p>

        {/* Wisher */}
        <div
          onClick={() => !isOwner && navigate(`/maker/user/${wish.wisher.id}`)}
          className={`flex items-center gap-3 p-4 rounded-2xl bg-[#F7F8FC] ${!isOwner ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''}`}
        >
          <Avatar user={wish.wisher} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-bold text-[#1A1A2E] text-sm">{wish.wisher.prenom}</p>
              <AccountTypeBadge type={wish.wisher.type_compte} />
            </div>
            <p className="text-xs text-[#8A8A9A]">
              {wish.wisher.pseudo || `user_${(wish.wisher.id || '0000').slice(0, 4)}`}
            </p>
          </div>
          {!isOwner && (
              <button
                onClick={(e) => { e.stopPropagation(); handleMessage() }}
                className="w-10 h-10 rounded-full flex items-center justify-center"
                style={{ background: '#EEF0FF' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
                    stroke="#5B6BF5" strokeWidth="2" strokeLinejoin="round"/>
                </svg>
              </button>
          )}
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
                <div key={i} className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-[#F5F5F7] cursor-pointer" onClick={() => setLightboxIndex(i)}>
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
              onClick={() => {
                const [fLat, fLng] = fuzzyCoordinates(wish.latitude, wish.longitude, wish.id, 300)
                window.open(`https://www.google.com/maps?q=${fLat},${fLng}`, '_blank')
              }}
              className="text-xs font-semibold text-[#5B6BF5]">
              Ouvrir dans Maps
            </button>
          </div>

          <div
            onClick={() => setShowFullMap(true)}
            className="rounded-2xl overflow-hidden border border-[#E8E8E8] cursor-pointer active:scale-[0.99] transition-transform"
            style={{ height: 160 }}>
            <StaticMap lat={wish.latitude} lng={wish.longitude} wishId={wish.id} />
          </div>

          <p className="text-xs text-[#8A8A9A] font-medium mt-3">Localisation approximative · {wish.adresse}</p>
        </div>

        {/* CTA — masqué si c'est ton propre vœu */}
        {!isOwner && (
          <div className="pt-2">
            <Button onClick={() => setShowProposal(true)}>
              {t('maker.detail.realiser')}
            </Button>
          </div>
        )}
      </motion.div>

      {/* Bottom sheet — Proposer de réaliser */}
      <AnimatePresence>
        {showProposal && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowProposal(false)} className="fixed inset-0 bg-black/40 z-[900] overlay-backdrop" />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[28px] z-[901] px-5 pb-8 pt-4 bottom-sheet"
            >
              <div className="w-10 h-1 rounded-full bg-[#E0E0E0] mx-auto mb-5" />

              {/* Récap du voeu */}
              <div className="flex items-center gap-3 p-3 rounded-2xl bg-[#F7F8FC] mb-5">
                {wish.images?.[0]?.url ? (
                  <img src={wish.images[0].url} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                ) : (
                  <div className="w-14 h-14 rounded-xl flex-shrink-0 flex items-center justify-center"
                    style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}>
                    <span className="text-white text-lg">✨</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#1A1A2E] text-sm truncate">{wish.titre}</p>
                  <p className="text-xs text-[#8A8A9A] mt-0.5">{wish.adresse}</p>
                  {wish.type_recompense && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full mt-1"
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

              {/* Destinataire */}
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                  {wish.wisher?.avatar_url ? (
                    <img src={wish.wisher.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold"
                      style={{ background: 'linear-gradient(135deg,#8A8A9A,#B0B0B0)' }}>
                      {wish.wisher?.prenom?.[0]}{wish.wisher?.nom?.[0]}
                    </div>
                  )}
                </div>
                <p className="text-sm text-[#8A8A9A]">
                  Message à <span className="font-semibold text-[#5B6BF5]">{wish.wisher?.pseudo || `user_${(wish.wisher?.id || '0000').slice(0, 4)}`}</span>
                </p>
              </div>

              {/* Champ message */}
              <textarea
                value={proposalMsg}
                onChange={(e) => setProposalMsg(e.target.value)}
                placeholder={`Bonjour ${wish.wisher?.prenom || ''}, je serais ravi(e) de réaliser votre vœu ! Quand est-ce que cela vous arrangerait ?`}
                rows={4}
                className="w-full bg-[#F7F8FC] rounded-2xl px-4 py-3 text-sm text-[#1A1A2E] outline-none resize-none mb-5 placeholder:text-[#B0B0B0]"
              />

              {/* Boutons */}
              <button
                onClick={async () => {
                  setSendingProposal(true)
                  try {
                    const message = proposalMsg.trim() || `Bonjour ${wish.wisher?.prenom || ''}, je serais ravi(e) de réaliser votre vœu !`
                    const convId = await createConversation(wish.id, wish.wisher_id)
                    await sendMessage(convId, message)
                    toast.success('Proposition envoyée !')
                    navigate(`/messages/${convId}`)
                  } catch (err) {
                    toast.error(err.message || 'Erreur')
                  } finally { setSendingProposal(false) }
                }}
                disabled={sendingProposal}
                className="w-full h-12 rounded-full text-white font-bold text-sm disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
              >
                {sendingProposal ? 'Envoi...' : 'Envoyer ma proposition'}
              </button>
              <button onClick={() => setShowProposal(false)} className="w-full mt-3 text-sm text-[#8A8A9A] text-center">Annuler</button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modal suppression */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowDeleteConfirm(false)} className="fixed inset-0 bg-black/40 z-[900] overlay-backdrop" />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[28px] z-[901] px-5 pb-8 pt-4 bottom-sheet"
            >
              <div className="w-10 h-1 rounded-full bg-[#E0E0E0] mx-auto mb-4" />
              <h2 className="text-lg font-bold text-[#1A1A2E] mb-2">Supprimer ce vœu ?</h2>
              <p className="text-sm text-[#8A8A9A] mb-5">Cette action est irréversible. Le vœu et toutes ses données seront supprimés définitivement.</p>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="w-full h-12 rounded-full text-white font-bold text-sm disabled:opacity-50"
                style={{ background: '#EF4444' }}
              >
                {deleting ? 'Suppression...' : 'Supprimer'}
              </button>
              <button onClick={() => setShowDeleteConfirm(false)} className="w-full mt-3 text-sm text-[#8A8A9A] text-center">Annuler</button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Modals signalement */}
      <AnimatePresence>
        {showReportWish && (
          <ReportModal
            open
            type="voeu"
            reasons={REPORT_REASONS_WISH}
            onClose={() => setShowReportWish(false)}
            onSubmit={async (raison) => {
              await supabase.from('reports').insert({
                reporter_id: profile.id,
                reported_wish_id: wish.id,
                reported_user_id: wish.wisher.id,
                type: 'voeu',
                raison,
              })
              toast.success('Signalement envoyé, merci !')
            }}
          />
        )}
        {showReportProfile && (
          <ReportModal
            open
            type="profil"
            reasons={REPORT_REASONS_PROFILE}
            onClose={() => setShowReportProfile(false)}
            onSubmit={async (raison) => {
              await supabase.from('reports').insert({
                reporter_id: profile.id,
                reported_user_id: wish.wisher.id,
                type: 'profil',
                raison,
              })
              toast.success('Signalement envoyé, merci !')
            }}
          />
        )}
      </AnimatePresence>

      {/* Carte plein écran */}
      <AnimatePresence>
        {showFullMap && wish && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[950]"
              onClick={() => setShowFullMap(false)}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="fixed inset-0 z-[951] bg-white flex flex-col"
            >
              {/* Header carte */}
              <div className="flex items-center justify-between px-4 pt-14 pb-3 bg-white border-b border-[#F0F0F0]">
                <button onClick={() => setShowFullMap(false)} className="w-10 h-10 flex items-center justify-center">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                    <path d="M18 6L6 18M6 6l12 12" stroke="#1A1A2E" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
                <p className="text-sm font-bold text-[#1A1A2E]">Localisation approximative</p>
                <div className="w-10" />
              </div>
              {/* Carte interactive */}
              <div className="flex-1">
                {(() => {
                  const [fLat, fLng] = fuzzyCoordinates(wish.latitude, wish.longitude, wish.id)
                  return (
                    <MapContainer
                      center={[fLat, fLng]}
                      zoom={14}
                      zoomControl={false}
                      style={{ width: '100%', height: '100%' }}
                      attributionControl={false}
                    >
                      <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
                      <Circle
                        center={[fLat, fLng]}
                        radius={400}
                        pathOptions={{ color: '#5B6BF5', fillColor: '#5B6BF5', fillOpacity: 0.12, weight: 2 }}
                      />
                      <Marker position={[fLat, fLng]} icon={pinIcon} />
                    </MapContainer>
                  )
                })()}
              </div>
              {/* Adresse en bas */}
              <div className="px-5 py-4 bg-white border-t border-[#F0F0F0]">
                <p className="text-sm font-medium text-[#1A1A2E]">{wish.adresse}</p>
                <p className="text-xs text-[#8A8A9A] mt-1">Localisation approximative · Zone de ~400m</p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Lightbox photos */}
      <AnimatePresence>
        {lightboxIndex !== null && wish?.images?.length > 0 && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/90 z-[960]"
              onClick={() => setLightboxIndex(null)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="fixed inset-0 z-[961] flex flex-col items-center justify-center"
            >
              {/* Bouton fermer */}
              <button
                onClick={() => setLightboxIndex(null)}
                className="absolute top-12 right-4 w-10 h-10 rounded-full bg-white/15 backdrop-blur flex items-center justify-center z-10"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>

              {/* Compteur */}
              <p className="absolute top-14 left-0 right-0 text-center text-white/70 text-sm font-medium">
                {lightboxIndex + 1} / {wish.images.length}
              </p>

              {/* Image */}
              <motion.img
                key={lightboxIndex}
                src={wish.images[lightboxIndex]?.url}
                alt=""
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -50 }}
                className="max-w-[90vw] max-h-[75vh] object-contain rounded-2xl"
                onClick={(e) => e.stopPropagation()}
              />

              {/* Navigation */}
              {wish.images.length > 1 && (
                <div className="flex gap-4 mt-6">
                  <button
                    onClick={() => setLightboxIndex((prev) => (prev - 1 + wish.images.length) % wish.images.length)}
                    className="w-12 h-12 rounded-full bg-white/15 backdrop-blur flex items-center justify-center"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M15 19l-7-7 7-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <button
                    onClick={() => setLightboxIndex((prev) => (prev + 1) % wish.images.length)}
                    className="w-12 h-12 rounded-full bg-white/15 backdrop-blur flex items-center justify-center"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      <path d="M9 5l7 7-7 7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <BottomTabBar />
    </div>
  )
}
