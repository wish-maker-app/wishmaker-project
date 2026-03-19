import { useRef, useState, useCallback } from 'react'

export default function DragScroll({ children, className = '' }) {
  const ref = useRef(null)
  const [isDragging, setIsDragging] = useState(false)
  const [hasDragged, setHasDragged] = useState(false)
  const startXRef = useRef(0)
  const scrollLeftRef = useRef(0)

  function handleMouseDown(e) {
    setIsDragging(true)
    setHasDragged(false)
    startXRef.current = e.pageX - ref.current.offsetLeft
    scrollLeftRef.current = ref.current.scrollLeft
    ref.current.style.cursor = 'grabbing'
  }

  function handleMouseUp() {
    setIsDragging(false)
    if (ref.current) ref.current.style.cursor = 'grab'
  }

  function handleMouseMove(e) {
    if (!isDragging) return
    e.preventDefault()
    const x = e.pageX - ref.current.offsetLeft
    const diff = x - startXRef.current
    if (Math.abs(diff) > 5) setHasDragged(true)
    ref.current.scrollLeft = scrollLeftRef.current - diff
  }

  // Bloque le clic sur les enfants si on a draggé
  const handleClick = useCallback((e) => {
    if (hasDragged) {
      e.stopPropagation()
      e.preventDefault()
      setHasDragged(false)
    }
  }, [hasDragged])

  return (
    <div
      ref={ref}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onMouseMove={handleMouseMove}
      onClickCapture={handleClick}
      className={`overflow-x-auto scrollbar-hide ${className}`}
      onDragStart={(e) => e.preventDefault()}
      style={{ cursor: 'grab', userSelect: 'none', WebkitUserDrag: 'none' }}
    >
      {children}
    </div>
  )
}
