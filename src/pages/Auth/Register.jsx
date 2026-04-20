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
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import SuccessModal from '../../components/ui/SuccessModal'
import { checkContent } from '../../lib/moderation'

const schema = z.object({
  prenom: z.string().min(2, 'Prénom requis'),
  nom: z.string().min(2, 'Nom requis'),
  pseudo: z.string()
    .min(3, 'Minimum 3 caractères')
    .max(20, 'Maximum 20 caractères')
    .regex(/^[a-zA-Z0-9_ ]+$/, 'Lettres, chiffres, espaces et _ uniquement'),
  email: z.string().email('Email invalide'),
  password: z.string().min(8, 'Minimum 8 caractères'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirm'],
})

export default function Register() {
  const navigate = useNavigate()
  const location = useLocation()
  const emailFromState = location.state?.email || ''
  const [showSuccess, setShowSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const [typeCompte, setTypeCompte] = useState('particulier')
  const [pseudoModerationError, setPseudoModerationError] = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: emailFromState },
  })

  async function onSubmit(data) {
    setLoading(true)
    try {
      // Vérification modération du pseudo
      const pseudoCheck = await checkContent(data.pseudo)
      if (!pseudoCheck.isClean) {
        setPseudoModerationError('Ce pseudo n\'est pas autorisé.')
        setLoading(false)
        return
      }
      setPseudoModerationError('')

      // Crée le compte — le trigger SQL handle_new_user() crée le profil dans public.users
      const { data: authData, error: signUpErr } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: { prenom: data.prenom, nom: data.nom, pseudo: data.pseudo, type_compte: typeCompte },
        },
      })
      if (signUpErr) throw signUpErr

      const user = authData.user
      if (!user) throw new Error('Erreur lors de la création du compte')

      // Session active → on stocke le user + profil et on continue
      if (authData.session) {
        useAuthStore.getState().setUser(user)
        // UPSERT (plus robuste que UPDATE) — au cas où le trigger n'a pas encore tourné
        // ou si un des champs n'a pas été copié correctement depuis les metadata
        const { data: profile, error: upsertErr } = await supabase
          .from('users')
          .upsert({
            id: user.id,
            email: data.email,
            prenom: data.prenom,
            nom: data.nom,
            pseudo: data.pseudo,
            type_compte: typeCompte,
          }, { onConflict: 'id' })
          .select()
          .single()
        if (upsertErr) {
          console.error('[register] profile upsert error:', upsertErr)
          toast.error('Profil créé mais erreur de sauvegarde : ' + upsertErr.message)
        } else if (profile) {
          useAuthStore.getState().setProfile(profile)
        }
      }

      setShowSuccess(true)
    } catch (err) {
      console.error('[register] signup error:', err)
      toast.error(err.message || 'Erreur lors de la création du compte')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen bg-white flex flex-col overflow-y-auto">
      <Header title="S'inscrire" />

      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col px-6 pt-2 gap-6 pb-10"
      >
        <div className="flex flex-col gap-1">
          <h1 className="text-[#1A1A2E] font-bold text-2xl">Complétez votre compte</h1>
          <p className="text-[#8A8A9A] text-sm">Vous êtes à 2 pas de devenir un génie</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input label="Prénom" placeholder="Votre prénom"
            {...register('prenom')} error={errors.prenom?.message} />
          <Input label="Nom" placeholder="Votre nom"
            {...register('nom')} error={errors.nom?.message} />
          <Input label="Pseudo" placeholder="Votre pseudo (ex: wish_maker42)"
            {...register('pseudo')} error={pseudoModerationError || errors.pseudo?.message} />

          {/* Type de compte */}
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-[#1A1A2E]">Type de compte</label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setTypeCompte('particulier')}
                className="flex-1 py-3 rounded-full text-sm font-semibold transition-all"
                style={typeCompte === 'particulier'
                  ? { background: 'linear-gradient(135deg, #5B6BF5, #9B59F5)', color: '#fff' }
                  : { border: '1.5px solid #D1D5DB', color: '#8A8A9A', background: 'transparent' }
                }
              >
                Particulier
              </button>
              <button
                type="button"
                onClick={() => setTypeCompte('pro')}
                className="flex-1 py-3 rounded-full text-sm font-semibold transition-all"
                style={typeCompte === 'pro'
                  ? { background: 'linear-gradient(135deg, #5B6BF5, #9B59F5)', color: '#fff' }
                  : { border: '1.5px solid #D1D5DB', color: '#8A8A9A', background: 'transparent' }
                }
              >
                Professionnel
              </button>
            </div>
          </div>

          <Input label="E-mail" type="email" placeholder="Email"
            disabled={!!emailFromState}
            {...register('email')} error={errors.email?.message} />
          <Input label="Mot de passe" type="password" placeholder="Minimum 8 caractères"
            {...register('password')} error={errors.password?.message} />
          <Input label="Confirmez le mot de passe" type="password" placeholder="Répétez le mot de passe"
            {...register('confirm')} error={errors.confirm?.message} />

          <div className="pt-2">
            <Button type="submit" loading={loading}>Continuer</Button>
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

      <SuccessModal
        isOpen={showSuccess}
        variant="register"
        onContinue={() => navigate('/setup/langue', { replace: true })}
      />
    </div>
  )
}
