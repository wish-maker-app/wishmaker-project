import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Button from '../../components/ui/Button'

export default function OnboardingStep3() {
  const navigate = useNavigate()

  function handleCommencer() {
    localStorage.setItem('onboarding_seen', 'true')
    navigate('/auth', { replace: true })
  }

  return (
    <div className="fixed inset-0 flex flex-col">

      {/* Image de fond (placeholder pour future belle image) */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#5B6BF5] to-[#9B59F5]" />

      {/* Overlay sombre */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Barre de progression */}
      <div className="relative z-10 flex gap-2 px-6 pt-8">
        {[false, false, true].map((active, i) => (
          <div key={i} className="h-1 flex-1 rounded-full overflow-hidden bg-white/30">
            {active && <div className="h-full rounded-full" style={{ background: 'linear-gradient(135deg, #5B6BF5, #9B59F5)' }} />}
          </div>
        ))}
      </div>

      {/* Contenu bas */}
      <div className="absolute bottom-0 left-0 right-0 z-10"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.7) 60%, transparent 100%)' }}>
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="px-6 pb-12 pt-16 flex flex-col gap-6"
        >
          <div className="flex gap-2 justify-center">
            {[false, false, true].map((active, i) => (
              <div key={i} className={`rounded-full transition-all ${active ? 'w-6 h-2' : 'w-2 h-2'}`}
                style={{ background: active ? 'linear-gradient(135deg,#5B6BF5,#9B59F5)' : 'rgba(255,255,255,0.3)' }}/>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-white font-bold text-2xl">Simple, rapide & gratifiant</h2>
            <p className="text-white/80 text-sm leading-relaxed">
              Une mise en relation instantanée grâce à notre carte interactive. Suivez vos vœux en temps réel.
            </p>
          </div>

          <Button onClick={handleCommencer}>Commencer</Button>
        </motion.div>
      </div>
    </div>
  )
}
