import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Header from '../../../components/layout/Header'
import useWishFormStore from '../../../store/wishFormStore'
import { useCatalog } from '../../../hooks/useTags'

/**
 * Écran d'entrée du flow de création de vœu.
 * Le Wisher choisit UNE catégorie émotionnelle avant d'écrire son vœu.
 *
 * Si l'utilisateur revient ici via le bouton "Changer" depuis une étape suivante,
 * le choix précédent est présélectionné.
 */
export default function CategoryChoice() {
  const navigate = useNavigate()
  const { categories, loaded } = useCatalog()
  const {
    category_id: savedCategoryId,
    tag_ids: savedTagIds,
    setCategoryAndTags,
    setTags,
  } = useWishFormStore()

  const [selected, setSelected] = useState(savedCategoryId)

  function handlePick(catId) {
    setSelected(catId)
    // Si on change de catégorie, on reset les tags (incompatibles)
    if (catId !== savedCategoryId) {
      setCategoryAndTags({ category_id: catId, tag_ids: [], tags: [] })
    } else {
      setCategoryAndTags({ category_id: catId, tag_ids: savedTagIds, tags: [] })
    }
    // Petite pause pour laisser l'animation de sélection se voir
    setTimeout(() => navigate('/wisher/create/1'), 160)
  }

  return (
    <div className="h-screen bg-white flex flex-col">
      <Header title="Nouveau vœu" onBack={() => navigate('/wisher')} />

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col px-5 pt-1 pb-8 overflow-y-auto"
      >
        <div className="mb-6">
          <h1 className="text-2xl font-extrabold tracking-[-0.02em] text-[#1A1A2E] mb-1">
            Quelle est ton intention ?
          </h1>
          <p className="text-sm text-[#8A8A9A] leading-relaxed">
            Choisis l'émotion qui correspond le mieux à ton vœu pour que les bons Makers le voient.
          </p>
        </div>

        {!loaded ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-5 h-5 rounded-full border-[2px] border-[#5B6BF5] border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {categories.map((cat, i) => {
              const active = selected === cat.id
              return (
                <motion.button
                  key={cat.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => handlePick(cat.id)}
                  className="relative aspect-[1/1] rounded-2xl border-2 flex flex-col items-center justify-center gap-2 p-3 transition-colors"
                  style={active
                    ? { borderColor: '#5B6BF5', background: 'linear-gradient(135deg, rgba(91,107,245,0.08), rgba(155,89,245,0.08))' }
                    : { borderColor: '#E8E8E8', background: '#fff' }}
                >
                  <span className="text-3xl leading-none">{cat.emoji}</span>
                  <span className="text-[13px] font-bold text-[#1A1A2E] text-center leading-tight">
                    {cat.label}
                  </span>
                  {cat.description && (
                    <span className="text-[10px] text-[#8A8A9A] text-center leading-snug line-clamp-2 px-1">
                      {cat.description}
                    </span>
                  )}
                </motion.button>
              )
            })}
          </div>
        )}
      </motion.div>
    </div>
  )
}
