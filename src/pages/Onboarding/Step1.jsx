// Onboarding - Step 1
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Button from '../../components/ui/Button'

export default function OnboardingStep1() {
  const navigate = useNavigate()

  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center">
      <div className="w-full max-w-[430px] h-[100dvh] flex flex-col overflow-hidden"
        style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.15) 25%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.15) 55%, rgba(0,0,0,0.5) 72%, rgba(0,0,0,0.9) 85%, rgba(0,0,0,1) 100%)', backgroundColor: '#fff' }}>

        {/* Illustration lampe */}
        <div className="flex-1 flex items-center justify-center px-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-64 h-64 flex items-center justify-center"
          >
            <img src="/images/lampe.svg" alt="Wish Maker" className="w-full h-full object-contain drop-shadow-2xl" />
          </motion.div>
        </div>

        {/* Contenu bas */}
        <motion.div
          initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="px-6 pb-12 flex flex-col gap-6"
          style={{ paddingTop: 40 }}
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
              Un besoin ? Publie ton vœu en un instant, Les Génies autour de toi s'occupent du reste.
            </p>
          </div>

          <Button onClick={() => navigate('/onboarding/2')}>Continuer</Button>
        </motion.div>
      </div>
    </div>
  )
}
