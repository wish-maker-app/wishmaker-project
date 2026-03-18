import { useState, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../store/authStore'
import Header from '../../components/layout/Header'
import Button from '../../components/ui/Button'
import useOnboardingStore from '../../store/onboardingStore'

function debounce(fn, delay) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

export default function ChooseLocation() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { ville: savedVille, setLocation } = useOnboardingStore()

  const [query, setQuery]         = useState(savedVille || '')
  const [suggestions, setSuggestions] = useState([])
  const [selected, setSelected]   = useState(!!savedVille)
  const [loading, setLoading]     = useState(false)

  const search = useCallback(
    debounce(async (q) => {
      if (q.length < 2) { setSuggestions([]); return }
      setLoading(true)
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=5&addressdetails=1`,
          { headers: { 'Accept-Language': 'fr' } }
        )
        const data = await res.json()
        setSuggestions(data)
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 400),
    []
  )

  function handleChange(e) {
    const val = e.target.value
    setQuery(val)
    setSelected(false)
    search(val)
  }

  function handleSelect(item) {
    const ville = item.address?.city || item.address?.town || item.address?.village || item.display_name.split(',')[0]
    setQuery(ville)
    setLocation(parseFloat(item.lat), parseFloat(item.lon), ville)
    setSelected(true)
    setSuggestions([])
  }

  const [saving, setSaving] = useState(false)

  async function handleContinue() {
    const user = useAuthStore.getState().user
    if (!user) return
    setSaving(true)
    try {
      const store = useOnboardingStore.getState()
      const { error } = await supabase
        .from('users')
        .update({
          latitude: store.latitude,
          longitude: store.longitude,
          ville: store.ville,
          langue: store.langue,
          onboarding_completed: true,
        })
        .eq('id', user.id)
      if (error) throw error

      // Met à jour le profil local
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()
      if (profile) useAuthStore.getState().setProfile(profile)

      navigate('/wisher', { replace: true })
    } catch (err) {
      toast.error(err.message || 'Erreur lors de la sauvegarde')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header title={t('setup.localisation.titre')} onBack={() => navigate('/setup/langue')} />

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col px-6 pt-2 pb-10 gap-5"
      >
        <p className="text-[#8A8A9A] text-sm leading-relaxed">
          {t('setup.localisation.sous_titre')}
        </p>

        {/* Champ recherche */}
        <div className="relative">
          <div className="relative flex items-center">
            <span className="absolute left-4 text-[#8A8A9A]">
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="text"
              value={query}
              onChange={handleChange}
              placeholder={t('setup.localisation.placeholder')}
              className="w-full h-[52px] bg-[#F5F5F7] rounded-[14px] pl-11 pr-4 text-[#1A1A2E] text-sm outline-none
                focus:ring-2 focus:ring-[#5B6BF5] border border-transparent focus:border-[#5B6BF5]
                transition-all placeholder-[#8A8A9A]"
            />
            {loading && (
              <span className="absolute right-4">
                <svg className="animate-spin h-4 w-4 text-[#5B6BF5]" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
              </span>
            )}
          </div>

          {/* Suggestions */}
          <AnimatePresence>
            {suggestions.length > 0 && (
              <motion.ul
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-lg border border-[#E0E0E0] overflow-hidden z-10"
              >
                {suggestions.map((item, i) => {
                  const name = item.address?.city || item.address?.town || item.address?.village || item.display_name.split(',')[0]
                  const detail = item.display_name.split(',').slice(1, 3).join(',').trim()
                  return (
                    <motion.li
                      key={item.place_id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1, transition: { delay: i * 0.04 } }}
                    >
                      <button
                        onClick={() => handleSelect(item)}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F5F5F7] transition-colors text-left"
                      >
                        <span className="text-[#5B6BF5] flex-shrink-0">
                          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#1A1A2E] truncate">{name}</p>
                          <p className="text-xs text-[#8A8A9A] truncate">{detail}</p>
                        </div>
                      </button>
                    </motion.li>
                  )
                })}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>

        {/* Localisation sélectionnée */}
        <AnimatePresence>
          {selected && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-3 p-4 rounded-2xl"
              style={{ background: 'linear-gradient(135deg, #5B6BF5, #9B59F5)' }}
            >
              <span className="text-2xl">📍</span>
              <div>
                <p className="text-white font-semibold text-sm">{query}</p>
                <p className="text-white/70 text-xs">Localisation sélectionnée</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Option carte */}
        <button
          onClick={() => navigate('/setup/localisation-carte')}
          className="flex items-center gap-3 p-4 rounded-2xl border border-[#E0E0E0] bg-[#F5F5F7] w-full text-left"
        >
          <span className="text-2xl">🗺️</span>
          <div>
            <p className="text-sm font-medium text-[#1A1A2E]">{t('setup.localisation.sur_carte')}</p>
            <p className="text-xs text-[#8A8A9A]">Placer un marqueur sur la carte</p>
          </div>
          <svg className="ml-auto" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#8A8A9A">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <div className="mt-auto">
          <Button onClick={handleContinue} disabled={!selected} loading={saving}>
            {t('setup.localisation.btn')}
          </Button>
        </div>
      </motion.div>
    </div>
  )
}
