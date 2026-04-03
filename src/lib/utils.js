/**
 * Calcule la distance en km entre deux points GPS (Haversine)
 */
export function getDistance(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.asin(Math.sqrt(a))
}

function toRad(deg) {
  return (deg * Math.PI) / 180
}

/**
 * Formate un nombre de km en texte lisible
 */
export function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m`
  return `${km.toFixed(1)} km`
}

/**
 * Formate une date en texte relatif (fr)
 */
export function formatRelativeDate(dateStr) {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMs = now - date
  const diffMin = Math.floor(diffMs / 60000)
  const diffH = Math.floor(diffMin / 60)
  const diffD = Math.floor(diffH / 24)

  if (diffMin < 1) return "À l'instant"
  if (diffMin < 60) return `Il y a ${diffMin} min`
  if (diffH < 24) return `Il y a ${diffH}h`
  if (diffD < 7) return `Il y a ${diffD}j`
  return date.toLocaleDateString('fr-FR')
}

/**
 * Tronque une adresse pour n'afficher que le quartier + ville
 * Ex: "12 rue de la Paix, Belleville, Paris" → "Belleville, Paris"
 */
export function shortenAddress(adresse) {
  if (!adresse) return ''
  const parts = adresse.split(',').map(s => s.trim())
  if (parts.length <= 2) return adresse
  return parts.slice(-2).join(', ')
}

/**
 * Classe CSS conditionnelle (utilitaire)
 */
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}
