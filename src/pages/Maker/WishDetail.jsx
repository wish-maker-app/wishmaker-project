import { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
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
import { supabase, withTimeout, ensureFreshSession } from '../../lib/supabase'
import { errorMessage } from '../../lib/uiError'
import { useWishes, getCachedWish } from '../../hooks/useWishes'
import { useMessages } from '../../hooks/useMessages'
import { formatLocation, fuzzyCoordinates, FUZZY_RADIUS_METERS } from '../../lib/geo'
import FavoriteButton from '../../components/ui/FavoriteButton'
import CategoryFallback from '../../components/ui/CategoryFallback'
import BottomSheet from '../../components/ui/BottomSheet'
import PaymentForm from '../../components/ui/PaymentForm'
import { applyPurchase } from '../../lib/stripe'

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
        radius={FUZZY_RADIUS_METERS}
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

  async function handleSubmit() {
    const raison = selectedReason === 'Autre' ? otherText : selectedReason
    if (!raison.trim()) return
    setSending(true)
    await onSubmit(raison)
    setSending(false)
    onClose()
  }

  return (
    <BottomSheet open={open} onClose={onClose} maxHeight="80vh">
        <h2 className="text-lg font-bold text-[#1A1A2E] mb-4">
          Signaler ce {type === 'voeu' ? 'vœu' : 'profil'}
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
    </BottomSheet>
  )
}

// Variants de stagger pour l'entrée des sections (alignés sur Recap.jsx)
const sectionVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.06 * i, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
  }),
}

export default function WishDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()
  const profile = useAuthStore((s) => s.profile)
  const authTick = useAuthStore((s) => s.authTick)
  const { getWishById, deleteWish, loading } = useWishes()
  const { createConversation, sendMessage } = useMessages()
  // Cache-first : si on a deja vu ce voeu (clic depuis un feed), on l'affiche
  // INSTANTANEMENT depuis le cache, sans spinner ni dependance reseau.
  const [wish, setWish] = useState(() => getCachedWish(id))
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
  const [showExtend, setShowExtend] = useState(false)

  // Parallax hero (comme sur Recap)
  const scrollRef = useRef(null)
  const HERO_H = 220
  const { scrollY } = useScroll({ container: scrollRef })
  const imgScale = useTransform(scrollY, [0, HERO_H], [1, 1.12])
  const imgOpacity = useTransform(scrollY, [0, HERO_H * 0.6], [1, 0.6])

  // Si le voeu est deja en cache → statut 'ok' direct (zero spinner).
  const [loadStatus, setLoadStatus] = useState(() => (getCachedWish(id) ? 'ok' : 'loading'))

  useEffect(() => {
    let stale = false
    let attempts = 0
    // hasCache : on a deja le voeu affiche (depuis le cache du feed). Dans ce
    // cas le refetch est SILENCIEUX (aucun spinner, aucun ecran d'erreur, aucun
    // reload) — exactement le pattern Instagram : contenu instantane, reseau en
    // fond. Le fallback "bloquant" (spinner/reload) ne sert que sans cache
    // (ouverture par URL directe / notif push).
    const hasCache = !!getCachedWish(id)
    if (!hasCache) setLoadStatus('loading')

    const tryLoad = () => {
      getWishById(id)
        .then((w) => {
          if (stale) return
          try { sessionStorage.removeItem('wd_auto_reload_ts') } catch {}
          if (!w) { if (!hasCache) setLoadStatus('not-found'); return }
          setWish(w)
          setLoadStatus('ok')
        })
        .catch((err) => {
          if (stale) return
          if (err?.code === 'PGRST116' || err?.message?.includes('not found')) {
            if (!hasCache) setLoadStatus('not-found')
            return
          }
          // On a deja du contenu en cache → echec SILENCIEUX, on garde l'affichage.
          // (connexion morte = on ne derange pas l'user, le prochain refresh reprendra)
          if (hasCache) {
            console.warn('[WishDetail] refresh en fond echoue, cache conserve:', err?.message)
            return
          }

          console.warn(`[WishDetail] echec chargement (essai ${attempts + 1})`, err?.message)
          // Pas de cache + QUERY_TIMEOUT = connexion HTTP/2 morte (retour
          // d'arriere-plan). Chrome reutilise la connexion morte → le seul
          // remede fiable est de recharger (nouvelles connexions). Garde
          // anti-boucle : 1 reload max / 30s.
          if (err?.message === 'QUERY_TIMEOUT') {
            let last = 0
            try { last = Number(sessionStorage.getItem('wd_auto_reload_ts') || 0) } catch {}
            if (Date.now() - last > 30000) {
              try { sessionStorage.setItem('wd_auto_reload_ts', String(Date.now())) } catch {}
              window.location.reload()
              return
            }
          }
          // Sinon : 1 retry rapide puis ecran d'erreur avec bouton Reessayer.
          if (attempts < 1) {
            attempts++
            setTimeout(() => { if (!stale) tryLoad() }, 500)
          } else {
            setLoadStatus('error')
          }
        })
    }
    tryLoad()

    return () => { stale = true }
  }, [id, authTick])
  // authTick : re-fetch quand on revient d'arriere-plan (window focus OU
  // visibilitychange bumpent authTick dans useAuth) → debloque les requetes
  // "fantomes" pausees pendant que la fenetre etait en arriere-plan.

  // ---- Fallbacks : pas de spinner infini ----
  if (loadStatus === 'loading' && !wish) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-[#5B6BF5] border-t-transparent animate-spin" />
      </div>
    )
  }
  if (loadStatus === 'not-found') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3 px-6 text-center">
        <span className="text-5xl mb-2">🔎</span>
        <h2 className="text-lg font-bold text-[#1A1A2E]">Vœu introuvable</h2>
        <p className="text-sm text-[#8A8A9A] max-w-xs">Ce vœu a peut-être été supprimé ou n'existe plus.</p>
        <button
          onClick={() => navigate(-1)}
          className="mt-4 h-11 px-6 rounded-full text-white font-bold text-sm"
          style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
        >
          Retour
        </button>
      </div>
    )
  }
  if (loadStatus === 'error') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3 px-6 text-center">
        <h2 className="text-lg font-bold text-[#1A1A2E]">Erreur de chargement</h2>
        <p className="text-sm text-[#8A8A9A] max-w-xs">Une erreur est survenue. Vérifie ta connexion et réessaie.</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 h-11 px-6 rounded-full text-white font-bold text-sm"
          style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
        >
          Réessayer
        </button>
      </div>
    )
  }
  if (!wish) return null

  const userLat = profile?.latitude || 43.6047
  const userLng = profile?.longitude || 1.4442
  const dist = distanceKm(userLat, userLng, wish.latitude, wish.longitude)

  const isOwner = searchParams.get('owner') === '1' || wish.wisher_id === profile?.id
  // Vœu déjà réalisé → plus de proposition possible (CTA masqués, badge gris).
  // Piloté par le statut du vœu lui-même → le check vaut pour TOUS les points
  // d'entrée (notif push, lien direct, partage, messagerie).
  const isCompleted = wish.statut === 'realise'
  // Vœu expiré → le propriétaire peut le prolonger (réactivation payante 0,99€),
  // tant qu'il n'a pas déjà été prolongé une fois.
  const isExpired = wish.statut === 'expire' ||
    (!!wish.expires_at && new Date(wish.expires_at).getTime() < Date.now())
  const canExtend = isOwner && isExpired && !wish.is_extended

  const heroImage = wish.images?.[0]?.url || null

  async function handleExtendSuccess(paymentIntent) {
    try {
      // apply-purchase vérifie le paiement côté serveur PUIS appelle extend_wish.
      await applyPurchase(paymentIntent.id)
      toast.success('Vœu prolongé ! 🎉')
      setShowExtend(false)
      const fresh = await getWishById(wish.id)
      if (fresh) setWish(fresh)
    } catch (err) {
      toast.error(errorMessage(err, 'Erreur lors de la prolongation'))
    }
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteWish(wish.id)
      toast.success('Vœu supprimé')
      navigate(-1)
    } catch (err) {
      toast.error(errorMessage(err, 'Erreur lors de la suppression'))
    } finally { setDeleting(false) }
  }

  async function handleMessage() {
    if (isCompleted) { toast.error('Ce vœu est déjà réalisé.'); return }
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
    <div ref={scrollRef} className="h-screen bg-[#F7F8FC] overflow-y-auto overflow-x-hidden">

      {/* Hero sticky parallax */}
      <div className="sticky top-0 z-0" style={{ height: HERO_H }}>
        {heroImage ? (
          <motion.div className="relative h-full bg-[#F0F0F5] overflow-hidden" style={{ scale: imgScale }}>
            <motion.img
              src={heroImage}
              alt=""
              className="w-full h-full object-cover"
              style={{ opacity: imgOpacity }}
            />
            <div className="absolute inset-0 pointer-events-none" style={{
              background: 'linear-gradient(to top, rgba(0,0,0,0.35) 0%, transparent 45%, rgba(0,0,0,0.15) 100%)',
            }} />
          </motion.div>
        ) : (
          <div className="relative h-full">
            <CategoryFallback slug={wish.category_slug} iconSize={96} />
          </div>
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
              <button onClick={() => setShowMenu(!showMenu)} className="w-10 h-10 rounded-full bg-black/20 backdrop-blur flex items-center justify-center">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                  <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
                </svg>
              </button>
              {showMenu && (
                <>
                  {/* Backdrop transparent pour fermer au clic extérieur */}
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 top-12 bg-white/80 backdrop-blur-xl rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.12)] py-1 min-w-[200px] z-50 overflow-hidden">
                  {isOwner ? (
                    <>
                      {canExtend && (
                        <button onClick={() => { setShowMenu(false); setShowExtend(true) }}
                          className="w-full px-4 py-3 text-left text-sm text-[#1A1A2E] active:bg-black/5 flex items-center gap-2.5 transition-colors">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8"/>
                            <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Prolonger le vœu
                        </button>
                      )}
                      {canExtend && <div className="mx-3 h-px bg-black/5" />}
                      {(wish.statut === 'en_attente' || wish.statut === 'en_cours') &&(
                        <button onClick={() => { setShowMenu(false); navigate(`/wisher/edit/${wish.id}`) }}
                          className="w-full px-4 py-3 text-left text-sm text-[#1A1A2E] active:bg-black/5 flex items-center gap-2.5 transition-colors">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Modifier ce vœu
                        </button>
                      )}
                      {(wish.statut === 'en_attente' || wish.statut === 'en_cours') &&<div className="mx-3 h-px bg-black/5" />}
                      <button onClick={() => { setShowMenu(false); setShowDeleteConfirm(true) }}
                        className="w-full px-4 py-3 text-left text-sm text-red-500 active:bg-red-50/60 flex items-center gap-2.5 transition-colors">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                        Supprimer ce vœu
                      </button>
                    </>
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
                </>
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

      {/* Contenu — scrolle par-dessus le hero */}
      <div className="relative z-10 -mt-5">
        <div className="bg-white rounded-t-[28px] pt-3 pb-32 flex flex-col">
          {/* Drag handle */}
          <div className="flex justify-center pb-2">
            <div className="w-8 h-1 rounded-full bg-[#D5D5DC]" />
          </div>

          <motion.div
            className="px-5 pt-3 flex flex-col gap-5"
          >
        {/* Titre */}
        <motion.div custom={0} initial="hidden" animate="visible" variants={sectionVariants}>
          <div className="flex items-start gap-3 mb-2">
            <h1 className="flex-1 font-extrabold text-[#1A1A2E] text-2xl leading-tight line-clamp-2 break-words">
              {wish.titre}
            </h1>
            <div className="flex-shrink-0 pt-0.5">
              <FavoriteButton wish={wish} variant="plain" size={20} />
            </div>
          </div>
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
          {/* Badge récompense + prestation */}
          {(wish.type_recompense || wish.prestation_type) && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {wish.type_recompense && (
                <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full"
                  style={wish.type_recompense === 'argent'
                    ? { background: '#ECFDF5', color: '#059669' }
                    : { background: '#EFF6FF', color: '#3B82F6' }
                  }>
                  Récompense : {wish.type_recompense === 'argent'
                    ? `${wish.montant_recompense ? wish.montant_recompense + '€' : 'Argent'}`
                    : 'Bon procédé'}
                </span>
              )}
              {wish.prestation_type === 'devis' && (
                <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full"
                  style={{ background: '#F3E8FF', color: '#7C3AED' }}>
                  Sur devis
                </span>
              )}
              {wish.prestation_type === 'budget' && wish.prestation_montant && (
                <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full"
                  style={{ background: '#F3E8FF', color: '#7C3AED' }}>
                  Budget : {wish.prestation_montant}€
                </span>
              )}
            </div>
          )}
        </motion.div>

        {/* Description */}
        <motion.p
          custom={1} initial="hidden" animate="visible" variants={sectionVariants}
          className="text-[#4A4A5A] text-sm leading-relaxed line-clamp-5 break-words"
        >{wish.description}</motion.p>

        {/* Wisher */}
        <motion.div
          custom={2} initial="hidden" animate="visible" variants={sectionVariants}
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
          {!isOwner && !isCompleted && (
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
        </motion.div>

        {/* Mots clefs */}
        {wish.tags?.length > 0 && (
          <motion.div custom={3} initial="hidden" animate="visible" variants={sectionVariants}>
            <p className="text-sm font-bold text-[#1A1A2E] mb-3">Mots clefs</p>
            <div className="flex flex-wrap gap-2">
              {wish.tags.map((tag) => (
                <span key={tag} className="text-sm px-4 py-1.5 rounded-full border border-[#E0E0E0] text-[#1A1A2E]">
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Photos du voeu */}
        {wish.images?.length > 0 && (
          <motion.div custom={4} initial="hidden" animate="visible" variants={sectionVariants}>
            <p className="text-sm font-bold text-[#1A1A2E] mb-3">Photos du voeu</p>
            <div className="flex gap-3 overflow-x-auto pb-1">
              {wish.images.map((img, i) => (
                <div key={i} className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0 bg-[#F5F5F7] cursor-pointer" onClick={() => setLightboxIndex(i)}>
                  <img src={img.url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Localisation */}
        <motion.div custom={5} initial="hidden" animate="visible" variants={sectionVariants}>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-[#1A1A2E]">Localisation</p>
            <button
              onClick={() => {
                const [fLat, fLng] = fuzzyCoordinates(wish.latitude, wish.longitude, wish.id)
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

          <p className="text-xs text-[#8A8A9A] font-medium mt-3">Localisation approximative · {formatLocation(wish)}</p>
        </motion.div>

        {/* CTA — selon l'état : réalisé (badge) / expiré+proprio (Prolonger) /
            expiré (badge) / réaliser (Maker). Rien si c'est ton vœu encore actif. */}
        {isCompleted ? (
          <motion.div custom={6} initial="hidden" animate="visible" variants={sectionVariants} className="pt-2">
            <div className="flex items-center justify-center gap-2 h-12 rounded-full bg-[#F0F0F2] text-[#8A8A9A] font-bold text-sm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="#8A8A9A" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              {t('maker.detail.deja_realise', 'Vœu déjà réalisé')}
            </div>
          </motion.div>
        ) : canExtend ? (
          <motion.div custom={6} initial="hidden" animate="visible" variants={sectionVariants} className="pt-2">
            <Button onClick={() => setShowExtend(true)}>
              Prolonger le vœu
            </Button>
          </motion.div>
        ) : isExpired ? (
          <motion.div custom={6} initial="hidden" animate="visible" variants={sectionVariants} className="pt-2">
            <div className="flex items-center justify-center gap-2 h-12 rounded-full bg-[#F0F0F2] text-[#8A8A9A] font-bold text-sm">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="9" stroke="#8A8A9A" strokeWidth="2"/>
                <path d="M12 7v5l3 2" stroke="#8A8A9A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Vœu expiré
            </div>
          </motion.div>
        ) : !isOwner ? (
          <motion.div custom={6} initial="hidden" animate="visible" variants={sectionVariants} className="pt-2">
            <Button onClick={() => setShowProposal(true)}>
              {t('maker.detail.realiser')}
            </Button>
          </motion.div>
        ) : null}
          </motion.div>
        </div>
      </div>

      {/* Bottom sheet — Proposer de réaliser */}
      <BottomSheet open={showProposal} onClose={() => setShowProposal(false)}>
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
                  <p className="text-xs text-[#8A8A9A] mt-0.5">{formatLocation(wish)}</p>
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
                    toast.error(errorMessage(err, 'Erreur'))
                  } finally { setSendingProposal(false) }
                }}
                disabled={sendingProposal}
                className="w-full h-12 rounded-full text-white font-bold text-sm disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
              >
                {sendingProposal ? 'Envoi...' : 'Envoyer ma proposition'}
              </button>
              <button onClick={() => setShowProposal(false)} className="w-full mt-3 text-sm text-[#8A8A9A] text-center">Annuler</button>
      </BottomSheet>

      {/* Bottom sheet — Prolonger le vœu (réactivation payante 0,99€) */}
      <BottomSheet open={showExtend} onClose={() => setShowExtend(false)}>
        <div className="text-center mb-5">
          <h2 className="text-lg font-bold text-[#1A1A2E]">Prolonger ce vœu</h2>
          <p className="text-sm text-[#8A8A9A] mt-1">Réactive ton vœu et lui redonne une durée de vie.</p>
        </div>
        <PaymentForm
          type="extension"
          wish_id={wish.id}
          onSuccess={handleExtendSuccess}
          onCancel={() => setShowExtend(false)}
          submitLabel="Payer 0,99€"
        />
      </BottomSheet>

      {/* Modal suppression */}
      <BottomSheet open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)}>
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
      </BottomSheet>

      {/* Modals signalement */}
      <AnimatePresence>
        {showReportWish && (
          <ReportModal
            open
            type="voeu"
            reasons={REPORT_REASONS_WISH}
            onClose={() => setShowReportWish(false)}
            onSubmit={async (raison) => {
              try {
                // Session + timeout : évite le « Envoi... » bloqué à vie si la
                // requête hang après un retour d'arrière-plan (PWA).
                const session = await ensureFreshSession()
                if (!session) { toast.error('Connexion expirée, réessaie.'); return }
                const { error } = await withTimeout(supabase.from('reports').insert({
                  reporter_id: profile.id,
                  reported_wish_id: wish.id,
                  reported_user_id: wish.wisher.id,
                  type: 'voeu',
                  raison,
                }))
                if (error) throw error
              } catch (err) {
                toast.error("Impossible d'envoyer le signalement. Réessayez plus tard.")
                console.error('[report wish] error:', err)
                return
              }
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
              try {
                const session = await ensureFreshSession()
                if (!session) { toast.error('Connexion expirée, réessaie.'); return }
                const { error } = await withTimeout(supabase.from('reports').insert({
                  reporter_id: profile.id,
                  reported_user_id: wish.wisher.id,
                  type: 'profil',
                  raison,
                }))
                if (error) throw error
              } catch (err) {
                toast.error("Impossible d'envoyer le signalement. Réessayez plus tard.")
                console.error('[report profile] error:', err)
                return
              }
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
                        radius={FUZZY_RADIUS_METERS}
                        pathOptions={{ color: '#5B6BF5', fillColor: '#5B6BF5', fillOpacity: 0.12, weight: 2 }}
                      />
                      <Marker position={[fLat, fLng]} icon={pinIcon} />
                    </MapContainer>
                  )
                })()}
              </div>
              {/* Adresse en bas */}
              <div className="px-5 py-4 bg-white border-t border-[#F0F0F0]">
                <p className="text-sm font-medium text-[#1A1A2E]">{formatLocation(wish)}</p>
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
