import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Header from '../../../components/layout/Header'
import useWishFormStore from '../../../store/wishFormStore'
import { useCatalog } from '../../../hooks/useTags'
import { CATEGORY_ICONS, CATEGORY_COLORS, DEFAULT_CATEGORY_COLOR } from '../../../lib/categoryIcons'

/**
 * Écran d'entrée du flow de création de vœu.
 * Le Wisher choisit UNE catégorie émotionnelle avant d'écrire son vœu.
 *
 * Design : "Direction B — Gradient Glyph" (claude.ai/design).
 * Chaque catégorie a sa signature chromatique. Au repos : fond blanc,
 * icône tintée. Sélectionnée : fond tinté, bordure + icône + titre +
 * description dans la couleur de la catégorie.
 */
export default function CategoryChoice() {
  const navigate = useNavigate()
  const { categories, loaded } = useCatalog()
  const {
    category_id: savedCategoryId,
    tag_ids: savedTagIds,
    setCategoryAndTags,
  } = useWishFormStore()

  const [selected, setSelected] = useState(savedCategoryId)

  function handlePick(catId) {
    setSelected(catId)
    const cat = categories.find((c) => c.id === catId)
    // Si on change de catégorie, on reset les tags (incompatibles)
    if (catId !== savedCategoryId) {
      setCategoryAndTags({ category_id: catId, tag_ids: [], tags: [] })
    } else {
      setCategoryAndTags({ category_id: catId, tag_ids: savedTagIds, tags: [] })
    }
    setTimeout(() => navigate('/wisher/create/1'), 180)
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
            Choisis ce qui ressemble le plus à ton vœu. Les bons Makers te trouveront plus vite.
          </p>
        </div>

        {!loaded ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-5 h-5 rounded-full border-[2px] border-[#5B6BF5] border-t-transparent animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5">
            {categories.map((cat, i) => {
              const active = selected === cat.id
              const Icon = CATEGORY_ICONS[cat.slug]
              const theme = CATEGORY_COLORS[cat.slug] || DEFAULT_CATEGORY_COLOR

              return (
                <motion.button
                  key={cat.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.045, duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => handlePick(cat.id)}
                  aria-pressed={active}
                  className="relative rounded-[18px] text-left overflow-hidden flex flex-col justify-between"
                  style={{
                    aspectRatio: '1 / 0.82',
                    padding: '14px 14px 12px',
                    border: `1.5px solid ${active ? theme.hue : '#EEEEF2'}`,
                    background: active ? theme.tint : '#FFFFFF',
                    boxShadow: active
                      ? `0 6px 20px ${theme.hue}33`
                      : '0 1px 2px rgba(20,20,40,0.02)',
                    transform: active ? 'translateY(-2px)' : 'translateY(0)',
                    transition: 'all 0.22s cubic-bezier(0.25,0.1,0.25,1)',
                  }}
                >
                  {/* Icône chip — tinted au repos, gradient catégorie quand sélectionné */}
                  {Icon && (
                    <div
                      className="flex items-center justify-center"
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: 12,
                        background: active ? theme.grad : theme.tint,
                        color: active ? '#FFFFFF' : theme.hue,
                        boxShadow: active ? `0 4px 12px ${theme.hue}55` : 'none',
                        transition: 'all 0.22s cubic-bezier(0.25,0.1,0.25,1)',
                      }}
                    >
                      <Icon size={24} stroke={1.85} />
                    </div>
                  )}

                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 700,
                        color: active ? theme.deep : '#1A1A2E',
                        letterSpacing: '-0.02em',
                        lineHeight: 1.2,
                        transition: 'color 0.22s',
                      }}
                    >
                      {cat.label}
                    </div>
                    {cat.description && (
                      <div
                        style={{
                          fontSize: 11.5,
                          color: active ? theme.deep : '#8A8A9A',
                          opacity: active ? 0.75 : 1,
                          marginTop: 3,
                          lineHeight: 1.3,
                          letterSpacing: '-0.005em',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          transition: 'color 0.22s',
                        }}
                      >
                        {cat.description}
                      </div>
                    )}
                  </div>

                  {/* Selection dot — top right */}
                  <div
                    className="flex items-center justify-center"
                    style={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      width: 18,
                      height: 18,
                      borderRadius: 9,
                      border: active ? 'none' : '1.5px solid #E8E8E8',
                      background: active ? theme.hue : 'transparent',
                      transition: 'all 0.2s',
                    }}
                  >
                    {active && (
                      <svg
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#fff"
                        strokeWidth="4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                </motion.button>
              )
            })}
          </div>
        )}
      </motion.div>
    </div>
  )
}
