import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import Header from '../../../components/layout/Header'
import Button from '../../../components/ui/Button'
import KeywordPicker from '../../../components/ui/KeywordPicker'
import useWishFormStore from '../../../store/wishFormStore'
import { useCatalog } from '../../../hooks/useTags'

const MAX_KEYWORDS = 5
const MAX_SUGGESTIONS = 6

function normalize(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

// Matching mot entier (évite "chat" dans "achat") entre le texte tapé et le libellé du tag.
function useSuggestedTags(text, tags, excludeIds) {
  return useMemo(() => {
    const norm = normalize(text)
    if (!norm.trim() || tags.length === 0) return []
    const excluded = new Set(excludeIds)
    return tags
      .filter((tag) => {
        if (excluded.has(tag.id)) return false
        const label = normalize(tag.label)
        const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const re = new RegExp(`(?:^|[^a-z0-9])${escaped}(?:[^a-z0-9]|$)`)
        return re.test(norm)
      })
      .slice(0, MAX_SUGGESTIONS)
  }, [text, tags, excludeIds])
}

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
 * Dérive la catégorie principale d'un vœu à partir des mots-clés sélectionnés.
 *
 * Règle :
 *  1. On itère sur les tags sélectionnés (priorité au 1er)
 *  2. Pour chaque tag, on prend la category_tags row où is_suggested_primary=true
 *     en priorité, sinon la première trouvée.
 *  3. Si AUCUN tag n'a de catégorie mappée → fallback sur la 1ère catégorie
 *     disponible (jamais de category_id null en DB).
 *
 * Sert uniquement pour le visuel (couleur du marker carte + fallback photo) —
 * l'user ne voit pas la catégorie. C'est le remplacement de l'ancien CategoryChoice.
 */
function deriveCategory(tagIds, categoryTags, categories) {
  for (const tagId of tagIds) {
    const candidates = categoryTags.filter((ct) => ct.tag_id === tagId)
    if (candidates.length === 0) continue
    const primary = candidates.find((c) => c.is_suggested_primary)
    return (primary || candidates[0]).category_id
  }
  // Aucun tag n'a de mapping → on prend la 1re catégorie disponible
  if (categories && categories.length > 0) {
    console.warn('[Step4] Aucun tag mappé à une catégorie, fallback sur', categories[0].slug)
    return categories[0].id
  }
  return null
}

export default function Step4() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const {
    titre, description,
    tag_ids: savedTagIds,
    setCategoryAndTags,
  } = useWishFormStore()
  const { tags, categoryTags, categories, loaded, error, reload } = useCatalog()

  const [selectedTagIds, setSelectedTagIds] = useState(savedTagIds || [])

  const suggestedTags = useSuggestedTags(`${titre} ${description}`, tags, selectedTagIds)

  function addSuggestion(tagId) {
    if (selectedTagIds.length >= MAX_KEYWORDS || selectedTagIds.includes(tagId)) return
    setSelectedTagIds((prev) => [...prev, tagId])
  }

  function handleContinue() {
    if (selectedTagIds.length === 0) return
    // Catégorie dérivée du premier mot-clé (invisible pour l'user, sert juste au visuel)
    const derivedCategoryId = deriveCategory(selectedTagIds, categoryTags, categories)
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
        error ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-sm font-bold text-[#1A1A2E]">Impossible de charger les mots-clés</p>
            <p className="text-xs text-[#8A8A9A]">Vérifie ta connexion et réessaie.</p>
            <button
              onClick={() => reload()}
              className="mt-2 h-10 px-5 rounded-full text-white font-bold text-xs"
              style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
            >
              Réessayer
            </button>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="w-5 h-5 rounded-full border-[2px] border-[#5B6BF5] border-t-transparent animate-spin" />
          </div>
        )
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex-1 flex flex-col px-5 pb-10"
        >
          <p className="text-sm text-[#8A8A9A] mb-4">
            {t('wisher.create.keywords.intro', { max: MAX_KEYWORDS })}
          </p>

          {suggestedTags.length > 0 && selectedTagIds.length < MAX_KEYWORDS && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-[#8A8A9A] mb-2">✨ Suggestions pour toi</p>
              <div className="flex flex-wrap gap-2">
                {suggestedTags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => addSuggestion(tag.id)}
                    className="h-9 pl-3.5 pr-3 rounded-full text-[13px] font-semibold flex items-center gap-1.5 border border-[#E0E0E0] text-[#1A1A2E] bg-white active:scale-[0.97] transition-transform"
                  >
                    <span>{tag.label}</span>
                    <span className="text-[#5B6BF5] font-bold">+</span>
                  </button>
                ))}
              </div>
            </div>
          )}

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
