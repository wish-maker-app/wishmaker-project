import { useRef, useCallback, useEffect, Children } from 'react'

/**
 * Rangée horizontale « aimantée » façon Airbnb : scroll-snap NATIF (on cale
 * toujours sur la prochaine card, impossible de swiper n'importe où) + drag à
 * la souris sur desktop + report de l'index de la card active via
 * onActiveChange(index) pour piloter des pastilles dynamiques.
 *
 * Les enfants doivent être `flex-shrink-0` + `snap-start`. Le conteneur reçoit
 * `flex gap-x ...` via `className` (comme l'ancien DragScroll).
 */
export default function SnapRow({ children, className = '', onActiveChange }) {
  const ref = useRef(null)
  const rafRef = useRef(0)
  const lastActive = useRef(-1)
  const drag = useRef({ on: false, startX: 0, startScroll: 0, moved: false })

  const computeActive = useCallback(() => {
    const el = ref.current
    if (!el || el.children.length === 0) return
    // Card active = celle dont le bord gauche est le plus proche du bord de
    // lecture (≈ scroll-padding). Robuste quelle que soit la largeur des cards.
    const anchor = el.getBoundingClientRect().left + 16
    let best = 0
    let bestDist = Infinity
    for (let i = 0; i < el.children.length; i++) {
      const d = Math.abs(el.children[i].getBoundingClientRect().left - anchor)
      if (d < bestDist) { bestDist = d; best = i }
    }
    if (best !== lastActive.current) {
      lastActive.current = best
      onActiveChange?.(best)
    }
  }, [onActiveChange])

  function onScroll() {
    if (rafRef.current) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0
      computeActive()
    })
  }

  // Drag souris (desktop) : on coupe le snap pendant le drag (sinon le
  // navigateur ré-aligne en continu → les cards "ne bougent pas"), puis on le
  // réactive au relâché → glissement doux jusqu'au snap-point le plus proche.
  function onMouseDown(e) {
    const el = ref.current
    if (!el) return
    drag.current = { on: true, startX: e.pageX, startScroll: el.scrollLeft, moved: false }
    // Pendant le drag : snap coupé + scroll instantané (suit le doigt sans lag).
    el.style.scrollSnapType = 'none'
    el.style.scrollBehavior = 'auto'
    el.style.cursor = 'grabbing'
  }
  function endDrag() {
    const el = ref.current
    if (!el || !drag.current.on) return
    drag.current.on = false
    // Au relâché : scroll-behavior smooth PUIS on réactive le snap → le
    // navigateur GLISSE doucement jusqu'à la carte la plus proche (au lieu de
    // téléporter). C'est exactement la mécanique du carrousel d'exemples.
    el.style.scrollBehavior = 'smooth'
    el.style.scrollSnapType = ''
    el.style.cursor = 'grab'
  }
  function onMouseMove(e) {
    if (!drag.current.on) return
    e.preventDefault()
    const walk = (e.pageX - drag.current.startX) * 1.2 // x1.2 = glisse plus fluide
    if (Math.abs(walk) > 5) drag.current.moved = true
    ref.current.scrollLeft = drag.current.startScroll - walk
  }
  // Bloque le clic sur une card si on vient de dragger
  const onClickCapture = useCallback((e) => {
    if (drag.current.moved) {
      e.stopPropagation()
      e.preventDefault()
      drag.current.moved = false
    }
  }, [])

  // Recalcule l'index actif au mount et quand le NOMBRE de cards change
  const count = Children.count(children)
  useEffect(() => { computeActive() }, [computeActive, count])

  return (
    <div
      ref={ref}
      onScroll={onScroll}
      onMouseDown={onMouseDown}
      onMouseUp={endDrag}
      onMouseLeave={endDrag}
      onMouseMove={onMouseMove}
      onClickCapture={onClickCapture}
      // Empêche le drag natif (images = "fantôme de fichier" + geste qui mange
      // le tracking → le mouvement n'était pas détecté → clic parasite sur la card).
      onDragStart={(e) => e.preventDefault()}
      className={`overflow-x-auto scrollbar-hide snap-x snap-mandatory ${className}`}
      style={{ cursor: 'grab', userSelect: 'none', WebkitUserDrag: 'none', scrollPaddingLeft: '16px', scrollPaddingRight: '16px' }}
    >
      {children}
    </div>
  )
}
