import { useRef, useState } from 'react'
import { motion } from 'framer-motion'

// ─────────────────────────────────────────────────────────────────────────
// Pull-to-refresh léger (zéro dépendance, juste touch events + Framer Motion).
// - S'arme UNIQUEMENT quand le conteneur scrollable est tout en haut
//   (scrollTop <= 0) et que l'utilisateur tire vers le bas.
// - Indicateur discret (cercle blanc + flèche qui tourne avec le geste, puis
//   spinner pendant le refresh).
// - Désactivé sur desktop (pas de pointeur tactile) → scroll normal intact.
// - Marche en PWA installée ET en navigateur mobile.
//
// API :
//   <PullToRefresh onRefresh={async () => {...}} className="flex-1" contentClassName="px-4 pb-24">
//     ...contenu scrollable...
//   </PullToRefresh>
//   - className        → conteneur EXTERNE (layout : h-full / flex-1, bg…)
//   - contentClassName → zone scrollable INTERNE (padding…)
// ─────────────────────────────────────────────────────────────────────────

const THRESHOLD = 70      // px (après amortissement) pour déclencher le refresh
const MAX_PULL = 110      // px max d'étirement
const MIN_SPIN_MS = 500   // durée mini d'affichage du spinner (feel)

// Détection appareil tactile → on n'active le geste que là (pas sur desktop souris).
const isTouchDevice =
  typeof window !== 'undefined' &&
  (('ontouchstart' in window) ||
    (typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches))

export default function PullToRefresh({ onRefresh, className = '', contentClassName = '', children }) {
  const scrollRef = useRef(null)
  const startY = useRef(null)
  const draggingRef = useRef(false)
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  function handleTouchStart(e) {
    if (!isTouchDevice || refreshing) return
    // N'arme le geste que si on est tout en haut du scroll.
    if ((scrollRef.current?.scrollTop ?? 0) <= 0) {
      startY.current = e.touches[0].clientY
      draggingRef.current = true
    } else {
      startY.current = null
      draggingRef.current = false
    }
  }

  function handleTouchMove(e) {
    if (startY.current == null || refreshing) return
    const dy = e.touches[0].clientY - startY.current
    if (dy <= 0) { if (pull !== 0) setPull(0); return }
    // L'utilisateur a scrollé entre-temps → on annule l'armement.
    if ((scrollRef.current?.scrollTop ?? 0) > 0) {
      startY.current = null
      draggingRef.current = false
      setPull(0)
      return
    }
    // Amortissement (résistance) : le geste paraît élastique.
    setPull(Math.min(MAX_PULL, dy * 0.5))
  }

  async function handleTouchEnd() {
    if (startY.current == null) return
    startY.current = null
    draggingRef.current = false
    if (pull >= THRESHOLD && !refreshing) {
      setRefreshing(true)
      setPull(48) // position de repos pendant le chargement
      const start = Date.now()
      try { await onRefresh?.() } catch { /* silencieux : on ne dérange pas l'utilisateur */ }
      const elapsed = Date.now() - start
      if (elapsed < MIN_SPIN_MS) await new Promise((r) => setTimeout(r, MIN_SPIN_MS - elapsed))
      setRefreshing(false)
    }
    setPull(0)
  }

  const progress = Math.min(1, pull / THRESHOLD)
  const dragging = draggingRef.current
  const indicatorY = refreshing ? 12 : pull > 0 ? Math.min(pull, MAX_PULL) - 16 : -44
  const visible = refreshing || pull > 4

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Indicateur */}
      <motion.div
        className="absolute left-1/2 top-0 -translate-x-1/2 z-20 pointer-events-none"
        animate={{ y: indicatorY, opacity: visible ? 1 : 0 }}
        transition={{ duration: dragging ? 0 : 0.2 }}
      >
        <div className="w-9 h-9 rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.12)] flex items-center justify-center">
          <div
            className={refreshing ? 'animate-spin' : ''}
            style={!refreshing ? { transform: `rotate(${progress * 270}deg)` } : undefined}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M21 12a9 9 0 1 1-2.64-6.36" stroke="#5B6BF5" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M21 4v5h-5" stroke="#5B6BF5" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        </div>
      </motion.div>

      {/* Zone scrollable */}
      <div
        ref={scrollRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className={`h-full overflow-y-auto ${contentClassName}`}
        style={{
          transform: pull > 0 ? `translateY(${pull}px)` : undefined,
          transition: dragging ? 'none' : 'transform 0.25s ease',
          overscrollBehaviorY: 'contain',
        }}
      >
        {children}
      </div>
    </div>
  )
}
