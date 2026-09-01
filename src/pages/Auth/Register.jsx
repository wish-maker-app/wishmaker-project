import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import { fetchMyProfile } from '../../lib/userProfile'
import useAuthStore from '../../store/authStore'
import Header from '../../components/layout/Header'
import AuthShell from '../../components/layout/AuthShell'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'

const CGU_VERSION = '1.0'

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
  // Confirmation email par CODE OTP (6 chiffres) : quand Supabase exige la
  // validation, signUp ne renvoie pas de session → on affiche l'écran de saisie
  // du code. Choix OTP plutôt que lien : l'app native ne peut pas capter un lien
  // de confirmation ouvert dans le navigateur (la session resterait hors de l'app).
  const [emailSent, setEmailSent] = useState(false)
  const [pendingEmail, setPendingEmail] = useState('')
  const [otpCode, setOtpCode] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)

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
        options: {
          // Consentement CGU/CGV/Privacy + emails : transmis en métadonnées et
          // persistés par le trigger handle_new_user (SECURITY DEFINER). Plus
          // besoin d'écrire côté client → marche même sans session (email à
          // confirmer), et retire une écriture client sur la table users.
          data: {
            cgu_accepted: true,
            cgu_version: CGU_VERSION,
            email_consent: emailConsent,
          },
        },
      })
      if (error) throw error

      // Cas A — confirmation email requise : Supabase ne renvoie PAS de session.
      // On affiche l'écran « vérifie ta boîte mail » (et NE poursuit pas vers
      // /setup, qui échouerait sans session). Ce cas couvre aussi l'email déjà
      // enregistré (Supabase renvoie un succès obfusqué anti-énumération).
      if (!authData.session) {
        setPendingEmail(data.email)
        setEmailSent(true)
        return
      }

      // Cas B — confirmation désactivée (fallback) : session immédiate. Le trigger
      // a déjà créé le profil minimal + consentement depuis les métadonnées.
      useAuthStore.getState().setUser(authData.user)
      const profile = await fetchMyProfile()
      if (profile) useAuthStore.getState().setProfile(profile)
      navigate('/setup/profil', { replace: true })
    } catch (err) {
      console.error('[register] error:', err)
      toast.error(err.message || 'Erreur lors de la création du compte')
    } finally { setLoading(false) }
  }

  async function handleResend() {
    if (!pendingEmail || resending) return
    setResending(true)
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email: pendingEmail })
      if (error) throw error
      toast.success('Nouveau code envoyé')
    } catch (err) {
      toast.error(err.message || 'Impossible de renvoyer le code')
    } finally { setResending(false) }
  }

  // Vérifie le code OTP saisi → confirme le compte et ouvre la session.
  async function handleVerifyOtp(e) {
    e?.preventDefault?.()
    const token = otpCode.trim()
    if (token.length < 6 || verifying) return
    setVerifying(true)
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: pendingEmail,
        token,
        type: 'signup',
      })
      if (error) throw error
      // Code valide → session créée. Le trigger handle_new_user a déjà posé le
      // profil minimal + le consentement depuis les métadonnées du signUp.
      if (data.session) {
        useAuthStore.getState().setUser(data.user)
        const profile = await fetchMyProfile()
        if (profile) useAuthStore.getState().setProfile(profile)
        navigate('/setup/profil', { replace: true })
      }
    } catch (err) {
      toast.error(err.message || 'Code invalide ou expiré')
    } finally { setVerifying(false) }
  }

  // ─── Écran de saisie du code de confirmation (OTP à 6 chiffres) ───
  if (emailSent) {
    return (
      <AuthShell>
        <div className="min-h-screen mx-auto max-w-[480px] flex flex-col lg:max-w-[460px]">
          <Header title="S'inscrire" />
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="flex-1 flex flex-col items-center text-center px-6 pt-8 gap-5"
          >
            <div className="w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg,#EEF0FF,#E8E0FF)' }}>
              <span className="text-4xl">✉️</span>
            </div>
            <div className="flex flex-col gap-2">
              <h1 className="text-[#1A1A2E] font-bold text-2xl">Entre ton code</h1>
              <p className="text-[#8A8A9A] text-sm leading-relaxed">
                On a envoyé un code à 6 chiffres à<br />
                <span className="font-semibold text-[#1A1A2E]">{pendingEmail}</span>.
              </p>
              <p className="text-[#8A8A9A] text-sm leading-relaxed mt-1">
                Saisis-le ci-dessous pour activer ton compte. Pense à regarder dans les spams.
              </p>
            </div>

            <form onSubmit={handleVerifyOtp} className="w-full flex flex-col gap-4 pt-1">
              <input
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="Code reçu par email"
                className="w-full h-14 bg-[#F7F8FC] rounded-xl px-4 text-center text-2xl tracking-[0.3em] font-semibold text-[#1A1A2E] outline-none focus:ring-2 focus:ring-[#5B6BF5]/20 placeholder:text-base placeholder:tracking-normal placeholder:font-normal placeholder:text-[#8A8A9A]"
              />
              <Button type="submit" loading={verifying} disabled={otpCode.length < 6}>
                Valider
              </Button>
            </form>

            <div className="w-full flex flex-col gap-1">
              <button
                type="button"
                onClick={handleResend}
                disabled={resending}
                className="text-sm text-[#5B6BF5] font-medium py-2 disabled:opacity-50"
              >
                {resending ? 'Envoi…' : 'Renvoyer le code'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/auth/login')}
                className="text-sm text-[#8A8A9A] font-medium py-1"
              >
                Retour à la connexion
              </button>
            </div>
          </motion.div>
        </div>
      </AuthShell>
    )
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
                J'accepte les{' '}
                <a href="/cgu" target="_blank" rel="noopener noreferrer" className="text-[#5B6BF5] font-medium hover:underline" onClick={(e) => e.stopPropagation()}>CGU</a>
                , les{' '}
                <a href="/cgv" target="_blank" rel="noopener noreferrer" className="text-[#5B6BF5] font-medium hover:underline" onClick={(e) => e.stopPropagation()}>CGV</a>
                {' '}et la{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#5B6BF5] font-medium hover:underline" onClick={(e) => e.stopPropagation()}>politique de confidentialité</a>
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
