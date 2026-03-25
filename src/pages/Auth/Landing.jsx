import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function Landing() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [email, setEmail] = useState('')

  function handleEmailContinue(e) {
    e.preventDefault()
    if (!email.trim()) return
    navigate('/auth/register', { state: { email: email.trim().toLowerCase() } })
  }

  async function handleGoogle() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/splash` },
    })
    if (error) toast.error('Erreur avec Google : ' + error.message)
  }

  async function handleApple() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: `${window.location.origin}/splash` },
    })
    if (error) toast.error('Erreur avec Apple : ' + error.message)
  }

  return (
    <div className="h-screen flex flex-col bg-[#5B6BF5] overflow-y-auto">
      {/* Partie haute */}
      <motion.div
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center px-6 py-10 gap-3"
      >
        <h1 className="text-white font-bold text-3xl text-center">{t('auth.register_email.titre')}</h1>
        <p className="text-white/80 text-sm text-center leading-relaxed">
          {t('auth.register_email.sous_titre')}
        </p>
      </motion.div>

      {/* Partie basse — card blanche */}
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="flex-1 bg-white px-6 pt-4 pb-6 flex flex-col gap-4"
        style={{ borderRadius: '32px 32px 0 0' }}
      >
        <form onSubmit={handleEmailContinue} className="flex flex-col gap-4">
          <Input
            label="Email"
            type="email"
            placeholder="Entrez votre adresse e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={
              <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
              </svg>
            }
          />
          <Button type="submit">{t('auth.register_email.btn')}</Button>
        </form>

        {/* Séparateur */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-[#E0E0E0]"/>
          <span className="text-[#8A8A9A] text-xs">Ou continuez avec</span>
          <div className="flex-1 h-px bg-[#E0E0E0]"/>
        </div>

        {/* Boutons sociaux */}
        <div className="flex flex-col gap-3">
          <Button variant="social" onClick={handleGoogle}
            icon={<svg width="20" height="20" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>}
          >
            Continuer avec Google
          </Button>
          <Button variant="social" onClick={handleApple}
            icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/></svg>}
          >
            Continuer avec Apple
          </Button>
        </div>

        {/* Lien inscription */}
        <p className="text-center text-sm text-[#8A8A9A] mt-2">
          {t('auth.register_email.deja_compte')}{' '}
          <button onClick={() => navigate('/auth/login')}
            className="font-semibold text-gradient bg-gradient-to-r from-[#5B6BF5] to-[#9B59F5] bg-clip-text text-transparent">
            {t('auth.register_email.connecter')}
          </button>
        </p>
      </motion.div>
    </div>
  )
}
