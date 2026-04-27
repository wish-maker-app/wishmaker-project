import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import Header from '../../components/layout/Header'
import { useWishes } from '../../hooks/useWishes'
import { formatLocation } from '../../lib/geo'

const STORAGE_KEY = 'maker_search_history'

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []
  } catch {
    return []
  }
}

function saveHistory(history) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history.slice(0, 10)))
}

function Avatar({ user, size = 36 }) {
  const initials = `${user.prenom[0]}${user.nom[0]}`
  return (
    <div
      className="rounded-full flex items-center justify-center flex-shrink-0 font-bold text-white text-xs"
      style={{ width: size, height: size, background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
    >
      {initials}
    </div>
  )
}

export default function Search() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const inputRef = useRef(null)
  const { getAvailableWishes, loading } = useWishes()
  const [query, setQuery] = useState('')
  const [wishes, setWishes] = useState([])
  const [history, setHistory] = useState(getHistory)

  useEffect(() => {
    getAvailableWishes()
      .then(setWishes)
      .catch((err) => {
        console.error('[Search]', err)
        toast.error('Erreur de chargement')
      })
  }, [])

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const results = query.trim().length >= 2
    ? wishes.filter((w) =>
        w.titre.toLowerCase().includes(query.toLowerCase()) ||
        w.description.toLowerCase().includes(query.toLowerCase()) ||
        (w.tags || []).some((tag) => tag.toLowerCase().includes(query.toLowerCase()))
      )
    : []

  function handleSelect(wish) {
    // Save to history
    const updated = [query, ...history.filter((h) => h !== query)].slice(0, 10)
    setHistory(updated)
    saveHistory(updated)
    navigate(`/maker/wish/${wish.id}`)
  }

  function handleHistoryClick(term) {
    setQuery(term)
  }

  function handleClearHistory() {
    setHistory([])
    localStorage.removeItem(STORAGE_KEY)
  }

  function handleRemoveHistoryItem(term) {
    const updated = history.filter((h) => h !== term)
    setHistory(updated)
    saveHistory(updated)
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header title="" onBack={() => navigate(-1)} />

      {/* Search input */}
      <div className="px-5 pb-4">
        <div className="relative flex items-center">
          <svg className="absolute left-4" width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="#8A8A9A" strokeWidth="2"/>
            <path d="M21 21l-3.5-3.5" stroke="#8A8A9A" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('maker.search.placeholder')}
            className="w-full h-12 bg-[#F7F8FC] rounded-full pl-10 pr-10 text-sm text-[#1A1A2E] placeholder-[#B0B0B0] outline-none"
          />
          {query && (
            <button className="absolute right-3" onClick={() => setQuery('')}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" fill="#E0E0E0"/>
                <path d="M15 9l-6 6M9 9l6 6" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-10">
        {/* Results */}
        {query.trim().length >= 2 ? (
          <div>
            <p className="text-xs text-[#8A8A9A] font-medium mb-3">
              {results.length} résultat{results.length > 1 ? 's' : ''}
            </p>
            <AnimatePresence mode="popLayout">
              {results.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {results.map((wish) => (
                    <motion.div
                      key={wish.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      onClick={() => handleSelect(wish)}
                      className="flex items-center gap-3 p-3 rounded-2xl bg-[#F7F8FC] active:bg-[#EEF0FF] cursor-pointer transition-colors"
                    >
                      <Avatar user={wish.wisher} size={40} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-[#1A1A2E] truncate">{wish.titre}</p>
                        <p className="text-xs text-[#8A8A9A] truncate">{formatLocation(wish)}</p>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                        <path d="M9 5l7 7-7 7" stroke="#8A8A9A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-16 gap-2"
                >
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none">
                    <circle cx="11" cy="11" r="7" stroke="#E0E0E0" strokeWidth="2"/>
                    <path d="M21 21l-3.5-3.5" stroke="#E0E0E0" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <p className="text-sm font-bold text-[#1A1A2E]">Aucun résultat</p>
                  <p className="text-xs text-[#8A8A9A]">Essaie d'autres mots-clés</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          /* Search history */
          history.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-bold text-[#1A1A2E]">{t('maker.search.historique')}</p>
                <button onClick={handleClearHistory} className="text-xs text-[#5B6BF5] font-semibold">
                  Effacer
                </button>
              </div>
              <div className="flex flex-col gap-1">
                {history.map((term) => (
                  <div key={term} className="flex items-center gap-3 py-3 border-b border-[#F0F0F0] last:border-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
                      <circle cx="12" cy="12" r="10" stroke="#D0D0D0" strokeWidth="2"/>
                      <path d="M12 6v6l4 2" stroke="#D0D0D0" strokeWidth="2" strokeLinecap="round"/>
                    </svg>
                    <button
                      onClick={() => handleHistoryClick(term)}
                      className="flex-1 text-left text-sm text-[#1A1A2E]"
                    >
                      {term}
                    </button>
                    <button onClick={() => handleRemoveHistoryItem(term)} className="flex-shrink-0">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                        <path d="M18 6L6 18M6 6l12 12" stroke="#D0D0D0" strokeWidth="2" strokeLinecap="round"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}
