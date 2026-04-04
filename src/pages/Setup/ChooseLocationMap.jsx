import { useState, useCallback, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { MapContainer, TileLayer, Marker, useMap, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../store/authStore'
import Header from '../../components/layout/Header'
import Button from '../../components/ui/Button'
import useOnboardingStore from '../../store/onboardingStore'

// Fix icône Leaflet par défaut (vite supprime les images)
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Icône pin personnalisée gradient
const customIcon = L.divIcon({
  html: `
    <div style="
      width:36px; height:36px; border-radius:50% 50% 50% 0;
      background:linear-gradient(135deg,#5B6BF5,#9B59F5);
      transform:rotate(-45deg); box-shadow:0 4px 12px rgba(91,107,245,0.4);
      display:flex; align-items:center; justify-content:center;
    ">
      <div style="
        width:12px; height:12px; background:white; border-radius:50%;
        transform:rotate(45deg);
      "></div>
    </div>
  `,
  className: '',
  iconSize: [36, 36],
  iconAnchor: [18, 36],
})

// Force le map à se resize quand il est rendu (même pattern que MakerHome)
function MapResizer() {
  const map = useMap()
  useEffect(() => {
    setTimeout(() => map.invalidateSize(), 100)
  }, [map])
  return null
}

function MapClickHandler({ onMapClick }) {
  useMapEvents({ click: onMapClick })
  return null
}

export default function ChooseLocationMap() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { latitude: savedLat, longitude: savedLng, setLocation } = useOnboardingStore()

  const [pin, setPin] = useState(
    savedLat ? { lat: savedLat, lng: savedLng } : null
  )
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)

  const defaultCenter = savedLat
    ? [savedLat, savedLng]
    : [46.603354, 1.888334] // centre France

  const handleMapClick = useCallback(async (e) => {
    const { lat, lng } = e.latlng
    setPin({ lat, lng })
    setLoading(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
        { headers: { 'Accept-Language': 'fr' } }
      )
      const data = await res.json()
      const ville = data.address?.city || data.address?.town || data.address?.village || data.display_name.split(',')[0]
      setAddress(ville)
      setLocation(lat, lng, ville)
    } catch {
      setAddress(`${lat.toFixed(4)}, ${lng.toFixed(4)}`)
      setLocation(lat, lng, '')
    } finally {
      setLoading(false)
    }
  }, [setLocation])

  const [saving, setSaving] = useState(false)

  async function handleValidate() {
    const user = useAuthStore.getState().user
    if (!user) return
    setSaving(true)
    try {
      const store = useOnboardingStore.getState()
      const { error } = await supabase
        .from('users')
        .update({
          latitude: store.latitude,
          longitude: store.longitude,
          ville: store.ville,
          langue: store.langue,
          onboarding_completed: true,
        })
        .eq('id', user.id)
      if (error) throw error

      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()
      if (profile) useAuthStore.getState().setProfile(profile)

      navigate('/maker', { replace: true })
    } catch (err) {
      toast.error(err.message || 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="h-screen bg-white flex flex-col relative overflow-hidden">
      {/* Header flottant au-dessus de la carte */}
      <div className="absolute top-0 left-0 right-0 z-[500] pointer-events-none">
        <div className="pointer-events-auto">
          <Header title={t('setup.carte.titre')} transparent onBack={() => navigate('/setup/localisation')} />
        </div>
      </div>

      {/* Carte full screen */}
      <div className="flex-1 relative z-0 overflow-hidden">
        <MapContainer
          center={defaultCenter}
          zoom={savedLat ? 13 : 5}
          scrollWheelZoom
          style={{ width: '100%', height: '100%' }}
          zoomControl={false}
        >
          <MapResizer />
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          />
          <MapClickHandler onMapClick={handleMapClick} />
          {pin && <Marker position={[pin.lat, pin.lng]} icon={customIcon} />}
        </MapContainer>

        {/* Hint "clique sur la carte" */}
        {!pin && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-28 left-1/2 -translate-x-1/2 z-[400]
              bg-white/90 backdrop-blur rounded-full px-4 py-2 shadow-md"
          >
            <p className="text-xs font-medium text-[#1A1A2E] whitespace-nowrap">
              Appuie sur la carte pour placer ton marqueur 📍
            </p>
          </motion.div>
        )}

        {/* Panel bas — adresse + bouton valider */}
        <div className="absolute bottom-0 left-0 right-0 z-[400] px-5 pb-10 pt-6
          bg-gradient-to-t from-white via-white/95 to-transparent">
          <AnimatePresence>
            {pin && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                className="mb-4 flex items-center gap-3 p-4 rounded-2xl bg-white shadow-md border border-[#E0E0E0]"
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}>
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="white">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  {loading ? (
                    <p className="text-sm text-[#8A8A9A]">Localisation en cours...</p>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-[#1A1A2E] truncate">{address}</p>
                      <p className="text-xs text-[#8A8A9A]">{pin.lat.toFixed(4)}, {pin.lng.toFixed(4)}</p>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <Button onClick={handleValidate} disabled={!pin || loading} loading={saving}>
            {t('setup.carte.btn')}
          </Button>
        </div>
      </div>
    </div>
  )
}
