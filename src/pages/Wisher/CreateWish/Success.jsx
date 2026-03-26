import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import confetti from 'canvas-confetti'
import Button from '../../../components/ui/Button'
import useWishFormStore from '../../../store/wishFormStore'

export default function Success() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const reset = useWishFormStore((s) => s.reset)

  useEffect(() => {
    // Confetti
    const end = Date.now() + 2000
    const colors = ['#5B6BF5', '#9B59F5', '#F5C542', '#22C55E']
    const frame = () => {
      confetti({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 }, colors })
      confetti({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 }, colors })
      if (Date.now() < end) requestAnimationFrame(frame)
    }
    frame()
  }, [])

  function handleHome() {
    reset()
    navigate('/wisher', { replace: true })
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center px-8 text-center"
      style={{ background: 'linear-gradient(160deg, #5B6BF5 0%, #9B59F5 100%)' }}>

      {/* Icône étoile animée */}
      <motion.div
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20, delay: 0.2 }}
        className="w-28 h-28 rounded-full bg-white/20 flex items-center justify-center mb-8"
      >
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-6xl"
        >
          ✨
        </motion.span>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-3xl font-bold text-white mb-3"
      >
        {t('wisher.create.succes_titre')}
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="text-white/80 text-base leading-relaxed mb-12"
      >
        {t('wisher.create.succes_sous')}
        <br />
        Les Makers autour de toi vont voir ton vœu.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.65 }}
        className="w-full"
      >
        <button
          onClick={handleHome}
          className="w-full h-14 rounded-full bg-white font-bold text-[#5B6BF5] text-base"
        >
          {t('wisher.create.retour_accueil')}
        </button>
      </motion.div>
    </div>
  )
}
