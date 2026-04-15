import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import Header from '../../../components/layout/Header'
import Button from '../../../components/ui/Button'
import useWishFormStore from '../../../store/wishFormStore'
import { useCatalog } from '../../../hooks/useTags'

const MAX_TAGS = 3

function StepProgress({ current, total = 4 }) {
  return (
    <div className="flex gap-2 px-5 pb-4">
      {Array.from({ length: total }).map((_, i) => {
        const isCompleted = i < current - 1
        const isCurrent = i === current - 1
        return (
          <div key={i} className="flex-1 h-1 rounded-full overflow-hidden bg-[#F0F0F0]">
            {isCompleted ? (
              <div className="h-full w-full rounded-full"
                style={{ background: 'linear-gradient(90deg,#5B6BF5,#9B59F5)' }} />
            ) : (
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg,#5B6BF5,#9B59F5)' }}
                initial={{ width: 0 }}
                animate={{ width: isCurrent ? '100%' : '0%' }}
                transition={{ duration: 0.3 }}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function Step4() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const {
    category_id: savedCategoryId,
    tag_ids: savedTagIds,
    setCategoryAndTags,
  } = useWishFormStore()
  const { categories, getTagsForCategory, loaded } = useCatalog()

  const [categoryId, setCategoryId] = useState(savedCategoryId)
  const [selectedTagIds, setSelectedTagIds] = useState(savedTagIds || [])
  const [search, setSearch] = useState('')

  // Tags disponibles pour la catégorie choisie (triés : primary first puis order)
  const availableTags = useMemo(() => {
    if (!categoryId) return []
    return getTagsForCategory(categoryId)
  }, [categoryId, getTagsForCategory])

  const filteredTags = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return availableTags
    return availableTags.filter((tag) => tag.label.toLowerCase().includes(q))
  }, [availableTags, search])

  function handlePickCategory(catId) {
    setCategoryId(catId)
    // Si on change de catégorie : ne garder que les tags valides pour la nouvelle
    const validTagIds = getTagsForCategory(catId).map((t) => t.id)
    setSelectedTagIds((prev) => prev.filter((id) => validTagIds.includes(id)))
  }

  function toggleTag(tagId) {
    setSelectedTagIds((prev) => {
      if (prev.includes(tagId)) return prev.filter((id) => id !== tagId)
      if (prev.length >= MAX_TAGS) return prev // bloque au max
      return [...prev, tagId]
    })
  }

  function handleContinue() {
    // Labels legacy : utile pour l'ancien système et pour Recap/UI qui affichent des strings
    const tagLabels = availableTags
      .filter((t) => selectedTagIds.includes(t.id))
      .map((t) => t.label)
    setCategoryAndTags({
      category_id: categoryId,
      tag_ids: selectedTagIds,
      tags: tagLabels,
    })
    navigate('/wisher/create/recap')
  }

  const canContinue = !!categoryId && selectedTagIds.length >= 1

  return (
    <div className="h-screen bg-white flex flex-col">
      <Header
        title={categoryId ? 'Étiquette' : 'Catégorie'}
        onBack={() => {
          if (categoryId && !savedCategoryId) {
            // On est en sélection de tags — revenir à la sélection catégorie
            setCategoryId(null)
          } else {
            navigate('/wisher/create/3')
          }
        }}
      />
      <StepProgress current={4} />

      {!loaded ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full border-[2px] border-[#5B6BF5] border-t-transparent animate-spin" />
        </div>
      ) : !categoryId ? (
        /* ─── Phase 1 : sélection catégorie ─── */
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          className="flex-1 overflow-y-auto px-5 pb-10"
        >
          <p className="text-sm text-[#8A8A9A] mb-4">Quelle émotion décrit le mieux ce vœu ?</p>
          <div className="grid grid-cols-2 gap-3">
            {categories.map((cat, i) => (
              <motion.button
                key={cat.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => handlePickCategory(cat.id)}
                className="aspect-square rounded-2xl border border-[#E8E8E8] bg-white flex flex-col items-center justify-center gap-2 p-3 active:border-[#5B6BF5]/40 transition-colors"
              >
                <span className="text-3xl">{cat.emoji}</span>
                <span className="text-[13px] font-bold text-[#1A1A2E] text-center leading-tight">
                  {cat.label}
                </span>
                {cat.description && (
                  <span className="text-[10px] text-[#8A8A9A] text-center leading-snug line-clamp-2">
                    {cat.description}
                  </span>
                )}
              </motion.button>
            ))}
          </div>
        </motion.div>
      ) : (
        /* ─── Phase 2 : sélection tags ─── */
        <motion.div
          key="tags-phase"
          initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }}
          className="flex-1 flex flex-col px-5 pb-10"
        >
          {/* Catégorie sélectionnée */}
          <button
            onClick={() => { setCategoryId(null); setSelectedTagIds([]) }}
            className="flex items-center gap-2 mb-3 text-left active:opacity-70"
          >
            <span className="text-xl">{categories.find((c) => c.id === categoryId)?.emoji}</span>
            <span className="text-sm font-semibold text-[#1A1A2E]">
              {categories.find((c) => c.id === categoryId)?.label}
            </span>
            <span className="ml-auto text-[11px] text-[#5B6BF5] font-semibold">Changer</span>
          </button>

          {/* Instruction */}
          <p className="text-sm text-[#8A8A9A] mb-3">
            Choisis jusqu'à {MAX_TAGS} étiquettes pour aider les Makers à te trouver.
          </p>

          {/* Search */}
          <div className="relative mb-3">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher une étiquette…"
              className="w-full h-11 bg-[#F5F5F7] rounded-full pl-11 pr-4 text-sm outline-none focus:ring-2 focus:ring-[#5B6BF5]/20"
            />
            <svg className="absolute left-4 top-1/2 -translate-y-1/2" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A8A9A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
          </div>

          {/* Tag pills scrollable */}
          <div className="flex-1 overflow-y-auto -mx-1 px-1">
            <div className="flex flex-wrap gap-2 pb-4">
              {filteredTags.length === 0 && (
                <p className="text-sm text-[#8A8A9A] text-center w-full py-8">
                  Aucune étiquette ne correspond.
                </p>
              )}
              {filteredTags.map((tag) => {
                const active = selectedTagIds.includes(tag.id)
                const locked = !active && selectedTagIds.length >= MAX_TAGS
                return (
                  <motion.button
                    key={tag.id}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => toggleTag(tag.id)}
                    disabled={locked}
                    className="h-9 px-4 rounded-full text-[13px] font-semibold border transition-colors disabled:opacity-40"
                    style={active
                      ? { background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)', borderColor: 'transparent', color: '#fff' }
                      : { background: '#fff', borderColor: '#E8E8E8', color: '#1A1A2E' }
                    }
                  >
                    {tag.is_suggested_primary && !active && (
                      <span className="mr-1">★</span>
                    )}
                    {tag.label}
                  </motion.button>
                )
              })}
            </div>
          </div>

          {/* Footer : compteur + bouton */}
          <div className="flex flex-col gap-2 pt-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-[#8A8A9A]">
                {selectedTagIds.length} / {MAX_TAGS} sélectionné{selectedTagIds.length > 1 ? 's' : ''}
              </span>
              {selectedTagIds.length === 0 && (
                <span className="text-[#F59E0B] font-medium">Au moins 1 requise</span>
              )}
            </div>
            <Button onClick={handleContinue} disabled={!canContinue}>
              Terminer
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
