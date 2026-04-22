import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import Header from '../../../components/layout/Header'
import Button from '../../../components/ui/Button'
import CategoryBadge from '../../../components/ui/CategoryBadge'
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
    category_id: categoryId,
    tag_ids: savedTagIds,
    setCategoryAndTags,
  } = useWishFormStore()
  const { categories, getTagsForCategory, loaded } = useCatalog()

  const [selectedTagIds, setSelectedTagIds] = useState(savedTagIds || [])
  const [search, setSearch] = useState('')

  // Safety : si l'utilisateur atterrit ici sans catégorie (lien direct ou refresh),
  // on le renvoie gentiment au choix de catégorie.
  useEffect(() => {
    if (loaded && !categoryId) {
      navigate('/wisher/create', { replace: true })
    }
  }, [loaded, categoryId, navigate])

  const currentCategory = useMemo(
    () => categories.find((c) => c.id === categoryId),
    [categories, categoryId]
  )

  const availableTags = useMemo(
    () => (categoryId ? getTagsForCategory(categoryId) : []),
    [categoryId, getTagsForCategory]
  )

  const filteredTags = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return availableTags
    return availableTags.filter((tag) => tag.label.toLowerCase().includes(q))
  }, [availableTags, search])

  function toggleTag(tagId) {
    setSelectedTagIds((prev) => {
      if (prev.includes(tagId)) return prev.filter((id) => id !== tagId)
      if (prev.length >= MAX_TAGS) return prev
      return [...prev, tagId]
    })
  }

  function handleContinue() {
    const tagLabels = availableTags
      .filter((tg) => selectedTagIds.includes(tg.id))
      .map((tg) => tg.label)
    setCategoryAndTags({
      category_id: categoryId,
      tag_ids: selectedTagIds,
      tags: tagLabels,
    })
    navigate('/wisher/create/recap')
  }

  const canContinue = selectedTagIds.length >= 1

  return (
    <div className="h-screen bg-white flex flex-col">
      <Header title="Étiquettes" onBack={() => navigate('/wisher/create/3')} />
      <StepProgress current={4} />
      <CategoryBadge />

      {!loaded || !currentCategory ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full border-[2px] border-[#5B6BF5] border-t-transparent animate-spin" />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 flex flex-col px-5 pb-10"
        >
          <p className="text-sm text-[#8A8A9A] mb-3">
            Choisis jusqu'à {MAX_TAGS} étiquettes pour aider les Makers à te trouver.
          </p>

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
                    {tag.label}
                  </motion.button>
                )
              })}
            </div>
          </div>

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
