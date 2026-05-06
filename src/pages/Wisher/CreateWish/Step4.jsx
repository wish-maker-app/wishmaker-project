import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import Header from '../../../components/layout/Header'
import Button from '../../../components/ui/Button'
import KeywordPicker from '../../../components/ui/KeywordPicker'
import useWishFormStore from '../../../store/wishFormStore'
import { useCatalog } from '../../../hooks/useTags'

const MAX_KEYWORDS = 5

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

/**
 * Dérive la catégorie principale d'un vœu à partir du PREMIER mot-clé sélectionné.
 *
 * Règle : on prend la category_tags row où is_suggested_primary=true en
 * priorité, sinon la première trouvée. Sert uniquement pour le visuel
 * (couleur du marker carte + fallback photo) — l'user ne voit pas la
 * catégorie. C'est le remplacement de l'ancien CategoryChoice.
 */
function deriveCategory(tagIds, categoryTags) {
  const firstTagId = tagIds[0]
  if (!firstTagId) return null
  const candidates = categoryTags.filter((ct) => ct.tag_id === firstTagId)
  if (candidates.length === 0) return null
  const primary = candidates.find((c) => c.is_suggested_primary)
  return (primary || candidates[0]).category_id
}

export default function Step4() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const {
    tag_ids: savedTagIds,
    setCategoryAndTags,
  } = useWishFormStore()
  const { tags, categoryTags, loaded } = useCatalog()

  const [selectedTagIds, setSelectedTagIds] = useState(savedTagIds || [])

  function handleContinue() {
    if (selectedTagIds.length === 0) return
    // Catégorie dérivée du premier mot-clé (invisible pour l'user, sert juste au visuel)
    const derivedCategoryId = deriveCategory(selectedTagIds, categoryTags)
    // Labels des tags sélectionnés (rétrocompat avec l'ancien champ tags string[])
    const tagsById = new Map(tags.map((t) => [t.id, t]))
    const tagLabels = selectedTagIds.map((id) => tagsById.get(id)?.label).filter(Boolean)

    setCategoryAndTags({
      category_id: derivedCategoryId,
      tag_ids: selectedTagIds,
      tags: tagLabels,
    })
    navigate('/wisher/create/recap')
  }

  const canContinue = selectedTagIds.length >= 1

  return (
    <div className="h-screen bg-white flex flex-col">
      <Header title={t('wisher.create.keywords.header')} onBack={() => navigate('/wisher/create/3')} />
      <StepProgress current={4} />

      {!loaded ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-5 h-5 rounded-full border-[2px] border-[#5B6BF5] border-t-transparent animate-spin" />
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 flex flex-col px-5 pb-10"
        >
          <p className="text-sm text-[#8A8A9A] mb-4">
            {t('wisher.create.keywords.intro', { max: MAX_KEYWORDS })}
          </p>

          <div className="flex-1 overflow-y-auto -mx-1 px-1">
            <KeywordPicker
              value={selectedTagIds}
              onChange={setSelectedTagIds}
              max={MAX_KEYWORDS}
              autoFocus
            />
          </div>

          <div className="pt-2">
            <Button onClick={handleContinue} disabled={!canContinue}>
              {t('wisher.create.keywords.btn_terminer')}
            </Button>
          </div>
        </motion.div>
      )}
    </div>
  )
}
