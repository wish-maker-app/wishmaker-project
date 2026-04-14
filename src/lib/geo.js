/**
 * Utilitaires de géolocalisation — unique source de vérité.
 * - Parsing des réponses Nominatim (OSM) en { quartier, ville, code_postal, ... }
 * - Formatage d'affichage "Quartier, Ville (CP)"
 * - Génération de coordonnées floues déterministes (protection vie privée)
 */

export const FUZZY_RADIUS_METERS = 300

/**
 * Extrait les champs structurés d'une réponse Nominatim (reverse ou search).
 * Nominatim renvoie les champs dans `address`, avec plusieurs alias selon le type de lieu :
 * - quartier : suburb | neighbourhood | city_district | hamlet | quarter
 * - ville    : city | town | village | municipality
 * - cp       : postcode
 *
 * @param {object} nominatimResult - Une entrée de la réponse Nominatim (objet unique)
 * @returns {{ quartier: string|null, ville: string|null, code_postal: string|null, adresse_raw: string, latitude: number, longitude: number }}
 */
export function parseNominatim(nominatimResult) {
  const addr = nominatimResult?.address || {}
  const quartier =
    addr.suburb || addr.neighbourhood || addr.city_district || addr.quarter || addr.hamlet || null
  const ville =
    addr.city || addr.town || addr.village || addr.municipality || null
  const code_postal = addr.postcode || null
  return {
    quartier,
    ville,
    code_postal,
    adresse_raw: nominatimResult?.display_name || '',
    latitude: parseFloat(nominatimResult?.lat),
    longitude: parseFloat(nominatimResult?.lon),
  }
}

/**
 * Formate une localisation structurée en string affichable.
 * Format canonique : "Quartier, Ville (CP)" avec fallbacks progressifs.
 * Accepte aussi un champ `adresse` brute en dernier recours (rétrocompat données historiques).
 *
 * @param {{ quartier?: string|null, ville?: string|null, code_postal?: string|null, adresse?: string|null }} loc
 * @returns {string}
 */
export function formatLocation({ quartier, ville, code_postal, adresse } = {}) {
  const cp = code_postal ? ` (${code_postal})` : ''
  if (quartier && ville) return `${quartier}, ${ville}${cp}`
  if (ville) return `${ville}${cp}`
  if (quartier) return `${quartier}${cp}`
  // Fallback : ancien format adresse brute (vœux historiques sans champs structurés)
  if (adresse) {
    const parts = adresse.split(',').map((s) => s.trim()).filter(Boolean)
    return parts.length <= 2 ? adresse : parts.slice(-2).join(', ')
  }
  return ''
}

/**
 * Hash déterministe simple (DJB2-like) pour seeder un pseudo-random reproductible.
 */
function seededRandom(seed) {
  let h = 0
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0
  }
  return ((h & 0x7fffffff) % 10000) / 10000
}

/**
 * Retourne des coordonnées floues déterministes pour un vœu donné.
 * Le même id produit toujours le même décalage → cohérence entre écrans.
 *
 * @param {number} lat - Latitude réelle
 * @param {number} lng - Longitude réelle
 * @param {string} id - Identifiant unique (wish.id) servant de seed
 * @param {number} [radiusMeters=FUZZY_RADIUS_METERS] - Rayon max du décalage en mètres
 * @returns {[number, number]} [fuzzyLat, fuzzyLng]
 */
export function fuzzyCoordinates(lat, lng, id, radiusMeters = FUZZY_RADIUS_METERS) {
  const seed = String(id || '')
  const latOffset = (seededRandom(seed + 'lat') - 0.5) * (radiusMeters / 111320)
  const lngOffset =
    (seededRandom(seed + 'lng') - 0.5) * (radiusMeters / (111320 * Math.cos((lat * Math.PI) / 180)))
  return [lat + latOffset, lng + lngOffset]
}
