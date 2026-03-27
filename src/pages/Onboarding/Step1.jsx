import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Button from '../../components/ui/Button'

export default function OnboardingStep1() {
  const navigate = useNavigate()

  return (
    <div className="fixed inset-0 flex flex-col bg-white">

      {/* Illustration */}
      <div className="flex-1 flex items-center justify-center px-8">
        <motion.img
          src="/Onboarding 5.png"
          alt="Lampe magique"
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-72 h-auto object-contain"
        />
      </div>

      {/* Contenu bas */}
      <motion.div
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="px-6 pb-12 flex flex-col gap-6"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)', paddingTop: 40 }}
      >
        {/* Dots */}
        <div className="flex gap-2">
          {[true, false, false].map((active, i) => (
            <div key={i} className={`rounded-full transition-all ${active ? 'w-6 h-2' : 'w-2 h-2'}`}
              style={{ background: active ? 'linear-gradient(135deg,#5B6BF5,#9B59F5)' : 'rgba(255,255,255,0.3)' }}/>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-white font-bold text-2xl">Bienvenue sur Wish Maker !</h2>
          <p className="text-white/70 text-sm leading-relaxed">
            Un besoin ? Publie ton vœu en un instant. Les Génies autour de toi s'occupent du reste.
          </p>
        </div>

        <Button onClick={() => navigate('/onboarding/2')}>Continuer</Button>
      </motion.div>
    </div>
  )
}
