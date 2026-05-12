import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../store/authStore'
import Header from '../../components/layout/Header'
import AuthShell from '../../components/layout/AuthShell'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'

const schema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Minimum 8 caractères'),
})

export default function Register() {
  const navigate = useNavigate()
  const location = useLocation()
  const emailFromState = location.state?.email || ''
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [acceptCGU, setAcceptCGU] = useState(false)
  const [emailConsent, setEmailConsent] = useState(false)

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: emailFromState },
  })

  const password = watch('password') || ''
  const pwHasLength = password.length >= 8
  const pwHasDigit = /\d/.test(password)

  async function onSubmit(data) {
    setLoading(true)
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      })
      if (error) throw error

      // Le trigger SQL handle_new_user() crée le profil minimal (email uniquement)
      // Les champs prenom/nom/pseudo seront renseignés dans /setup/*
      if (authData.session) {
        useAuthStore.getState().setUser(authData.user)
        // Sauvegarder le consentement email
        if (emailConsent) {
          await supabase.from('users').update({
            email_consent: true,
            email_consent_at: new Date().toISOString(),
          }).eq('id', authData.user.id)
        }
        const { data: profile } = await supabase
          .from('users').select('*').eq('id', authData.user.id).single()
        if (profile) useAuthStore.getState().setProfile(profile)
      }

      // Redirection vers le tunnel setup (qui routera intelligemment selon ce qui manque)
      navigate('/setup/profil', { replace: true })
    } catch (err) {
      console.error('[register] error:', err)
      toast.error(err.message || 'Erreur lors de la création du compte')
    } finally { setLoading(false) }
  }

  return (
    <AuthShell>
    <div className="min-h-screen mx-auto max-w-[480px] flex flex-col lg:max-w-[460px]">
      <Header title="S'inscrire" />

      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col px-6 pt-2 gap-6 pb-10"
      >
        <div className="flex flex-col gap-1">
          <h1 className="text-[#1A1A2E] font-bold text-2xl">Créer ton compte</h1>
          <p className="text-[#8A8A9A] text-sm">On commence par le plus simple : ton email</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input label="E-mail" type="email" placeholder="ton@email.com"
            disabled={!!emailFromState}
            {...register('email')} error={errors.email?.message} />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[#1A1A2E]">Mot de passe</label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Minimum 8 caractères"
                {...register('password')}
                className="w-full h-12 bg-[#F7F8FC] rounded-xl px-4 pr-12 text-sm text-[#1A1A2E] outline-none focus:ring-2 focus:ring-[#5B6BF5]/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[#8A8A9A]"
                aria-label={showPassword ? 'Masquer' : 'Afficher'}
              >
                {showPassword ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
            {errors.password?.message && (
              <p className="text-xs text-red-500">{errors.password.message}</p>
            )}
            {/* Indicateurs de force */}
            <div className="flex items-center gap-4 mt-1">
              <span className={`flex items-center gap-1 text-[11px] ${pwHasLength ? 'text-[#059669]' : 'text-[#C0C0C8]'}`}>
                {pwHasLength ? '✓' : '○'} 8+ caractères
              </span>
              <span className={`flex items-center gap-1 text-[11px] ${pwHasDigit ? 'text-[#059669]' : 'text-[#C0C0C8]'}`}>
                {pwHasDigit ? '✓' : '○'} 1 chiffre
              </span>
            </div>
          </div>

          {/* Cases RGPD */}
          <div className="flex flex-col gap-3 pt-1">
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={acceptCGU}
                onChange={(e) => setAcceptCGU(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded accent-[#5B6BF5] flex-shrink-0"
              />
              <span className="text-[12px] text-[#8A8A9A] leading-relaxed">
                J'accepte les <span className="text-[#5B6BF5] font-medium">CGU</span> et la <span className="text-[#5B6BF5] font-medium">politique de confidentialité</span>
              </span>
            </label>
            <label className="flex items-start gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={emailConsent}
                onChange={(e) => setEmailConsent(e.target.checked)}
                className="w-4 h-4 mt-0.5 rounded accent-[#5B6BF5] flex-shrink-0"
              />
              <span className="text-[12px] text-[#8A8A9A] leading-relaxed">
                J'accepte de recevoir des emails (expiration de vœux, actualités). Désinscription possible à tout moment.
              </span>
            </label>
          </div>

          <div className="pt-2">
            <Button type="submit" loading={loading} disabled={!acceptCGU}>Continuer</Button>
          </div>
        </form>

        <p className="text-center text-sm text-[#8A8A9A]">
          Vous avez un compte ?{' '}
          <button onClick={() => navigate('/auth/login')} className="font-semibold"
            style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Connectez-vous
          </button>
        </p>
      </motion.div>
    </div>
    </AuthShell>
  )
}
