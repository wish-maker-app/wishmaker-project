import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Header from '../../components/layout/Header'
import Button from '../../components/ui/Button'
import useMakerStore from '../../store/makerStore'

const SORT_OPTIONS = [
  { id: 'urgent', label: 'Urgent', icon: '⚡' },
  { id: 'distance', label: 'Distance', icon: '📍' },
  { id: 'recent', label: 'Plus récents', icon: '🕐' },
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
  const { sortBy, setSortBy, maxDistance, setMaxDistance, selectedCategories, setSelectedCategories, resetFilters } = useMakerStore()

  function toggleCategory(id) {
    if (selectedCategories.includes(id)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== id))
    } else {
      setSelectedCategories([...selectedCategories, id])
    }
  }

  function handleApply() {
    navigate(-1)
  }

  function handleReset() {
    resetFilters()
  }

  // Compteur filtres actifs
  const activeCount = (sortBy ? 1 : 0) + (maxDistance !== 100 ? 1 : 0) + (selectedCategories.length > 0 ? 1 : 0)

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header
        title="Filtres"
        onBack={() => navigate(-1)}
        rightAction={
          activeCount > 0 ? (
            <button onClick={handleReset} className="text-xs font-semibold text-[#5B6BF5]">
              Réinitialiser
            </button>
          ) : null
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 px-5 pt-4 pb-10 flex flex-col gap-8 overflow-y-auto"
      >
        {/* Trier par */}
        <div>
          <p className="text-sm font-bold text-[#1A1A2E] mb-3">Trier par</p>
          <div className="flex gap-2">
            {SORT_OPTIONS.map((opt) => {
              const isActive = sortBy === opt.id
              return (
                <button
                  key={opt.id}
                  onClick={() => setSortBy(isActive ? null : opt.id)}
                  className="flex-1 h-12 rounded-2xl text-sm font-semibold transition-all flex items-center justify-center gap-1.5"
                  style={isActive
                    ? { background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)', color: '#fff' }
                    : { background: '#F7F8FC', color: '#1A1A2E', border: '1px solid #E8E8E8' }
                  }
                >
                  <span>{opt.icon}</span>
                  {opt.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Rayon de recherche */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-bold text-[#1A1A2E]">Rayon de recherche</p>
            <span className="text-sm font-bold" style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              {maxDistance >= 100 ? '100+ km' : `${maxDistance} km`}
            </span>
          </div>
          <div className="relative">
            <input
              type="range"
              min={1}
              max={100}
              value={maxDistance}
              onChange={(e) => setMaxDistance(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #5B6BF5 0%, #9B59F5 ${(maxDistance / 100) * 100}%, #F0F0F0 ${(maxDistance / 100) * 100}%)`,
              }}
            />
            <div className="flex justify-between mt-2">
              <span className="text-[10px] text-[#8A8A9A]">1 km</span>
              <span className="text-[10px] text-[#8A8A9A]">100+ km</span>
            </div>
          </div>
          <p className="text-xs text-[#8A8A9A] mt-2 text-center">
            Rayon actuel : {maxDistance >= 100 ? '100+ km (illimité)' : `${maxDistance} km`}
          </p>
        </div>

        {/* Catégories */}
        <div>
          <p className="text-sm font-bold text-[#1A1A2E] mb-3">Catégories</p>
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
      <div className="px-5 pb-8 pt-3 bg-white border-t border-[#F0F0F0]"
        style={{ paddingBottom: 'calc(2rem + env(safe-area-inset-bottom, 0px))' }}>
        <Button onClick={handleApply}>
          Valider
        </Button>
      </div>
    </div>
  )
}
