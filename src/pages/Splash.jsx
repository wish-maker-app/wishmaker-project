import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'
import { requestPushPermission } from '../lib/pushNotifications'

export default function Splash() {
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const { data: profile } = await supabase
            .from('users').select('onboarding_completed').eq('id', session.user.id).single()
          // Demander la permission push (ne bloque pas la navigation)
          if (profile?.onboarding_completed) {
            requestPushPermission(session.user.id).catch(() => {})
          }
          navigate(profile?.onboarding_completed ? '/maker' : '/setup/langue', { replace: true })
        } else {
          const seen = localStorage.getItem('onboarding_seen')
          navigate(seen ? '/auth' : '/onboarding/1', { replace: true })
        }
      } catch (err) {
        console.error('Splash error:', err)
        navigate('/onboarding/1', { replace: true })
      }
    }, 2000)
    return () => clearTimeout(timer)
  }, [navigate])

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(180deg, #5B6BF5 0%, #9B59F5 100%)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="flex flex-col items-center gap-5"
      >
        <img src="/logo.png" alt="Wish Maker" className="w-24 h-24 rounded-[28px]" />
        <h1 className="text-white font-extrabold text-4xl tracking-tight">Wish maker</h1>
      </motion.div>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} transition={{ delay: 0.8 }}
        className="absolute bottom-10 text-white text-sm">Version 1.0.0</motion.p>
    </div>
  )
}
