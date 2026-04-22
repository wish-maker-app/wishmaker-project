import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import Header from '../../components/layout/Header'
import useMakerStore from '../../store/makerStore'
import { useCatalog } from '../../hooks/useTags'
import { CATEGORY_ICONS, CATEGORY_COLORS, DEFAULT_CATEGORY_COLOR } from '../../lib/categoryIcons'

// Icônes SVG trait pour les options de tri (cohérent avec l'iconographie du produit)
const IconZap = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
  </svg>
)
const IconPin = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0116 0z" />
    <circle cx="12" cy="10" r="3" />
  </svg>
)
const IconClock = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.85" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </svg>
)

const SORT_OPTIONS = [
  { id: 'urgent', label: 'Urgent', Icon: IconZap },
  { id: 'distance', label: 'Distance', Icon: IconPin },
  { id: 'recent', label: 'Récents', Icon: IconClock },
]

export default function Filters() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const fromView = searchParams.get('from') || 'liste'
  const { categories, loaded } = useCatalog()
  const {
    sortBy, setSortBy,
    maxDistance, setMaxDistance,
    selectedCategories, setSelectedCategories,
    resetFilters,
  } = useMakerStore()

  function toggleCategory(id) {
    if (selectedCategories.includes(id)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== id))
    } else {
      setSelectedCategories([...selectedCategories, id])
    }
  }

  function handleApply() {
    navigate(`/maker?view=${fromView}`, { replace: true })
  }

  const activeCount =
    (sortBy ? 1 : 0) +
    (maxDistance !== 100 ? 1 : 0) +
    (selectedCategories.length > 0 ? 1 : 0)

  return (
    <div className="h-screen bg-white flex flex-col relative">
      <Header
        title="Filtres"
        onBack={() => navigate(-1)}
        rightAction={
          activeCount > 0 ? (
            <button onClick={resetFilters} className="text-xs font-semibold text-[#5B6BF5]">
              Réinitialiser
            </button>
          ) : null
        }
      />

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 px-5 pt-3 pb-36 flex flex-col gap-7 overflow-y-auto"
      >
        {/* ─────────── Section 1 : Trier par ─────────── */}
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-[15px] font-bold text-[#1A1A2E] tracking-[-0.01em]">Trier par</h2>
            {sortBy && (
              <button onClick={() => setSortBy(null)} className="text-xs font-semibold text-[#8A8A9A]">
                Effacer
              </button>
            )}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {SORT_OPTIONS.map((opt) => {
              const active = sortBy === opt.id
              return (
                <motion.button
                  key={opt.id}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setSortBy(active ? null : opt.id)}
                  className="h-[52px] rounded-2xl text-[13px] font-semibold transition-all flex items-center justify-center gap-1.5"
                  style={active
                    ? {
                        background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)',
                        color: '#fff',
                        border: '1.5px solid transparent',
                        boxShadow: '0 6px 16px rgba(91,107,245,0.25)',
                      }
                    : {
                        background: '#fff',
                        color: '#1A1A2E',
                        border: '1.5px solid #EEEEF2',
                      }
                  }
                >
                  <opt.Icon size={16} />
                  {opt.label}
                </motion.button>
              )
            })}
          </div>
        </section>

        {/* ─────────── Section 2 : Rayon ─────────── */}
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-[15px] font-bold text-[#1A1A2E] tracking-[-0.01em]">Rayon de recherche</h2>
            <span
              className="text-[15px] font-bold"
              style={{
                background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              {maxDistance >= 100 ? 'Illimité' : `${maxDistance} km`}
            </span>
          </div>

          <div className="bg-[#F7F8FC] rounded-2xl px-5 py-5">
            <input
              type="range"
              min={1}
              max={100}
              value={maxDistance}
              onChange={(e) => setMaxDistance(Number(e.target.value))}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #5B6BF5 0%, #9B59F5 ${maxDistance}%, #E5E5EA ${maxDistance}%)`,
              }}
            />
            <div className="flex justify-between mt-2.5">
              <span className="text-[10.5px] text-[#8A8A9A] font-medium">1 km</span>
              <span className="text-[10.5px] text-[#8A8A9A] font-medium">100+ km</span>
            </div>
          </div>
        </section>

        {/* ─────────── Section 3 : Intentions ─────────── */}
        <section>
          <div className="flex items-baseline justify-between mb-3">
            <h2 className="text-[15px] font-bold text-[#1A1A2E] tracking-[-0.01em]">Intentions</h2>
            {selectedCategories.length > 0 && (
              <button onClick={() => setSelectedCategories([])} className="text-xs font-semibold text-[#8A8A9A]">
                Effacer ({selectedCategories.length})
              </button>
            )}
          </div>

          {!loaded ? (
            <div className="h-16 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full border-2 border-[#5B6BF5] border-t-transparent animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
              {categories.map((cat, i) => {
                const active = selectedCategories.includes(cat.id)
                const Icon = CATEGORY_ICONS[cat.slug]
                const theme = CATEGORY_COLORS[cat.slug] || DEFAULT_CATEGORY_COLOR

                return (
                  <motion.button
                    key={cat.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.22 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => toggleCategory(cat.id)}
                    aria-pressed={active}
                    className="relative rounded-2xl flex items-center gap-2.5 text-left overflow-hidden"
                    style={{
                      padding: '12px 14px',
                      border: `1.5px solid ${active ? theme.hue : '#EEEEF2'}`,
                      background: active ? theme.tint : '#FFFFFF',
                      boxShadow: active ? `0 4px 14px ${theme.hue}22` : 'none',
                      transition: 'all 0.22s cubic-bezier(0.25,0.1,0.25,1)',
                    }}
                  >
                    {Icon && (
                      <span
                        className="flex items-center justify-center flex-shrink-0"
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 10,
                          background: active ? theme.grad : theme.tint,
                          color: active ? '#fff' : theme.hue,
                          transition: 'all 0.22s',
                          boxShadow: active ? `0 2px 8px ${theme.hue}44` : 'none',
                        }}
                      >
                        <Icon size={18} stroke={1.85} />
                      </span>
                    )}
                    <span
                      className="text-[12.5px] font-bold leading-tight"
                      style={{
                        color: active ? theme.deep : '#1A1A2E',
                        letterSpacing: '-0.01em',
                        transition: 'color 0.22s',
                      }}
                    >
                      {cat.label}
                    </span>
                  </motion.button>
                )
              })}
            </div>
          )}
        </section>
      </motion.div>

      {/* ─────────── CTA ─────────── */}
      <div
        className="absolute left-0 right-0 bottom-0 px-5 pt-4 pb-6"
        style={{
          background: 'linear-gradient(to top, #FFFFFF 70%, rgba(255,255,255,0))',
          paddingBottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
        }}
      >
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={handleApply}
          className="w-full h-[52px] rounded-2xl font-bold text-[15px] flex items-center justify-center text-white"
          style={{
            background: 'linear-gradient(135deg,#5B6BF5 0%,#9B59F5 100%)',
            letterSpacing: '-0.01em',
            boxShadow: '0 6px 20px rgba(91,107,245,0.3)',
          }}
        >
          {activeCount > 0
            ? `Appliquer ${activeCount} filtre${activeCount > 1 ? 's' : ''}`
            : 'Voir tous les vœux'}
        </motion.button>
      </div>
    </div>
  )
}
