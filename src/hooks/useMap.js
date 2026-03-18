import { useState, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { getDistance } from '../lib/utils'

// Position de fallback : Paris
const PARIS = { lat: 48.8566, lng: 2.3522 }
const NOMINATIM_BASE = 'https://nominatim.openstreetmap.org'
const USER_AGENT = 'WishMaker/1.0'

/**
 * Debounce utilitaire
 */
function useDebounce(fn, delay) {
  const timer = useRef(null)
  return useCallback((...args) => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => fn(...args), delay)
  }, [fn, delay])
}

export function useMap() {
  const [position, setPosition] = useState(null)
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationError, setLocationError] = useState(null)

  /**
   * Géolocalisation de l'utilisateur — fallback Paris si refus
   */
  async function getUserPosition() {
    setLocationLoading(true)
    setLocationError(null)

    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setPosition(PARIS)
        setLocationLoading(false)
        resolve(PARIS)
        return
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude }
          setPosition(coords)
          setLocationLoading(false)
          resolve(coords)
        },
        () => {
          // Refus ou erreur → fallback Paris
          setPosition(PARIS)
          setLocationError('Géolocalisation refusée. Position par défaut : Paris.')
          setLocationLoading(false)
          resolve(PARIS)
        },
        { timeout: 8000 }
      )
    })
  }

  /**
   * Récupère les vœux dans les limites visibles de la carte (BBOX)
   */
  async function fetchWishesByBounds(bounds) {
    const { data, error } = await supabase
      .from('wishes')
      .select(`
        *,
        wisher:users!wisher_id(id, prenom, nom, avatar_url, rating, is_online),
        wish_images(url, is_cover, ordre),
        wish_tags(tag)
      `)
      .gte('latitude', bounds.south)
      .lte('latitude', bounds.north)
      .gte('longitude', bounds.west)
      .lte('longitude', bounds.east)
      .in('statut', ['en_attente', 'en_cours'])

    if (error) throw error
    return data || []
  }

  /**
   * Géocodage inverse : coordonnées → adresse (Nominatim)
   */
  async function reverseGeocode(lat, lng) {
    try {
      const res = await fetch(
        `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=fr`,
        { headers: { 'User-Agent': USER_AGENT } }
      )
      const data = await res.json()
      return data.display_name || ''
    } catch {
      return ''
    }
  }

  /**
   * Géocodage direct : texte → [{ lat, lng, label }] (Nominatim)
   * Debounce 1000ms
   */
  const forwardGeocode = useDebounce(async (query, onResult) => {
    if (!query || query.length < 3) {
      onResult([])
      return
    }
    try {
      const res = await fetch(
        `${NOMINATIM_BASE}/search?q=${encodeURIComponent(query)}&format=json&limit=5&accept-language=fr`,
        { headers: { 'User-Agent': USER_AGENT } }
      )
      const data = await res.json()
      const results = data.map((item) => ({
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon),
        label: item.display_name,
      }))
      onResult(results)
    } catch {
      onResult([])
    }
  }, 1000)

  /**
   * Calcul de distance Haversine (JS, pas d'API)
   */
  function getDistanceKm(lat1, lng1, lat2, lng2) {
    return getDistance(lat1, lng1, lat2, lng2)
  }

  /**
   * Lieux proches via Nominatim (pour la carte de localisation)
   * Debounce 500ms
   */
  const getNearbyPlaces = useDebounce(async (lat, lng, onResult) => {
    try {
      const res = await fetch(
        `${NOMINATIM_BASE}/reverse?lat=${lat}&lon=${lng}&format=json&zoom=15&accept-language=fr&addressdetails=1`,
        { headers: { 'User-Agent': USER_AGENT } }
      )
      const data = await res.json()

      // Retourne la localité principale + quartiers proches
      const places = []
      if (data.address) {
        const { city, town, village, suburb, neighbourhood, county, state } = data.address
        const principale = city || town || village || county || state
        if (principale) {
          places.push({
            label: principale,
            address: data.display_name,
            lat: parseFloat(data.lat),
            lng: parseFloat(data.lon),
          })
        }
        if (suburb && suburb !== principale) {
          places.push({
            label: suburb,
            address: `${suburb}, ${principale || ''}`,
            lat,
            lng,
          })
        }
        if (neighbourhood && neighbourhood !== suburb) {
          places.push({
            label: neighbourhood,
            address: `${neighbourhood}, ${suburb || principale || ''}`,
            lat,
            lng,
          })
        }
      }
      onResult(places)
    } catch {
      onResult([])
    }
  }, 500)

  return {
    position,
    locationLoading,
    locationError,
    getUserPosition,
    fetchWishesByBounds,
    reverseGeocode,
    forwardGeocode,
    getDistanceKm,
    getNearbyPlaces,
  }
}
