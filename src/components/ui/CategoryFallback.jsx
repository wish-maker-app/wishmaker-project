import { CATEGORY_ICONS, CATEGORY_COLORS, DEFAULT_CATEGORY_COLOR } from '../../lib/categoryIcons'

/**
 * Affichage de fallback quand un vœu n'a pas de photo.
 * Affiche l'icône SVG de la catégorie sur fond gradient signature.
 *
 * @param {string} slug - slug de la catégorie ('exauce', 'divertis', ...)
 * @param {number} iconSize - taille de l'icône en px (default 48)
 * @param {string} className - classes optionnelles pour l'overlay
 */
export default function CategoryFallback({ slug, iconSize = 48, className = '' }) {
  const Icon = slug ? CATEGORY_ICONS[slug] : null
  const theme = (slug && CATEGORY_COLORS[slug]) || DEFAULT_CATEGORY_COLOR

  return (
    <div
      className={`w-full h-full flex items-center justify-center ${className}`}
      style={{ background: theme.grad }}
    >
      {Icon ? (
        <div style={{ color: '#fff' }}>
          <Icon size={iconSize} stroke={2} />
        </div>
      ) : (
        <span className="text-white text-2xl">✨</span>
      )}
    </div>
  )
}
