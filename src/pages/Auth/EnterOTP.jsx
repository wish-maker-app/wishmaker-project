import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import Header from '../../components/layout/Header'
import OtpInput from '../../components/ui/OtpInput'
import Button from '../../components/ui/Button'

export default function EnterOTP() {
  const navigate = useNavigate()
  const location = useLocation()
  const email = location.state?.email || ''
  const [code, setCode] = useState(['', '', '', ''])
  const [loading, setLoading] = useState(false)
  const [shake, setShake] = useState(false)

  async function handleVerify() {
    const token = code.join('')
    if (token.length < 4) return
    setLoading(true)
    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      })
      if (error) throw error
      navigate('/auth/register', { state: { email }, replace: true })
    } catch (err) {
      setShake(true)
      setTimeout(() => setShake(false), 500)
      toast.error('Code invalide')
      setCode(['', '', '', ''])
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    try {
      await supabase.auth.signInWithOtp({ email })
      toast.success('Code renvoyé !')
    } catch {
      toast.error('Erreur lors du renvoi')
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Header />

      <motion.div
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col px-6 pt-4 gap-8"
      >
        <div className="flex flex-col gap-2">
          <h1 className="text-[#1A1A2E] font-bold text-2xl">Entrez le code</h1>
          <p className="text-[#8A8A9A] text-sm leading-relaxed">
            Nous venons de vous envoyer un code à 4 chiffres par e-mail
            {email && <> à <span className="font-medium text-[#1A1A2E]">{email}</span></>}.
          </p>
        </div>

        {/* Inputs OTP avec shake si erreur */}
        <motion.div
          animate={shake ? { x: [-8, 8, -6, 6, -4, 4, 0] } : {}}
          transition={{ duration: 0.4 }}
        >
          <OtpInput value={code} onChange={setCode} error={shake} />
        </motion.div>

        <Button onClick={handleVerify} loading={loading}
          disabled={code.join('').length < 4}>
          Continuer
        </Button>

        <p className="text-center text-sm text-[#8A8A9A]">
          Vous n'avez pas reçu le code ?{' '}
          <button onClick={handleResend} className="font-semibold"
            style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Renvoyer le code
          </button>
        </p>
      </motion.div>
    </div>
  )
}
