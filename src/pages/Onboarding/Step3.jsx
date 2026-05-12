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
    <div className="fixed inset-0 bg-white flex items-center justify-center">
      <div className="w-full max-w-[430px] h-[100dvh] flex flex-col overflow-hidden relative">

        <button
          onClick={() => navigate('/auth')}
          className="absolute top-4 right-5 z-30 text-[12px] font-semibold text-white/80 hover:text-white transition-colors"
        >
          Se connecter
        </button>

        {/* Image de fond carte Toulouse */}
        <div className="absolute inset-0">
          <img
            src="/images/carte-toulouse.jpg"
            alt="Carte Toulouse"
            className="w-full h-full object-cover"
            onError={(e) => { e.target.style.display = 'none' }}
          />
          <div className="absolute inset-0 bg-gradient-to-br from-[#5B6BF5] to-[#9B59F5]" style={{ zIndex: -1 }} />
        </div>

        {/* Dégradé par dessus la carte */}
        <div className="absolute inset-0"
          style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.05) 25%, rgba(0,0,0,0) 40%, rgba(0,0,0,0.15) 55%, rgba(0,0,0,0.5) 72%, rgba(0,0,0,0.9) 85%, rgba(0,0,0,1) 100%)' }} />

        {/* Avatars fictifs sur la carte */}
        <div className="absolute inset-0 z-10">
          <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3, duration: 0.4 }}
            className="absolute" style={{ top: '22%', left: '20%' }}>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#F5C542] to-[#E8A820] flex items-center justify-center font-bold text-white text-sm border-2 border-white shadow-lg">
                MB
              </div>
              <div className="flex items-center gap-0.5 mt-1">
                <svg width="10" height="10" viewBox="0 0 12 12" fill="#F5C542"><path d="M6 1l1.35 2.74L10.5 4.27l-2.25 2.19.53 3.09L6 8.1l-2.78 1.45.53-3.09L1.5 4.27l3.15-.53L6 1z"/></svg>
                <span className="text-xs font-bold text-[#1A1A2E]">4.3</span>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5, duration: 0.4 }}
            className="absolute" style={{ top: '30%', right: '22%' }}>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#5B6BF5] to-[#9B59F5] flex items-center justify-center font-bold text-white text-sm border-2 border-white shadow-lg">
                AR
              </div>
              <div className="flex items-center gap-0.5 mt-1">
                <svg width="10" height="10" viewBox="0 0 12 12" fill="#F5C542"><path d="M6 1l1.35 2.74L10.5 4.27l-2.25 2.19.53 3.09L6 8.1l-2.78 1.45.53-3.09L1.5 4.27l3.15-.53L6 1z"/></svg>
                <span className="text-xs font-bold text-[#1A1A2E]">4.8</span>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.7, duration: 0.4 }}
            className="absolute" style={{ top: '45%', left: '15%' }}>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#E8A820] to-[#F5C542] flex items-center justify-center font-bold text-white text-sm border-2 border-white shadow-lg">
                LC
              </div>
              <div className="flex items-center gap-0.5 mt-1">
                <svg width="10" height="10" viewBox="0 0 12 12" fill="#F5C542"><path d="M6 1l1.35 2.74L10.5 4.27l-2.25 2.19.53 3.09L6 8.1l-2.78 1.45.53-3.09L1.5 4.27l3.15-.53L6 1z"/></svg>
                <span className="text-xs font-bold text-[#1A1A2E]">4.7</span>
              </div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.9, duration: 0.4 }}
            className="absolute" style={{ top: '42%', right: '12%' }}>
            <div className="flex flex-col items-center">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#5B6BF5] to-[#9B59F5] flex items-center justify-center font-bold text-white text-sm border-2 border-white shadow-lg">
                JD
              </div>
              <div className="flex items-center gap-0.5 mt-1">
                <svg width="10" height="10" viewBox="0 0 12 12" fill="#F5C542"><path d="M6 1l1.35 2.74L10.5 4.27l-2.25 2.19.53 3.09L6 8.1l-2.78 1.45.53-3.09L1.5 4.27l3.15-.53L6 1z"/></svg>
                <span className="text-xs font-bold text-[#1A1A2E]">4.5</span>
              </div>
            </div>
          </motion.div>

        </div>

        {/* Contenu bas */}
        <div className="absolute bottom-0 left-0 right-0 z-20">
          <motion.div
            initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="px-6 pb-12 pt-16 flex flex-col gap-6"
          >
            {/* Dots */}
            <div className="flex gap-2">
              {[false, false, true].map((active, i) => (
                <div key={i} className={`rounded-full transition-all ${active ? 'w-6 h-2' : 'w-2 h-2'}`}
                  style={{ background: active ? 'linear-gradient(135deg,#5B6BF5,#9B59F5)' : 'rgba(255,255,255,0.3)' }}/>
              ))}
            </div>

            <div className="flex flex-col gap-2">
              <h2 className="text-white font-bold text-2xl">Simple, rapide & gratifiant</h2>
              <p className="text-white/70 text-sm leading-relaxed">
                Une mise en relation instantanée grâce à notre carte interactive. Suivez vos vœux en temps réel.
              </p>
            </div>

            <Button onClick={handleCommencer}>Commencer</Button>

            {/* Footer organisation — exigence Apple Developer Program :
                identification publique de l'éditeur + contact accessible
                sans connexion. */}
            <p className="text-center text-[11px] text-white/60 mt-2 leading-relaxed">
              Wish Maker — édité par WISH MAKER SAS
              <br />
              <a href="mailto:contact@wishmaker.fr" className="underline hover:text-white/90">
                contact@wishmaker.fr
              </a>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
