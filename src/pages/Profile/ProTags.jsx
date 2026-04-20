import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Header from '../../components/layout/Header'
import useAuthStore from '../../store/authStore'
import { useCatalog, useUserTagSubscriptions } from '../../hooks/useTags'

const PRIMARY_GRADIENT = 'linear-gradient(135deg,#5B6BF5,#9B59F5)'
const TEXT_PRIMARY = '#1A1A2E'
const TEXT_SECONDARY = '#8A8A9A'
const BORDER = '#F0F0F2'

function TagPill({ tag, active, onToggle }) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={() => onToggle(tag.id)}
      className="h-9 px-4 rounded-full text-[13px] font-semibold border transition-colors"
      style={active
        ? { background: PRIMARY_GRADIENT, borderColor: 'transparent', color: '#fff' }
        : { background: '#fff', borderColor: '#E8E8E8', color: TEXT_PRIMARY }}
    >
      {tag.label}
    </motion.button>
  )
}

export default function ProTags() {
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const { categories, getTagsForCategory, loaded } = useCatalog()
  const { tagIds, toggle, loading } = useUserTagSubscriptions()
  const [search, setSearch] = useState('')

  // Accès restreint : type_compte === 'pro'
  if (profile && profile.type_compte !== 'pro') {
    return (
      <div className="h-screen bg-white flex flex-col">
        <Header title="Tags métier" onBack={() => navigate('/profile')} />
        <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(91,107,245,0.10), rgba(155,89,245,0.10))' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#5B6BF5" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
            </svg>
          </div>
          <p className="text-[15px] font-bold" style={{ color: TEXT_PRIMARY }}>Réservé aux comptes Pro</p>
          <p className="text-sm max-w-[280px]" style={{ color: TEXT_SECONDARY }}>
            Les tags métier permettent aux Makers professionnels de filtrer les vœux qui les concernent.
          </p>
        </div>
      </div>
    )
  }

  const filteredByCategory = useMemo(() => {
    if (!loaded) return []
    const q = search.trim().toLowerCase()
    return categories.map((cat) => {
      const tags = getTagsForCategory(cat.id).filter((t) =>
        !q || t.label.toLowerCase().includes(q)
      )
      return { ...cat, tags }
    }).filter((cat) => cat.tags.length > 0)
  }, [categories, getTagsForCategory, loaded, search])

  return (
    <div className="h-screen bg-white flex flex-col">
      <Header title="Mes tags métier" onBack={() => navigate('/profile')} />

      <div className="flex-1 overflow-y-auto">
        <div className="px-5 pt-2 pb-4">
          <p className="text-sm" style={{ color: TEXT_SECONDARY }}>
            Sélectionne les tags correspondant à tes services. Ton feed affichera uniquement les vœux qui correspondent.
          </p>
        </div>

        {/* Compteur + search */}
        <div className="px-5 pb-4 sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12.5px] tabular-nums" style={{ color: TEXT_SECONDARY }}>
              <span className="font-semibold" style={{ color: TEXT_PRIMARY }}>{tagIds.length}</span>{' '}
              tag{tagIds.length > 1 ? 's' : ''} suivi{tagIds.length > 1 ? 's' : ''}
            </span>
            {tagIds.length === 0 && (
              <span className="text-[12px] font-medium" style={{ color: '#F59E0B' }}>
                Ajoute au moins 1 tag pour recevoir des vœux
              </span>
            )}
          </div>
          <div className="relative">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="w-full h-10 bg-[#F5F5F7] rounded-full pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-[#5B6BF5]/20"
            />
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8A8A9A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
            </svg>
          </div>
        </div>

        {/* Loading state */}
        {(!loaded || loading) && (
          <div className="flex items-center justify-center py-12">
            <div className="w-5 h-5 rounded-full border-[2px] border-[#5B6BF5] border-t-transparent animate-spin" />
          </div>
        )}

        {/* Par catégorie (avec tags dédupliqués si multi-catégories) */}
        {loaded && !loading && (
          <div className="px-5 pb-32 flex flex-col gap-5">
            {filteredByCategory.map((cat) => (
              <section key={cat.id}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">{cat.emoji}</span>
                  <h2 className="text-sm font-bold" style={{ color: TEXT_PRIMARY }}>
                    {cat.label}
                  </h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {cat.tags.map((tag) => (
                    <TagPill
                      key={tag.id}
                      tag={tag}
                      active={tagIds.includes(tag.id)}
                      onToggle={toggle}
                    />
                  ))}
                </div>
              </section>
            ))}
            {filteredByCategory.length === 0 && (
              <p className="text-center text-sm py-12" style={{ color: TEXT_SECONDARY }}>
                Aucune catégorie ne correspond à ta recherche.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
