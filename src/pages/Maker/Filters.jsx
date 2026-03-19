import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import Header from '../../components/layout/Header'
import Button from '../../components/ui/Button'

const SORT_OPTIONS = [
  { id: 'pertinence', icon: '🎯' },
  { id: 'distance', icon: '📍' },
  { id: 'recent', icon: '🕐' },
]

const CATEGORIES = [
  { id: 'depannage', emoji: '🔧', label: 'Dépannage & Travaux' },
  { id: 'immobilier', emoji: '🏠', label: 'Immobilier & mobilier' },
  { id: 'services', emoji: '🧹', label: 'Services à domicile' },
  { id: 'animaux', emoji: '🐾', label: 'Animaux & Nature' },
  { id: 'transport', emoji: '🚗', label: 'Transport & Livraison' },
  { id: 'cours', emoji: '📚', label: 'Cours & Coaching' },
]

export default function Filters() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [searchParams] = useSearchParams()

  const [sort, setSort] = useState(searchParams.get('sort') || 'pertinence')
  const [radius, setRadius] = useState(Number(searchParams.get('radius')) || 10)
  const [selectedCategories, setSelectedCategories] = useState(
    searchParams.get('categories')?.split(',').filter(Boolean) || []
  )

  function toggleCategory(id) {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  function handleReset() {
    setSort('pertinence')
    setRadius(10)
    setSelectedCategories([])
  }

  function handleApply() {
    const params = new URLSearchParams()
    if (sort !== 'pertinence') params.set('sort', sort)
    if (radius !== 10) params.set('radius', radius.toString())
    if (selectedCategories.length) params.set('categories', selectedCategories.join(','))
    navigate(`/maker?${params.toString()}`)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header
        title={t('maker.filters.titre')}
        onBack={() => navigate(-1)}
        rightAction={
          <button onClick={handleReset} className="text-xs font-semibold text-[#5B6BF5]">
            {t('maker.filters.reinitialiser')}
          </button>
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 px-5 pt-2 pb-10 flex flex-col gap-6 overflow-y-auto"
      >
        {/* Sort */}
        <div>
          <p className="text-sm font-bold text-[#1A1A2E] mb-3">{t('maker.filters.tri')}</p>
          <div className="flex gap-2">
            {SORT_OPTIONS.map((opt) => {
              const isActive = sort === opt.id
              return (
                <button
                  key={opt.id}
                  onClick={() => setSort(opt.id)}
                  className="flex-1 h-12 rounded-2xl text-sm font-semibold transition-all flex items-center justify-center gap-2"
                  style={isActive
                    ? { background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)', color: '#fff' }
                    : { background: '#F7F8FC', color: '#1A1A2E' }
                  }
                >
                  <span>{opt.icon}</span>
                  {t(`maker.filters.${opt.id}`)}
                </button>
              )
            })}
          </div>
        </div>

        {/* Radius slider */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-[#1A1A2E]">{t('maker.filters.rayon')}</p>
            <span className="text-sm font-bold text-[#5B6BF5]">{radius} km</span>
          </div>
          <div className="relative">
            <input
              type="range"
              min={1}
              max={50}
              value={radius}
              onChange={(e) => setRadius(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #5B6BF5 0%, #9B59F5 ${(radius / 50) * 100}%, #F0F0F0 ${(radius / 50) * 100}%)`,
              }}
            />
            <div className="flex justify-between mt-2">
              <span className="text-[10px] text-[#8A8A9A]">1 km</span>
              <span className="text-[10px] text-[#8A8A9A]">50 km</span>
            </div>
          </div>
        </div>

        {/* Categories */}
        <div>
          <p className="text-sm font-bold text-[#1A1A2E] mb-3">{t('maker.filters.categories')}</p>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORIES.map((cat) => {
              const isActive = selectedCategories.includes(cat.id)
              return (
                <button
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  className="flex items-center gap-2.5 px-4 py-3.5 rounded-2xl text-left transition-all border-2"
                  style={isActive
                    ? { borderColor: '#5B6BF5', background: '#EEF0FF' }
                    : { borderColor: '#F0F0F0', background: '#fff' }
                  }
                >
                  <span className="text-lg">{cat.emoji}</span>
                  <span className={`text-xs font-semibold leading-tight ${isActive ? 'text-[#5B6BF5]' : 'text-[#1A1A2E]'}`}>
                    {cat.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </motion.div>

      {/* CTA */}
      <div className="px-5 pb-8 pt-3 bg-white border-t border-[#F0F0F0]">
        <Button onClick={handleApply}>
          {t('maker.filters.voir_resultats', { count: '—' })}
        </Button>
      </div>
    </div>
  )
}
