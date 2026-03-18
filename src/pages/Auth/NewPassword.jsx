import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
  password: z.string().min(8, 'Minimum 8 caractères'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: 'Les mots de passe ne correspondent pas',
  path: ['confirm'],
})

export default function NewPassword() {
  const navigate = useNavigate()
  const [showSuccess, setShowSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  })

  async function onSubmit(data) {
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: data.password })
      if (error) throw error
      setShowSuccess(true)
    } catch (err) {
      toast.error(err.message || 'Erreur lors de la mise à jour')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col px-6 pt-4 gap-8 pb-10"
      >
        <div className="flex flex-col gap-2 text-center">
          <h1 className="text-[#1A1A2E] font-bold text-2xl">Créer un nouveau mot de passe</h1>
          <p className="text-[#8A8A9A] text-sm">Saisissez votre nouveau mot de passe</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <Input label="Nouveau mot de passe" type="password" placeholder="Minimum 8 caractères"
            {...register('password')} error={errors.password?.message} />
          <Input label="Confirmez le mot de passe" type="password" placeholder="Répétez le mot de passe"
            {...register('confirm')} error={errors.confirm?.message} />
          <div className="pt-2">
            <Button type="submit" loading={loading}>Continuer</Button>
          </div>
        </form>
      </motion.div>

      <SuccessModal isOpen={showSuccess} variant="password"
        onContinue={() => navigate('/auth/login', { replace: true })} />
    </div>
  )
}
