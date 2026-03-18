import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import Header from '../../components/layout/Header'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'

export default function ForgotPassword() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/auth/new-password`,
      })
      if (error) throw error
      toast.success('Email envoyé ! Vérifiez votre boîte.')
      navigate('/auth/otp', { state: { email, fromForgot: true } })
    } catch (err) {
      toast.error(err.message || 'Erreur lors de l\'envoi')
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
        <div className="flex flex-col gap-2">
          <h1 className="text-[#1A1A2E] font-bold text-2xl">Mot de passe oublié</h1>
          <p className="text-[#8A8A9A] text-sm">Récupérez le mot de passe de votre compte</p>
        </div>

        {/* Illustration */}
        <div className="flex justify-center py-4">
          <div className="w-24 h-24 rounded-full flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(91,107,245,0.15), rgba(155,89,245,0.15))' }}>
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="11" width="14" height="10" rx="2" stroke="url(#fg)" strokeWidth="2"/>
              <path d="M8 11V7a4 4 0 018 0v4" stroke="url(#fg)" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="12" cy="16" r="1.5" fill="url(#fg)"/>
              <defs>
                <linearGradient id="fg" x1="0" y1="0" x2="1" y2="1">
                  <stop stopColor="#5B6BF5"/><stop offset="1" stopColor="#9B59F5"/>
                </linearGradient>
              </defs>
            </svg>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input label="E-mail" type="email" placeholder="Votre adresse e-mail"
            value={email} onChange={(e) => setEmail(e.target.value)}
            icon={<svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>}
          />
          <Button type="submit" loading={loading}>Continuer</Button>
        </form>
      </motion.div>
    </div>
  )
}
