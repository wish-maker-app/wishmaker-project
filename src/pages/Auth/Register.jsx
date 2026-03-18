import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import Header from '../../components/layout/Header'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import SuccessModal from '../../components/ui/SuccessModal'

const schema = z.object({
  prenom: z.string().min(2, 'Prénom requis'),
  nom: z.string().min(2, 'Nom requis'),
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

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: emailFromState },
  })

  async function onSubmit(data) {
    setLoading(true)
    try {
      // Met à jour le mot de passe (session déjà créée par OTP)
      const { error: pwErr } = await supabase.auth.updateUser({ password: data.password })
      if (pwErr) throw pwErr

      // Met à jour le profil dans public.users
      const { data: { user } } = await supabase.auth.getUser()
      const { error: profileErr } = await supabase
        .from('users')
        .upsert({ id: user.id, email: data.email, prenom: data.prenom, nom: data.nom })
      if (profileErr) throw profileErr

      setShowSuccess(true)
    } catch (err) {
      toast.error(err.message || 'Erreur lors de la création du compte')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
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
