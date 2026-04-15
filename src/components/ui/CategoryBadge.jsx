import { useNavigate } from 'react-router-dom'
import useWishFormStore from '../../store/wishFormStore'
import { useCatalog } from '../../hooks/useTags'

/**
 * Badge affichant la catégorie sélectionnée dans le flow de création de vœu.
 * Cliquable pour revenir à l'écran de choix de catégorie.
 * Rendu null si aucune catégorie n'est choisie (défensif).
 */
export default function CategoryBadge() {
  const navigate = useNavigate()
  const categoryId = useWishFormStore((s) => s.category_id)
  const { categories, loaded } = useCatalog()

  if (!loaded || !categoryId) return null
  const cat = categories.find((c) => c.id === categoryId)
  if (!cat) return null

  return (
    <button
      onClick={() => navigate('/wisher/create')}
      className="mx-5 mb-3 flex items-center gap-2 h-9 px-3 rounded-full border border-[#E8E8E8] bg-[#FAFAFC] active:bg-[#F0F0F5] transition-colors self-start"
    >
      <span className="text-sm leading-none">{cat.emoji}</span>
      <span className="text-[12.5px] font-semibold text-[#1A1A2E]">{cat.label}</span>
      <span className="text-[11px] text-[#5B6BF5] font-semibold">Changer</span>
    </button>
  )
}
