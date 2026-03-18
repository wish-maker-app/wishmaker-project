import { motion } from 'framer-motion'
import Modal from './Modal'
import Button from './Button'

/**
 * Modal de succès réutilisable
 * variant: 'login' | 'register'
 */
export default function SuccessModal({ isOpen, variant = 'login', onContinue }) {
  const content = {
    login: {
      titre: 'Vous vous êtes connecté avec succès',
      sous: 'Bienvenue sur Wish Maker !',
      btn: 'Continuer',
    },
    register: {
      titre: 'Votre compte a été créé avec succès !',
      sous: 'Vous êtes prêt à rejoindre la communauté.',
      btn: 'Continuer',
    },
    password: {
      titre: 'Mot de passe modifié !',
      sous: 'Vous pouvez maintenant vous connecter.',
      btn: 'Se connecter',
    },
  }

  const c = content[variant] || content.login

  return (
    <Modal isOpen={isOpen} onClose={() => {}}>
      <div className="bg-white rounded-3xl p-8 flex flex-col items-center gap-5 text-center shadow-2xl">
        {/* Icône check animée */}
        <motion.div
          className="w-16 h-16 rounded-full bg-[#22C55E] flex items-center justify-center"
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.1 }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <motion.path
              d="M5 13l4 4L19 7"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.4, delay: 0.3 }}
            />
          </svg>
        </motion.div>

        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-bold text-[#1A1A2E]">{c.titre}</h2>
          <p className="text-sm text-[#8A8A9A]">{c.sous}</p>
        </div>

        <Button onClick={onContinue}>{c.btn}</Button>
      </div>
    </Modal>
  )
}
