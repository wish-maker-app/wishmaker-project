import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import toast from 'react-hot-toast'
import Header from '../../../components/layout/Header'
import Button from '../../../components/ui/Button'
import CategoryBadge from '../../../components/ui/CategoryBadge'
import useWishFormStore from '../../../store/wishFormStore'
import useOnboardingStore from '../../../store/onboardingStore'
import { parseNominatim, formatLocation } from '../../../lib/geo'

delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

const customIcon = L.divIcon({
  html: `<div style="width:36px;height:36px;border-radius:50% 50% 50% 0;background:linear-gradient(135deg,#5B6BF5,#9B59F5);transform:rotate(-45deg);box-shadow:0 4px 12px rgba(91,107,245,0.4);display:flex;align-items:center;justify-content:center;"><div style="width:12px;height:12px;background:white;border-radius:50%;transform:rotate(45deg);"></div></div>`,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
})

function MapResizer() {
  const map = useMap()
  useEffect(() => { setTimeout(() => map.invalidateSize(), 100) }, [map])
  return null
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({ click: onMapClick })
  return null
}

function MapFlyTo({ center, zoom }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.flyTo(center, zoom || 15, { duration: 0.8 })
  }, [center, zoom, map])
  return null
}

function StepProgress({ current, total = 4 }) {
  return (
    <div className="flex gap-2 px-5 pb-2">
      {Array.from({ length: total }).map((_, i) => {
        const isCompleted = i < current - 1
        const isCurrent = i === current - 1
        return (
          <div key={i} className="flex-1 h-1 rounded-full overflow-hidden bg-[#F0F0F0]">
            {isCompleted ? (
              <div
                className="h-full w-full rounded-full"
                style={{ background: 'linear-gradient(90deg,#5B6BF5,#9B59F5)' }}
              />
            ) : (
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg,#5B6BF5,#9B59F5)' }}
                initial={{ width: 0 }}
                animate={{ width: isCurrent ? '100%' : '0%' }}
                transition={{ duration: 0.3 }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function Step3() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { latitude: savedLat, longitude: savedLng, quartier: savedQuartier, ville: savedVille, code_postal: savedCP, setLocation } = useWishFormStore()
  const { latitude: userLat, longitude: userLng } = useOnboardingStore()

  const savedDisplay = formatLocation({ quartier: savedQuartier, ville: savedVille, code_postal: savedCP })

  const defaultCenter = savedLat ? [savedLat, savedLng]
    : userLat ? [userLat, userLng] : [46.603354, 1.888334]

  const [pin, setPin] = useState(savedLat ? { lat: savedLat, lng: savedLng } : null)
  const [adresse, setAdresse] = useState(savedDisplay)
  const [searchQuery, setSearchQuery] = useState(savedDisplay)
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [geoLoading, setGeoLoading] = useState(false)
  const [flyTarget, setFlyTarget] = useState(null)
  const searchTimeout = useRef(null)
  const inputRef = useRef(null)

  const reverseGeocode = useCallback(async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        { headers: { 'Accept-Language': 'fr' } }
      )
      const data = await res.json()
      return parseNominatim(data)
    } catch {
      return { quartier: null, ville: null, code_postal: null, adresse_raw: '', latitude: lat, longitude: lng }
    }
  }, [])

  // Recherche d'adresse via Nominatim
  const searchAddress = useCallback(async (query) => {
    if (query.length < 3) { setSuggestions([]); return }
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&addressdetails=1&limit=5&countrycodes=fr`,
        { headers: { 'Accept-Language': 'fr' } }
      )
      const data = await res.json()
      setSuggestions(data.map(item => parseNominatim(item)))
      setShowSuggestions(true)
    } catch {
      setSuggestions([])
    }
  }, [])

  function handleSearchChange(e) {
    const value = e.target.value
    setSearchQuery(value)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => searchAddress(value), 300)
  }

  function handleSelectSuggestion(suggestion) {
    const label = formatLocation(suggestion)
    setPin({ lat: suggestion.latitude, lng: suggestion.longitude })
    setAdresse(label)
    setSearchQuery(label)
    setLocation({
      latitude: suggestion.latitude,
      longitude: suggestion.longitude,
      adresse: suggestion.adresse_raw,
      quartier: suggestion.quartier,
      ville: suggestion.ville,
      code_postal: suggestion.code_postal,
    })
    setShowSuggestions(false)
    setSuggestions([])
    setFlyTarget([suggestion.latitude, suggestion.longitude])
  }

  function clearSearch() {
    setSearchQuery('')
    setSuggestions([])
    setShowSuggestions(false)
    setPin(null)
    setAdresse('')
    inputRef.current?.focus()
  }

  const handleMapClick = useCallback(async (e) => {
    const { lat, lng } = e.latlng
    setPin({ lat, lng })
    setShowSuggestions(false)
    const parsed = await reverseGeocode(lat, lng)
    const label = formatLocation(parsed) || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    setAdresse(label)
    setSearchQuery(label)
    setLocation({
      latitude: lat,
      longitude: lng,
      adresse: parsed.adresse_raw,
      quartier: parsed.quartier,
      ville: parsed.ville,
      code_postal: parsed.code_postal,
    })
  }, [reverseGeocode, setLocation])

  async function handleGeolocate() {
    if (!navigator.geolocation) { toast.error(t('wisher.create.step3.geoloc_unsupported')); return }
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude: lat, longitude: lng } = coords
        setPin({ lat, lng })
        setShowSuggestions(false)
        const parsed = await reverseGeocode(lat, lng)
        const label = formatLocation(parsed) || `${lat.toFixed(4)}, ${lng.toFixed(4)}`
        setAdresse(label)
        setSearchQuery(label)
        setLocation({
          latitude: lat,
          longitude: lng,
          adresse: parsed.adresse_raw,
          quartier: parsed.quartier,
          ville: parsed.ville,
          code_postal: parsed.code_postal,
        })
        setFlyTarget([lat, lng])
        setGeoLoading(false)
      },
      () => { toast.error(t('wisher.create.step3.geoloc_failed')); setGeoLoading(false) }
    )
  }

  return (
    <div className="h-screen bg-white flex flex-col">
      <Header title={t('wisher.create.step3_titre')} onBack={() => navigate('/wisher/create/2')} />
      <StepProgress current={3} />
      <CategoryBadge />

      {/* Info */}
      <p className="px-5 pb-3 text-xs text-[#8A8A9A]">
        {t('wisher.create.step3.intro')}
      </p>

      {/* Champ de recherche adresse */}
      <div className="px-5 pb-3 relative z-[500]">
        <label className="text-sm font-semibold text-[#1A1A2E] mb-1.5 block">{t('wisher.create.step3.label_adresse')}</label>
        <div className="flex items-center gap-2">
          {/* Bouton géolocalisation */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={handleGeolocate}
            disabled={geoLoading}
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm"
            style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
          >
            {geoLoading ? (
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="3"/>
                <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
            ) : (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="4"/>
                <path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
              </svg>
            )}
          </motion.button>

          {/* Input adresse */}
          <div className="flex-1 relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
              <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke={pin ? '#5B6BF5' : '#8A8A9A'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
              </svg>
            </span>
            <input
              ref={inputRef}
              type="text"
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
              placeholder={t('wisher.create.step3.placeholder')}
              className={`w-full h-11 pl-10 pr-10 rounded-2xl text-sm transition-colors focus:outline-none ${
                pin
                  ? 'border-2 border-[#5B6BF5] bg-[#EEF0FF] text-[#5B6BF5] font-medium'
                  : 'border border-[#E0E0E0] bg-[#F5F5F7] text-[#1A1A2E] placeholder:text-[#B0B0B0] focus:border-[#5B6BF5] focus:ring-1 focus:ring-[#5B6BF5]/20'
              }`}
            />
            {searchQuery && (
              <button onClick={clearSearch} className="absolute right-3 top-1/2 -translate-y-1/2">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={pin ? '#5B6BF5' : '#8A8A9A'} strokeWidth="2" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10"/>
                  <path d="M15 9l-6 6M9 9l6 6"/>
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Suggestions dropdown */}
        <AnimatePresence>
          {showSuggestions && suggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className="absolute left-5 right-5 mt-1 bg-white rounded-xl border border-[#E0E0E0] shadow-lg overflow-hidden"
            >
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectSuggestion(s)}
                  className="w-full flex items-start gap-3 px-4 py-3 hover:bg-[#F5F5F7] transition-colors text-left border-b border-[#F0F0F0] last:border-b-0"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A8A9A" strokeWidth="2" className="flex-shrink-0 mt-0.5">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                    <circle cx="12" cy="9" r="2.5"/>
                  </svg>
                  <span className="text-sm text-[#1A1A2E] line-clamp-2">{formatLocation(s) || s.adresse_raw}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* Carte */}
      <div className="flex-1 relative z-0 overflow-hidden mx-5 mb-3 rounded-2xl border border-[#E0E0E0]">
        <MapContainer
          center={defaultCenter}
          zoom={savedLat || userLat ? 13 : 5}
          scrollWheelZoom
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
        >
          <MapResizer />
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution='&copy; CARTO' />
          <MapClickHandler onMapClick={handleMapClick} />
          {pin && <Marker position={[pin.lat, pin.lng]} icon={customIcon} />}
          {flyTarget && <MapFlyTo center={flyTarget} zoom={15} />}
        </MapContainer>

        {!pin && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[400] bg-white/90 backdrop-blur rounded-full px-3 py-1.5 shadow-sm">
            <p className="text-xs font-medium text-[#1A1A2E] whitespace-nowrap">{t('wisher.create.step3.hint_carte')}</p>
          </div>
        )}
      </div>

      {/* Bouton continuer */}
      <div className="px-5 pb-8">
        <Button onClick={() => navigate('/wisher/create/4')} disabled={!pin}>
          {t('common.continuer')}
        </Button>
      </div>
    </div>
  )
}
