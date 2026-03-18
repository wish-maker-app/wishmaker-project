import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Button from '../../components/ui/Button'

export default function OnboardingStep2() {
  const navigate = useNavigate()

  return (
    <div className="fixed inset-0 flex flex-col"
      style={{ background: 'radial-gradient(ellipse at 50% 30%, #9E9E9E 0%, #424242 60%, #1A1A1A 100%)' }}>

      {/* Barre de progression */}
      <div className="flex gap-2 px-6 pt-14">
        {[false, true, false].map((active, i) => (
          <div key={i} className="h-1 flex-1 rounded-full overflow-hidden bg-white/20">
            {active && <div className="h-full rounded-full" style={{ background: 'linear-gradient(135deg, #5B6BF5, #9B59F5)' }} />}
          </div>
        ))}
      </div>

      {/* Illustration génie */}
      <div className="flex-1 flex items-center justify-center px-8">
        <motion.div
          initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className="w-56 h-56"
        >
          <svg viewBox="0 0 200 200" fill="none">
            <ellipse cx="100" cy="170" rx="50" ry="8" fill="rgba(91,107,245,0.2)"/>
            {/* Corps génie */}
            <path d="M100 30 C70 30 55 55 55 80 C55 105 65 120 80 130 L80 160 C80 165 85 170 100 170 C115 170 120 165 120 160 L120 130 C135 120 145 105 145 80 C145 55 130 30 100 30Z"
              fill="url(#genie1)"/>
            {/* Tête */}
            <circle cx="100" cy="55" r="25" fill="url(#genie2)"/>
            {/* Visage */}
            <circle cx="92" cy="52" r="3" fill="white"/>
            <circle cx="108" cy="52" r="3" fill="white"/>
            <path d="M93 63 Q100 68 107 63" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none"/>
            {/* Turban */}
            <path d="M75 45 Q100 30 125 45 Q120 38 100 35 Q80 38 75 45Z" fill="url(#genie3)"/>
            {/* Bras */}
            <path d="M55 90 Q35 85 30 70 Q28 60 38 58" stroke="url(#genie1)" strokeWidth="12" strokeLinecap="round" fill="none"/>
            <path d="M145 90 Q165 85 170 70 Q172 60 162 58" stroke="url(#genie1)" strokeWidth="12" strokeLinecap="round" fill="none"/>
            {/* Étoiles */}
            <path d="M28 45l1.5 3 3 1.5-3 1.5-1.5 3-1.5-3-3-1.5 3-1.5z" fill="#FFD700" opacity="0.9"/>
            <path d="M168 40l1 2 2 1-2 1-1 2-1-2-2-1 2-1z" fill="#9B59F5" opacity="0.9"/>
            <path d="M155 20l2 4 4 2-4 2-2 4-2-4-4-2 4-2z" fill="#5B6BF5" opacity="0.8"/>
            <defs>
              <linearGradient id="genie1" x1="0" y1="0" x2="1" y2="1">
                <stop stopColor="#5B6BF5"/><stop offset="1" stopColor="#9B59F5"/>
              </linearGradient>
              <linearGradient id="genie2" x1="0" y1="0" x2="0" y2="1">
                <stop stopColor="#7B8CF5"/><stop offset="1" stopColor="#5B6BF5"/>
              </linearGradient>
              <linearGradient id="genie3" x1="0" y1="0" x2="1" y2="0">
                <stop stopColor="#9B59F5"/><stop offset="1" stopColor="#5B6BF5"/>
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
        <div className="flex gap-2 justify-center">
          {[false, true, false].map((active, i) => (
            <div key={i} className={`rounded-full transition-all ${active ? 'w-6 h-2' : 'w-2 h-2'}`}
              style={{ background: active ? 'linear-gradient(135deg,#5B6BF5,#9B59F5)' : 'rgba(255,255,255,0.3)' }}/>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-white font-bold text-2xl">Du temps libre ? Deviens un Génie ! ✨</h2>
          <p className="text-white/70 text-sm leading-relaxed">
            Parcourez les vœux autour de vous et proposez vos services à ceux qui en ont besoin.
          </p>
        </div>

        <Button onClick={() => navigate('/onboarding/3')}>Continuer</Button>
      </motion.div>
    </div>
  )
}
