import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Button from '../../components/ui/Button'

export default function OnboardingStep2() {
  const navigate = useNavigate()

  return (
    <div className="fixed inset-0 bg-white flex items-center justify-center">
      <div className="w-full max-w-[430px] h-[100dvh] flex flex-col overflow-hidden relative"
        style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.15) 25%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.15) 55%, rgba(0,0,0,0.5) 72%, rgba(0,0,0,0.9) 85%, rgba(0,0,0,1) 100%)', backgroundColor: '#fff' }}>

        <button
          onClick={() => navigate('/auth')}
          className="absolute top-4 right-5 z-30 text-[12px] font-semibold text-white/80 hover:text-white transition-colors"
        >
          Se connecter
        </button>

        {/* Illustration génie */}
        <div className="flex-1 flex items-center justify-center px-8">
          <motion.div
            initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-64 h-64 flex items-center justify-center"
          >
            <img src="/images/genie.svg" alt="Génie" className="w-full h-full object-contain drop-shadow-2xl" />
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
            {[false, true, false].map((active, i) => (
              <div key={i} className={`rounded-full transition-all ${active ? 'w-6 h-2' : 'w-2 h-2'}`}
                style={{ background: active ? 'linear-gradient(135deg,#5B6BF5,#9B59F5)' : 'rgba(255,255,255,0.3)' }}/>
            ))}
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-white font-bold text-2xl">Du temps libre ? Deviens un Génie !</h2>
            <p className="text-white/70 text-sm leading-relaxed">
              Un talent, un coup de main, une bonne vibe…<br />
              Et hop, tu exauces des vœux autour de toi.
            </p>
          </div>

          <Button onClick={() => navigate('/onboarding/3')}>Continuer</Button>
        </motion.div>
      </div>
    </div>
  )
}
