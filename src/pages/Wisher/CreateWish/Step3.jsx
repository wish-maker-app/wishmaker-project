import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import toast from 'react-hot-toast'
import Header from '../../../components/layout/Header'
import Button from '../../../components/ui/Button'
import useWishFormStore from '../../../store/wishFormStore'
import useOnboardingStore from '../../../store/onboardingStore'

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

function StepProgress({ current, total = 4 }) {
  return (
    <div className="flex gap-2 px-5 pb-2">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex-1 h-1 rounded-full overflow-hidden bg-[#F0F0F0]">
          <motion.div className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg,#5B6BF5,#9B59F5)' }}
            initial={{ width: 0 }}
            animate={{ width: i < current ? '100%' : '0%' }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          />
        </div>
      ))}
    </div>
  )
}

export default function Step3() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { latitude: savedLat, longitude: savedLng, adresse: savedAdresse, setLocation } = useWishFormStore()
  const { latitude: userLat, longitude: userLng } = useOnboardingStore()

  const defaultCenter = savedLat ? [savedLat, savedLng]
    : userLat ? [userLat, userLng] : [46.603354, 1.888334]

  const [pin, setPin] = useState(savedLat ? { lat: savedLat, lng: savedLng } : null)
  const [adresse, setAdresse] = useState(savedAdresse || '')
  const [geoLoading, setGeoLoading] = useState(false)

  const reverseGeocode = useCallback(async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { 'Accept-Language': 'fr' } }
      )
      const data = await res.json()
      return data.address?.city || data.address?.town || data.address?.village
        || data.display_name.split(',')[0]
    } catch { return `${lat.toFixed(4)}, ${lng.toFixed(4)}` }
  }, [])

  const handleMapClick = useCallback(async (e) => {
    const { lat, lng } = e.latlng
    setPin({ lat, lng })
    const addr = await reverseGeocode(lat, lng)
    setAdresse(addr)
    setLocation(lat, lng, addr)
  }, [reverseGeocode, setLocation])

  async function handleGeolocate() {
    if (!navigator.geolocation) { toast.error('Géolocalisation non supportée'); return }
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const { latitude: lat, longitude: lng } = coords
        setPin({ lat, lng })
        const addr = await reverseGeocode(lat, lng)
        setAdresse(addr)
        setLocation(lat, lng, addr)
        setGeoLoading(false)
      },
      () => { toast.error('Impossible de récupérer ta position'); setGeoLoading(false) }
    )
  }

  return (
    <div className="h-screen bg-white flex flex-col">
      <Header title={t('wisher.create.step3_titre')} onBack={() => navigate('/wisher/create/2')} />
      <StepProgress current={3} />

      {/* Bouton position actuelle */}
      <div className="px-5 pb-3">
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleGeolocate}
          disabled={geoLoading}
          className="w-full flex items-center gap-3 p-3.5 rounded-2xl border border-[#E0E0E0] bg-[#F5F5F7]"
        >
          <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}>
            {geoLoading ? (
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="4"/>
                <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8H4z"/>
              </svg>
            ) : (
              <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            )}
          </div>
          <span className="text-sm font-medium text-[#1A1A2E]">{t('wisher.create.position_actuelle')}</span>
        </motion.button>
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
          <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" attribution='© CARTO' />
          <MapClickHandler onMapClick={handleMapClick} />
          {pin && <Marker position={[pin.lat, pin.lng]} icon={customIcon} />}
        </MapContainer>

        {!pin && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[400] bg-white/90 backdrop-blur rounded-full px-3 py-1.5 shadow-sm">
            <p className="text-xs font-medium text-[#1A1A2E] whitespace-nowrap">Clique sur la carte 📍</p>
          </div>
        )}
      </div>

      {/* Adresse + bouton */}
      <div className="px-5 pb-8 flex flex-col gap-3">
        <AnimatePresence>
          {pin && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-3 p-3 rounded-2xl bg-[#EEF0FF]">
              <svg width="16" height="16" fill="#5B6BF5" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              </svg>
              <p className="text-sm font-medium text-[#5B6BF5] truncate">{adresse}</p>
            </motion.div>
          )}
        </AnimatePresence>
        <Button onClick={() => navigate('/wisher/create/4')} disabled={!pin}>
          {t('common.continuer')}
        </Button>
      </div>
    </div>
  )
}
