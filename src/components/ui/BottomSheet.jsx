import { motion, AnimatePresence, useMotionValue, animate, useDragControls } from 'framer-motion'
import { useEffect, useRef } from 'react'

/**
 * Bottom sheet reutilisable avec drag-to-dismiss facon iOS/Android natif.
 *
 * Usage :
 *
 *   <BottomSheet open={open} onClose={() => setOpen(false)}>
 *     <h2>Mon titre</h2>
 *     <p>Mon contenu</p>
 *     <button onClick={() => setOpen(false)}>Fermer</button>
 *   </BottomSheet>
 *
 * Comportement :
 * - Tap sur le backdrop noir → ferme
 * - Drag vers le bas → suit le doigt, se ferme si depasse le seuil (~25% de
 *   la hauteur du sheet) ou si la velocite est rapide
 * - Drag vers le haut → bloque (pas de mouvement up)
 * - Touche Escape → ferme
 * - Le handle bar gris en haut (la petite barre) sert d'affordance visuelle
 *
 * Le sheet utilise la classe globale `.bottom-sheet` (cf index.css) qui gere
 * la max-width 430px + le safe-area-bottom iOS.
 */
const DISMISS_THRESHOLD = 100 // px de drag necessaires pour fermer
const VELOCITY_THRESHOLD = 500 // px/s — un swipe rapide ferme meme si seuil pas atteint

export default function BottomSheet({
  open,
  onClose,
  children,
  className = '',
  maxHeight = '85vh',
  showHandle = true,
}) {
  const y = useMotionValue(0)
  // dragControls : on declenche manuellement le drag (depuis le handle OU
  // depuis le contenu si scroll est en haut). Pattern iOS classique.
  const dragControls = useDragControls()
  const scrollRef = useRef(null)
  // touchStartY pour detecter une swipe vers le BAS (drag intent) vs un
  // simple click / scroll up — sinon on bloque le scroll natif inutilement.
  const touchStartY = useRef(null)

  // onPointerDown sur le contenu : si on est tout en haut du scroll, on
  // declenche le drag (= permet de fermer en swipant depuis n'importe ou).
  // Si le contenu a deja scroll, on laisse le scroll natif faire son boulot.
  function handleContentPointerDown(e) {
    touchStartY.current = e.clientY
    const el = scrollRef.current
    if (!el) return
    if (el.scrollTop <= 0) {
      // Scroll en haut → on autorise le drag du sheet via dragControls
      dragControls.start(e)
    }
  }

  // Reset position quand on rouvre
  useEffect(() => {
    if (open) y.set(0)
  }, [open, y])

  // Escape pour fermer
  useEffect(() => {
    if (!open) return
    function onKey(e) { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  function handleDragEnd(_, info) {
    const dragged = info.offset.y
    const velocity = info.velocity.y
    if (dragged > DISMISS_THRESHOLD || velocity > VELOCITY_THRESHOLD) {
      onClose?.()
    } else {
      // Snap back
      animate(y, 0, { type: 'spring', stiffness: 400, damping: 35 })
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-[900] overlay-backdrop"
          />

          {/* Sheet (drag manuel via dragControls depuis le handle uniquement) */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            drag="y"
            dragControls={dragControls}
            dragListener={false}
            dragConstraints={{ top: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            dragMomentum={false}
            style={{ y }}
            onDragEnd={handleDragEnd}
            className={`fixed bottom-0 left-0 right-0 bg-white rounded-t-[28px] z-[901] flex flex-col bottom-sheet ${className}`}
          >
            {/* Handle bar — declenche le drag (touch + souris) via onPointerDown */}
            {showHandle && (
              <div
                onPointerDown={(e) => dragControls.start(e)}
                className="w-full pt-3 pb-2 flex justify-center cursor-grab active:cursor-grabbing select-none"
                style={{ touchAction: 'none' }}
              >
                <div className="w-12 h-1.5 rounded-full bg-[#D0D0D8]" />
              </div>
            )}

            {/* Contenu scrollable. onPointerDown declenche le drag du sheet
                UNIQUEMENT si on est en haut du scroll (scrollTop <= 0) → on
                peut donc fermer en swipant depuis n'importe ou si le contenu
                tient sur 1 ecran, mais on garde le scroll natif si le contenu
                est long et qu'on est deja en bas. */}
            <div
              ref={scrollRef}
              onPointerDown={handleContentPointerDown}
              className="px-5 pb-8 pt-1 overflow-y-auto"
              style={{ maxHeight }}
            >
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
