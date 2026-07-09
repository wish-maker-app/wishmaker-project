import { useNavigate, useSearchParams } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { motion } from 'framer-motion'
import { MapContainer, TileLayer, Circle, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import Header from '../../components/layout/Header'
import KeywordPicker from '../../components/ui/KeywordPicker'
import useMakerStore from '../../store/makerStore'
import useAuthStore from '../../store/authStore'

// Icônes SVG trait pour les options de tri (cohérent avec l'iconographie du produit)
const IconZap = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
)
const IconPin = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0116 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)
const IconClock = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
)

const SORT_OPTIONS = [
  { id: 'urgent', label: 'Urgent', Icon: IconZap },
  { id: 'distance', label: 'Distance', Icon: IconPin },
  { id: 'recent', label: 'Récents', Icon: IconClock },
]

// Paliers de distance (à la TooGoodToGo / Leboncoin) — plus clean qu'un slider
// libre. Le palier 100 représente "illimité".
const DISTANCE_STEPS = [
  { value: 1, label: '1 km' },
  { value: 2, label: '2 km' },
  { value: 5, label: '5 km' },
  { value: 10, label: '10 km' },
  { value: 20, label: '20 km' },
  { value: 50, label: '50 km' },
  { value: 100, label: 'Illimité' },
]

// Icône close pour la chip ville
const IconX = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
)

// Zoom initial (entier) — approximatif, sera affiné par fitBounds.
function zoomForRadius(radiusKm) {
  if (radiusKm <= 1) return 12
  if (radiusKm <= 2) return 11
  if (radiusKm <= 5) return 10
  if (radiusKm <= 10) return 9
  if (radiusKm <= 20) return 8
  if (radiusKm <= 50) return 7
  return 6
}

// Calcule précisément le zoom Leaflet pour que le cercle du rayon occupe
// un POURCENTAGE de la largeur visible de la map (responsive : donne le même
// rendu quelle que soit la taille d'écran).
const CIRCLE_WIDTH_RATIO = 0.65 // 65% de la largeur map (ajuste ici)

function computeZoom(mapSizePx, radiusKm, lat) {
  // Le cercle est rond en pixels (Web Mercator) — on le dimensionne par
  // rapport à la PLUS PETITE dimension du cadre, sinon il déborde en hauteur
  // quand le cadre est plus large que haut (cas courant ici : 180px de haut).
  const targetSizePx = Math.max(100, Math.min(mapSizePx.x, mapSizePx.y) * CIRCLE_WIDTH_RATIO)
  const earthCirc = 156543.03 * Math.cos((lat * Math.PI) / 180)
  const diameterM = 2 * radiusKm * 1000
  return Math.log2((earthCirc * targetSizePx) / diameterM)
}

function MapAutoFit({ center, radiusKm }) {
  const map = useMap()
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 100)
  }, [map])
  useEffect(() => {
    if (!center) return
    if (radiusKm >= 100) {
      map.flyTo(center, 6, { duration: 0.4 })
      return
    }
    // taille réelle du map container (en px) — après invalidateSize
    const size = map.getSize()
    const zoom = computeZoom(size, radiusKm, center[0])
    map.flyTo(center, zoom, { duration: 0.4 })
  }, [map, center, radiusKm])
  return null
}

export default function Filters() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const fromView = searchParams.get('from') || 'liste'
  const profile = useAuthStore((s) => s.profile)
  const {
    sortBy, setSortBy,
    maxDistance, setMaxDistance,
    selectedTagIds, setSelectedTagIds,
    resetFilters,
  } = useMakerStore()

  // currentLocation = position GPS du user (cliqué sur le bouton géoloc).
  // Si défini, prend priorité sur la ville du profil.
  const [currentLocation, setCurrentLocation] = useState(null) // { lat, lng, label }
  const [locating, setLocating] = useState(false)

  // Centre de la map : géoloc actuelle > ville du user > fallback Toulouse
  const userCenter = currentLocation
    ? [currentLocation.lat, currentLocation.lng]
    : (profile?.latitude && profile?.longitude)
      ? [profile.latitude, profile.longitude]
      : [43.6047, 1.4442]
  const cityLabel = currentLocation?.label || profile?.ville || 'Ma position'

  function handleLocate() {
    if (!navigator.geolocation) {
      toast.error('Géolocalisation non supportée')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude, longitude } = coords
        // Reverse-geocoding via Nominatim pour récupérer un label lisible
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
            { headers: { 'Accept-Language': 'fr' } }
          )
          const data = await res.json()
          const label = data.address?.city
            || data.address?.town
            || data.address?.village
            || data.address?.municipality
            || 'Ma position'
          setCurrentLocation({ lat: latitude, lng: longitude, label })
          toast.success(`Localisé sur ${label}`)
        } catch {
          setCurrentLocation({ lat: latitude, lng: longitude, label: 'Ma position' })
          toast.success('Localisation réussie')
        } finally {
          setLocating(false)
        }
      },
      () => {
        toast.error('Impossible d\'obtenir votre position')
        setLocating(false)
      },
      { enableHighAccuracy: false, maximumAge: 60000, timeout: 10000 }
    )
  }

  function handleApply() {
    navigate(`/maker?view=${fromView}`, { replace: true })
  }

  const activeCount =
    (sortBy ? 1 : 0) +
    (maxDistance !== 100 ? 1 : 0) +
    (selectedTagIds.length > 0 ? 1 : 0)

  return (
    <div className="h-screen bg-white flex flex-col relative">
      <Header
        title="Filtres"
        onBack={() => navigate(-1)}
        rightAction={
          activeCount > 0 ? (
            <button onClick={resetFilters} className="text-xs font-semibold text-[#5B6BF5]">
              Réinitialiser
            </button>
          ) : null
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 px-5 pt-3 pb-36 flex flex-col gap-7 overflow-y-auto"
      >
        {/* ─────────── Section 1 : Trier par ─────────── */}
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-[15px] font-bold text-[#1A1A2E] tracking-[-0.01em]">Trier par</h2>
            {sortBy && (
              <button onClick={() => setSortBy(null)} className="text-xs font-semibold text-[#8A8A9A]">
                Effacer
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {SORT_OPTIONS.map((opt) => {
              const active = sortBy === opt.id
              return (
                <motion.button
                  key={opt.id}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setSortBy(active ? null : opt.id)}
                  className="h-[52px] rounded-2xl text-[13px] font-semibold transition-all flex items-center justify-center gap-1.5"
                  style={active
                    ? {
                        background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)',
                        color: '#fff',
                        border: '1.5px solid transparent',
                        boxShadow: '0 6px 16px rgba(91,107,245,0.25)',
                      }
                    : {
                        background: '#fff',
                        color: '#1A1A2E',
                        border: '1.5px solid #EEEEF2',
                      }
                  }
                >
                  <opt.Icon size={16} />
                  {opt.label}
                </motion.button>
              )
            })}
          </div>
        </section>

        {/* ─────────── Section 2 : Localisation + rayon (type Leboncoin) ─────────── */}
        <section>
          {/* Chip ville + bouton géoloc */}
          <div className="mb-3 flex items-center gap-2">
            <div
              className="inline-flex items-center gap-2 rounded-full pl-3 pr-1 h-9"
              style={{
                background: '#EAEDFF',
                border: '1px solid #D4DAFF',
              }}
            >
              <span className="text-[13px] font-semibold text-[#2A337A]">{cityLabel}</span>
              <button
                onClick={() => setMaxDistance(100)}
                className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-white/60 transition-colors"
                style={{ color: '#5B6BF5' }}
                aria-label="Désactiver le filtre de distance"
              >
                <IconX size={13} />
              </button>
            </div>
            {/* Bouton géolocalisation : centre la map sur la position GPS actuelle */}
            <button
              onClick={handleLocate}
              disabled={locating}
              className="w-9 h-9 rounded-full flex items-center justify-center shadow-sm disabled:opacity-60 active:scale-95 transition-transform"
              style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
              aria-label="Me localiser"
              title="Utiliser ma position actuelle"
            >
              {locating ? (
                <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="3"/>
                  <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
              ) : (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/>
                  <path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
                </svg>
              )}
            </button>
          </div>

          {/* Titre + valeur actuelle */}
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-[15px] font-bold text-[#1A1A2E] tracking-[-0.01em]">Dans un rayon de</h2>
            <span
              className="text-[15px] font-bold"
              style={{
                background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {DISTANCE_STEPS.find((s) => s.value === maxDistance)?.label || `${maxDistance} km`}
            </span>
          </div>

          {/* Slider à paliers aimantés (épuré, sans tick marks) */}
          <input
            type="range"
            min={0}
            max={DISTANCE_STEPS.length - 1}
            step={1}
            value={Math.max(0, DISTANCE_STEPS.findIndex((s) => s.value === maxDistance))}
            onChange={(e) => {
              const idx = Number(e.target.value)
              setMaxDistance(DISTANCE_STEPS[idx].value)
            }}
            className="w-full h-2 rounded-full appearance-none cursor-pointer stepped-slider mb-2"
            style={{
              background: (() => {
                const idx = Math.max(0, DISTANCE_STEPS.findIndex((s) => s.value === maxDistance))
                const pct = (idx / (DISTANCE_STEPS.length - 1)) * 100
                return `linear-gradient(to right, #5B6BF5 0%, #9B59F5 ${pct}%, #E5E5EA ${pct}%)`
              })(),
            }}
          />
          <div className="flex justify-between px-[2px] mb-3">
            <span className="text-[10.5px] font-medium text-[#8A8A9A]">1 km</span>
            <span className="text-[10.5px] font-medium text-[#8A8A9A]">Illimité</span>
          </div>

          {/* Mini-map avec cercle du rayon — toujours visible */}
          <div
            className="rounded-2xl overflow-hidden border border-[#EEEEF2] relative"
            style={{ height: 180 }}
          >
            <MapContainer
              center={userCenter}
              zoom={zoomForRadius(maxDistance)}
              zoomSnap={0}
              zoomDelta={0.25}
              wheelPxPerZoomLevel={120}
              zoomControl={false}
              scrollWheelZoom={false}
              dragging={false}
              doubleClickZoom={false}
              attributionControl={false}
              style={{ width: '100%', height: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>'
                url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              />
              {/* Cercle du rayon (caché en "Illimité") */}
              {maxDistance < 100 && (
                <Circle
                  center={userCenter}
                  radius={maxDistance * 1000}
                  pathOptions={{
                    color: '#5B6BF5',
                    weight: 2,
                    fillColor: '#5B6BF5',
                    fillOpacity: 0.12,
                  }}
                />
              )}
              {/* Point central (user position) — taille fixe en px via SVG icon */}
              <Circle
                center={userCenter}
                radius={maxDistance < 100 ? maxDistance * 15 : 500}
                pathOptions={{
                  color: '#fff',
                  weight: 3,
                  fillColor: '#5B6BF5',
                  fillOpacity: 1,
                }}
              />
              <MapAutoFit center={userCenter} radiusKm={maxDistance} />
            </MapContainer>
            {/* Badge "Illimité" en overlay quand pas de cercle */}
            {maxDistance >= 100 && (
              <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm rounded-full px-3 py-1 text-[11px] font-bold text-[#5B6BF5] shadow-sm">
                Recherche illimitée
              </div>
            )}
          </div>
        </section>

        {/* ─────────── Section 3 : Mots-clés (Leboncoin style) ─────────── */}
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-[15px] font-bold text-[#1A1A2E] tracking-[-0.01em]">Mots-clés</h2>
            {selectedTagIds.length > 0 && (
              <button onClick={() => setSelectedTagIds([])} className="text-xs font-semibold text-[#8A8A9A]">
                Effacer ({selectedTagIds.length})
              </button>
            )}
          </div>

          <KeywordPicker
            value={selectedTagIds}
            onChange={setSelectedTagIds}
            max={10}
          />
        </section>
      </motion.div>

      {/* ─────────── CTA ─────────── */}
      <div
        className="absolute left-0 right-0 bottom-0 px-5 pt-4 pb-6"
        style={{
          background: 'linear-gradient(to top, #FFFFFF 70%, rgba(255,255,255,0))',
          paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleApply}
          className="w-full h-[52px] rounded-2xl font-bold text-[15px] flex items-center justify-center text-white"
          style={{
            background: 'linear-gradient(135deg,#5B6BF5 0%,#9B59F5 100%)',
            letterSpacing: '-0.01em',
            boxShadow: '0 6px 20px rgba(91,107,245,0.3)',
          }}
        >
          {activeCount > 0
            ? `Appliquer ${activeCount} filtre${activeCount > 1 ? 's' : ''}`
            : 'Voir tous les vœux'}
        </motion.button>
      </div>
    </div>
  )
}
