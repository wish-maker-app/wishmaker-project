import { motion } from 'framer-motion'
import { useFavorites } from '../../hooks/useFavorites'
import useAuthStore from '../../store/authStore'

/**
 * Bouton cœur pour favoriser un vœu.
 * - Caché si le vœu appartient à l'utilisateur courant (pas de self-favorite)
 * - Toggle optimiste (pas de wait réseau)
 * - Animation pop au clic
 * - Style overlay : fond sombre semi-transparent + cœur blanc/rouge
 *
 * @param {object} wish - objet vœu avec wisher_id
 * @param {string} [variant] - 'overlay' (default, pour cards photo) | 'plain' (pour fond clair)
 * @param {number} [size] - taille de l'icône en px (default 20)
 */
export default function FavoriteButton({ wish, variant = 'overlay', size = 20 }) {
  const userId = useAuthStore((s) => s.user?.id)
  const { isFavorite, toggle } = useFavorites()

  // Pas de favoris sur ses propres vœux
  if (!wish?.id || !userId || wish.wisher_id === userId || wish.wisher?.id === userId) {
    return null
  }

  const active = isFavorite(wish.id)

  const handleClick = (e) => {
    e.stopPropagation()
    e.preventDefault()
    toggle(wish.id)
  }

  const bgClass = variant === 'overlay'
    ? 'bg-black/30 backdrop-blur-sm'
    : 'bg-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]'

  // Couleurs cœur selon variant + état :
  //  - overlay (fond sombre) : blanc en outline, blanc plein quand actif
  //  - plain (fond clair) : sombre en outline, rouge plein quand actif
  const strokeColor = variant === 'overlay' ? '#FFFFFF' : '#1A1A2E'
  const fillColor = active
    ? (variant === 'overlay' ? '#FFFFFF' : '#EF4444')
    : 'none'
  const activeStroke = active && variant !== 'overlay' ? '#EF4444' : strokeColor

  return (
    <motion.button
      onClick={handleClick}
      whileTap={{ scale: 0.85 }}
      className={`flex items-center justify-center rounded-full ${bgClass} transition-colors`}
      style={{ width: size + 16, height: size + 16 }}
      aria-label={active ? 'Retirer des favoris' : 'Ajouter aux favoris'}
    >
      <motion.svg
        key={active ? 'filled' : 'empty'}
        initial={{ scale: 0.85 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 500, damping: 18 }}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={fillColor}
        stroke={activeStroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
      </motion.svg>
    </motion.button>
  )
}
