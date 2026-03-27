import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Button from '../../components/ui/Button'

export default function OnboardingStep2() {
  const navigate = useNavigate()

  return (
    <div className="fixed inset-0 flex flex-col bg-white">

      {/* Barre de progression */}
      <div className="flex gap-2 px-6 pt-10">
        {[false, true, false].map((active, i) => (
          <div key={i} className="h-1 flex-1 rounded-full overflow-hidden bg-gray-200">
            {active && <div className="h-full rounded-full" style={{ background: 'linear-gradient(135deg, #5B6BF5, #9B59F5)' }} />}
          </div>
        ))}
      </div>

      {/* Illustration génie */}
      <div className="flex-1 flex items-center justify-center px-8">
        <motion.img
          src="/Onboarding 4.png"
          alt="Génie"
          initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="w-72 h-auto object-contain"
        />
      </div>

      {/* Contenu bas */}
      <motion.div
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="px-6 pb-12 flex flex-col gap-6"
      >
        <div className="flex gap-2 justify-center">
          {[false, true, false].map((active, i) => (
            <div key={i} className={`rounded-full transition-all ${active ? 'w-6 h-2' : 'w-2 h-2'}`}
              style={{ background: active ? 'linear-gradient(135deg,#5B6BF5,#9B59F5)' : '#E0E0E0' }}/>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="font-bold text-2xl" style={{ color: '#1A1A2E' }}>Du temps libre ? Deviens un Génie ! ✨</h2>
          <p className="text-sm leading-relaxed" style={{ color: '#8A8A9A' }}>
            Parcourez les vœux autour de vous et proposez vos services à ceux qui en ont besoin.
          </p>
        </div>

        <Button onClick={() => navigate('/onboarding/3')}>Continuer</Button>
      </motion.div>
    </div>
  )
}
