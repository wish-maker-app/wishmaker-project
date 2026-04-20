import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../store/authStore'

/**
 * Bannière persistante qui invite l'utilisateur à vérifier son email.
 * Affichée tant que auth.users.email_confirmed_at est null.
 * Masquable pour la session courante via un bouton × (localStorage).
 */
export default function EmailVerifyBanner() {
  const user = useAuthStore((s) => s.user)
  const [emailConfirmed, setEmailConfirmed] = useState(true)
  const [dismissed, setDismissed] = useState(false)
  const [resending, setResending] = useState(false)

  useEffect(() => {
    if (!user) return
    // user.email_confirmed_at est dispo directement sur l'objet user de auth
    setEmailConfirmed(!!user.email_confirmed_at)
    const key = `email_banner_dismissed_${user.id}`
    setDismissed(sessionStorage.getItem(key) === '1')
  }, [user])

  async function handleResend() {
    if (!user?.email) return
    setResending(true)
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: user.email })
      if (error) throw error
      toast.success('Email de vérification renvoyé')
    } catch (err) {
      toast.error(err.message || 'Erreur lors du renvoi')
    } finally { setResending(false) }
  }

  function handleDismiss() {
    if (!user) return
    sessionStorage.setItem(`email_banner_dismissed_${user.id}`, '1')
    setDismissed(true)
  }

  const show = user && !emailConfirmed && !dismissed

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #FFF7ED, #FFEDD5)', borderBottom: '1px solid #FDBA74' }}
        >
          <div className="px-4 py-2.5 flex items-center gap-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#C2410C" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
              <polyline points="22,6 12,13 2,6"/>
            </svg>
            <div className="flex-1 min-w-0">
              <p className="text-[12.5px] font-semibold text-[#9A3412] leading-tight">
                Vérifie ton email pour sécuriser ton compte
              </p>
              <p className="text-[11px] text-[#C2410C] truncate">
                On a envoyé un lien à {user?.email}
              </p>
            </div>
            <button
              onClick={handleResend}
              disabled={resending}
              className="text-[11px] font-semibold text-[#9A3412] underline whitespace-nowrap disabled:opacity-50"
            >
              {resending ? '...' : 'Renvoyer'}
            </button>
            <button
              onClick={handleDismiss}
              className="w-6 h-6 rounded-full flex items-center justify-center text-[#C2410C] flex-shrink-0"
              aria-label="Masquer"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="18" x2="18" y2="6"/>
              </svg>
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
