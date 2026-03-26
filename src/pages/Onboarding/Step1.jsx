import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Button from '../../components/ui/Button'

export default function OnboardingStep1() {
  const navigate = useNavigate()

  return (
    <div className="fixed inset-0 flex flex-col"
      style={{ background: 'radial-gradient(ellipse at 50% 30%, #9E9E9E 0%, #424242 60%, #1A1A1A 100%)' }}>

      {/* Barre de progression */}
      <div className="flex gap-2 px-6 pt-8">
        {[true, false, false].map((active, i) => (
          <div key={i} className="h-1 flex-1 rounded-full overflow-hidden bg-white/20">
            {active && <div className="h-full rounded-full" style={{ background: 'linear-gradient(135deg, #5B6BF5, #9B59F5)' }} />}
          </div>
        ))}
      </div>

      {/* Illustration */}
      <div className="flex-1 flex items-center justify-center px-8">
        <motion.div
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-56 h-56 flex items-center justify-center"
        >
          <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Lampe magique */}
            <ellipse cx="100" cy="160" rx="60" ry="8" fill="rgba(91,107,245,0.2)"/>
            <path d="M60 120 Q55 90 70 70 Q85 45 100 40 Q115 45 130 70 Q145 90 140 120 L130 130 L70 130 Z"
              fill="url(#lamp1)"/>
            <path d="M70 130 Q75 145 100 150 Q125 145 130 130 Z" fill="url(#lamp2)"/>
            <path d="M85 150 L80 165 Q100 170 120 165 L115 150 Z" fill="url(#lamp3)"/>
            <path d="M80 165 Q100 172 120 165 L118 172 Q100 178 82 172 Z" fill="url(#lamp2)"/>
            <circle cx="100" cy="82" r="18" fill="white" fillOpacity="0.9"/>
            <path d="M93 82l4.5 4.5L107 77" stroke="url(#lamp1)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            {/* Étoiles */}
            <path d="M40 50l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" fill="#5B6BF5" opacity="0.8"/>
            <path d="M155 60l1.5 3 3 1.5-3 1.5-1.5 3-1.5-3-3-1.5 3-1.5z" fill="#9B59F5" opacity="0.8"/>
            <path d="M165 40l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" fill="#5B6BF5" opacity="0.6"/>
            <defs>
              <linearGradient id="lamp1" x1="0" y1="0" x2="1" y2="1">
                <stop stopColor="#5B6BF5"/><stop offset="1" stopColor="#9B59F5"/>
              </linearGradient>
              <linearGradient id="lamp2" x1="0" y1="0" x2="0" y2="1">
                <stop stopColor="#4A5CE0"/><stop offset="1" stopColor="#8B4AE0"/>
              </linearGradient>
              <linearGradient id="lamp3" x1="0" y1="0" x2="1" y2="0">
                <stop stopColor="#6B7CF5"/><stop offset="1" stopColor="#AB69F5"/>
              </linearGradient>
            </defs>
          </svg>
        </motion.div>
      </div>

      {/* Contenu bas */}
      <motion.div
        initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="px-6 pb-12 flex flex-col gap-6"
        style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)', paddingTop: 40 }}
      >
        {/* Dots */}
        <div className="flex gap-2 justify-center">
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
