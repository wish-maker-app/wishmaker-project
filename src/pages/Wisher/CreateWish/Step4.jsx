import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import Header from '../../../components/layout/Header'
import Button from '../../../components/ui/Button'
import useWishFormStore from '../../../store/wishFormStore'

const CATEGORIES = [
  {
    id: 'depannage',
    emoji: '🔧',
    label: 'Dépannage & Travaux',
    tags: ['Plomberie', 'Électricité', 'Serrurerie', 'Peinture', 'Carrelage', 'Maçonnerie'],
  },
  {
    id: 'immobilier',
    emoji: '🏠',
    label: 'Immobilier & mobilier',
    tags: ['Meubles', 'Montage de meubles', 'Décoration d\'intérieur', 'Déménagement', 'Rangement'],
  },
  {
    id: 'services',
    emoji: '🧹',
    label: 'Services à domicile',
    tags: ['Ménage', 'Aide à domicile', 'Repassage', 'Nettoyage', 'Baby-sitting', 'Cuisine'],
  },
  {
    id: 'animaux',
    emoji: '🐾',
    label: 'Animaux & Nature',
    tags: ['Garde animaux', 'Promenade chien', 'Jardinage', 'Entretien jardin', 'Vétérinaire'],
  },
  {
    id: 'transport',
    emoji: '🚗',
    label: 'Transport & Livraison',
    tags: ['Livraison', 'Courses', 'Transport de personnes', 'Déplacement'],
  },
  {
    id: 'cours',
    emoji: '📚',
    label: 'Cours & Coaching',
    tags: ['Cours particuliers', 'Musique', 'Informatique', 'Langues', 'Sport', 'Soutien scolaire'],
  },
]

function StepProgress({ current, total = 4 }) {
  return (
    <div className="flex gap-2 px-5 pb-4">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="flex-1 h-1 rounded-full overflow-hidden bg-[#F0F0F0]">
          <motion.div className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg,#5B6BF5,#9B59F5)' }}
            initial={{ width: 0 }}
            animate={{ width: i < current ? '100%' : '0%' }}
            transition={{ duration: 0.3, delay: i * 0.05 }}
          />
        </div>
      ))}
    </div>
  )
}

export default function Step4() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { tags: savedTags, setTags } = useWishFormStore()
  const [selected, setSelected] = useState(savedTags || [])
  const [openCategory, setOpenCategory] = useState(null)

  function toggleTag(tag) {
    setSelected((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    )
  }

  function handleContinue() {
    setTags(selected)
    navigate('/wisher/create/recap')
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header title={t('wisher.create.step4_titre')} onBack={() => navigate('/wisher/create/3')} />
      <StepProgress current={4} />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col px-5 pt-2 pb-10 gap-3"
      >
        {selected.length > 0 && (
          <p className="text-xs text-[#8A8A9A]">
            {selected.length} sélectionné{selected.length > 1 ? 's' : ''} — {selected.join(', ')}
          </p>
        )}

        {CATEGORIES.map((cat) => {
          const isOpen = openCategory === cat.id
          const selectedInCat = cat.tags.filter((t) => selected.includes(t))

          return (
            <div key={cat.id} className="rounded-2xl border border-[#E8E8E8] overflow-hidden bg-white">
              {/* En-tête de catégorie */}
              <button
                onClick={() => setOpenCategory(isOpen ? null : cat.id)}
                className="w-full flex items-center gap-3 px-4 py-4 text-left"
              >
                <span className="text-xl w-7 text-center">{cat.emoji}</span>
                <span className="flex-1 text-sm font-semibold text-[#1A1A2E]">{cat.label}</span>
                {selectedInCat.length > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full mr-2"
                    style={{ background: '#EEF0FF', color: '#5B6BF5' }}>
                    {selectedInCat.length}
                  </span>
                )}
                <motion.svg
                  animate={{ rotate: isOpen ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                  width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#8A8A9A"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </motion.svg>
              </button>

              {/* Tags de la catégorie */}
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-3 flex flex-col gap-2 border-t border-[#F0F0F0]">
                      {cat.tags.map((tag) => {
                        const isActive = selected.includes(tag)
                        return (
                          <label key={tag} className="flex items-center gap-3 py-2 cursor-pointer">
                            <span
                              className="w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all"
                              style={{
                                borderColor: isActive ? '#5B6BF5' : '#D0D0D0',
                                background: isActive ? '#5B6BF5' : 'transparent',
                              }}
                              onClick={() => toggleTag(tag)}
                            >
                              {isActive && (
                                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                                  <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </span>
                            <span
                              className="text-sm text-[#1A1A2E]"
                              onClick={() => toggleTag(tag)}
                            >
                              {tag}
                            </span>
                          </label>
                        )
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}

        <div className="mt-4 flex flex-col gap-3">
          <Button onClick={handleContinue}>
            Terminer
          </Button>
          {selected.length === 0 && (
            <button onClick={handleContinue} className="text-sm text-[#8A8A9A] text-center">
              Passer cette étape
            </button>
          )}
        </div>
      </motion.div>
    </div>
  )
}
