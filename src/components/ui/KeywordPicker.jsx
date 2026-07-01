import { useState, useMemo, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { useCatalog } from '../../hooks/useTags'

/**
 * Picker de mots-clés style Leboncoin.
 *
 * Champ de recherche avec autocomplete : l'user tape, on filtre les tags
 * existants en BDD (via useCatalog), il sélectionne dans la liste qui tombe
 * sous le champ. Les tags sélectionnés sont affichés en chips au-dessus,
 * cliquables pour retirer.
 *
 * Props :
 *  - value : uuid[] des tag_ids sélectionnés
 *  - onChange : fn(newTagIds[]) → callback à chaque ajout/retrait
 *  - max : limite du nombre de mots-clés (défaut 5)
 *  - autoFocus : bool — focus auto sur le champ au mount
 *  - suggestedTags : tag[] proposés (style Leboncoin) dans le dropdown quand
 *    le champ est focus et vide — avant que l'user tape sa propre recherche
 */
export default function KeywordPicker({ value = [], onChange, max = 5, autoFocus = false, suggestedTags = [] }) {
  const { t } = useTranslation()
  const { tags, loaded } = useCatalog()
  const [query, setQuery] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const inputRef = useRef(null)

  // Map tag_id → tag (pour rendre les chips à partir des ids)
  const tagsById = useMemo(() => new Map(tags.map((t) => [t.id, t])), [tags])

  const quickSuggestions = useMemo(() => {
    const selected = new Set(value)
    return suggestedTags.filter((tag) => !selected.has(tag.id))
  }, [suggestedTags, value])

  // Suggestions filtrées : on évite d'afficher les tags déjà sélectionnés.
  // Ranking : startsWith > includes, le tout sans accents (NFD) pour tolérer
  // "cafe" → "Café".
  const suggestions = useMemo(() => {
    if (!query.trim()) return []
    const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
    const q = norm(query.trim())
    const selected = new Set(value)
    const candidates = tags.filter((tag) => !selected.has(tag.id) && norm(tag.label).includes(q))
    candidates.sort((a, b) => {
      const aStart = norm(a.label).startsWith(q) ? 0 : 1
      const bStart = norm(b.label).startsWith(q) ? 0 : 1
      if (aStart !== bStart) return aStart - bStart
      return a.label.localeCompare(b.label)
    })
    return candidates.slice(0, 8)
  }, [query, tags, value])

  const reachedMax = value.length >= max

  const addTag = useCallback(
    (tagId) => {
      if (reachedMax) return
      if (value.includes(tagId)) return
      onChange([...value, tagId])
      setQuery('')
      setShowDropdown(false)
      // Garde le focus pour permettre d'enchaîner d'autres mots-clés
      inputRef.current?.focus()
    },
    [value, onChange, reachedMax]
  )

  const removeTag = useCallback(
    (tagId) => {
      onChange(value.filter((id) => id !== tagId))
    },
    [value, onChange]
  )

  // Submit (touche Entrée) → sélectionne la première suggestion si présente
  function handleKeyDown(e) {
    if (e.key === 'Enter' && suggestions.length > 0) {
      e.preventDefault()
      addTag(suggestions[0].id)
    } else if (e.key === 'Backspace' && !query && value.length > 0) {
      // Backspace sur champ vide → retire le dernier chip (UX standard)
      removeTag(value[value.length - 1])
    }
  }

  return (
    <div className="flex flex-col gap-3">
      {/* Chips sélectionnés */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <AnimatePresence initial={false}>
            {value.map((tagId) => {
              const tag = tagsById.get(tagId)
              if (!tag) return null
              return (
                <motion.button
                  key={tagId}
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => removeTag(tagId)}
                  className="h-9 pl-3.5 pr-2 rounded-full text-[13px] font-semibold flex items-center gap-1.5 text-white"
                  style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
                >
                  <span>{tag.label}</span>
                  <span className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </span>
                </motion.button>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Champ de recherche */}
      <div className="relative">
        <span className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8A8A9A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setShowDropdown(true)
          }}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          // onBlur avec léger delay pour permettre le click sur une suggestion
          // (sinon onMouseDown manque parce que l'input perd le focus avant)
          onBlur={() => setTimeout(() => setShowDropdown(false), 120)}
          placeholder={reachedMax ? t('wisher.create.keywords.max_atteint', `${max} maximum`) : t('wisher.create.keywords.search_ph')}
          disabled={reachedMax}
          autoFocus={autoFocus}
          className="w-full h-12 bg-[#F5F5F7] rounded-2xl pl-11 pr-4 text-sm text-[#1A1A2E] outline-none focus:ring-2 focus:ring-[#5B6BF5]/20 transition-shadow disabled:opacity-50"
        />

        {/* Dropdown : résultats de recherche si l'user tape, sinon suggestions au focus */}
        <AnimatePresence>
          {showDropdown && loaded && (query.trim() ? true : quickSuggestions.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
              className="absolute top-full left-0 right-0 mt-1 bg-white rounded-2xl border border-[#E0E0E0] shadow-lg overflow-hidden z-30"
            >
              {query.trim() ? (
                suggestions.length === 0 ? (
                  <p className="px-4 py-3 text-sm text-[#8A8A9A]">
                    {t('wisher.create.keywords.aucun')}
                  </p>
                ) : (
                  suggestions.map((tag) => (
                    <button
                      key={tag.id}
                      // onMouseDown plutôt que onClick : se déclenche AVANT onBlur de
                      // l'input, donc le click ne disparaît pas dans le timeout.
                      onMouseDown={(e) => { e.preventDefault(); addTag(tag.id) }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F5F5F7] active:bg-[#EEF0FF] transition-colors text-left border-b border-[#F0F0F0] last:border-b-0"
                    >
                      <span className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg,#EEF0FF,#F2E9FF)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5B6BF5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                          <line x1="7" y1="7" x2="7.01" y2="7" />
                        </svg>
                      </span>
                      <span className="text-sm font-medium text-[#1A1A2E]">{tag.label}</span>
                    </button>
                  ))
                )
              ) : (
                <>
                  <p className="px-4 pt-3 pb-1 text-[11px] font-bold text-[#8A8A9A] uppercase tracking-wide">
                    ✨ Suggestions
                  </p>
                  {quickSuggestions.map((tag) => (
                    <button
                      key={tag.id}
                      onMouseDown={(e) => { e.preventDefault(); addTag(tag.id) }}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F5F5F7] active:bg-[#EEF0FF] transition-colors text-left border-b border-[#F0F0F0] last:border-b-0"
                    >
                      <span className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg,#EEF0FF,#F2E9FF)' }}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#5B6BF5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                          <line x1="7" y1="7" x2="7.01" y2="7" />
                        </svg>
                      </span>
                      <span className="text-sm font-medium text-[#1A1A2E]">{tag.label}</span>
                    </button>
                  ))}
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Compteur */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-[#8A8A9A]">
          {t('wisher.create.keywords.compteur', { n: value.length, max })}
        </span>
        {value.length === 0 && (
          <span className="text-[#F59E0B] font-medium">{t('wisher.create.keywords.min_required')}</span>
        )}
      </div>
    </div>
  )
}
