import { useNavigate } from 'react-router-dom'
import useWishFormStore from '../../store/wishFormStore'
import { useCatalog } from '../../hooks/useTags'
import { CATEGORY_ICONS, CATEGORY_COLORS, DEFAULT_CATEGORY_COLOR } from '../../lib/categoryIcons'

/**
 * Badge affichant la catégorie sélectionnée dans le flow de création de vœu.
 * Cliquable pour revenir à l'écran de choix de catégorie.
 * Rendu null si aucune catégorie n'est choisie (défensif).
 *
 * Utilise l'icône custom + couleur de la catégorie (cohérent avec CategoryChoice).
 */
export default function CategoryBadge() {
  const navigate = useNavigate()
  const categoryId = useWishFormStore((s) => s.category_id)
  const { categories, loaded } = useCatalog()

  if (!loaded || !categoryId) return null
  const cat = categories.find((c) => c.id === categoryId)
  if (!cat) return null

  const Icon = CATEGORY_ICONS[cat.slug]
  const theme = CATEGORY_COLORS[cat.slug] || DEFAULT_CATEGORY_COLOR

  return (
    <button
      onClick={() => navigate('/wisher/create')}
      className="mx-5 mb-3 flex items-center gap-2 h-9 pl-1.5 pr-3 rounded-full border bg-white active:opacity-80 transition-all self-start"
      style={{
        borderColor: `${theme.hue}40`,
        background: theme.tint,
      }}
    >
      {/* Pastille icône (22px, fond tint plus soutenu + icône hue) */}
      {Icon && (
        <span
          className="flex items-center justify-center rounded-full"
          style={{
            width: 24,
            height: 24,
            background: '#FFFFFF',
            color: theme.hue,
          }}
        >
          <Icon size={14} stroke={2} />
        </span>
      )}
      <span className="text-[12.5px] font-semibold" style={{ color: theme.deep }}>
        {cat.label}
      </span>
      <span className="text-[11px] font-semibold" style={{ color: theme.hue }}>
        Changer
      </span>
    </button>
  )
}
