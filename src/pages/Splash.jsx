import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../lib/supabase'

export default function Splash() {
  const navigate = useNavigate()

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const { data: profile } = await supabase
            .from('users').select('onboarding_completed').eq('id', session.user.id).single()
          navigate(profile?.onboarding_completed ? '/wisher' : '/setup/langue', { replace: true })
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
        <div className="w-24 h-24 rounded-[28px] flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)' }}>
          <svg width="52" height="52" viewBox="0 0 52 52" fill="none">
            <path d="M8 6C8 3.79 9.79 2 12 2H40C42.21 2 44 3.79 44 6V34C44 36.21 42.21 38 40 38H28L18 48V38H12C9.79 38 8 36.21 8 34V6Z"
              fill="white" fillOpacity="0.9"/>
            <path d="M26 12l2.09 4.24L33 17.27l-3.5 3.41.83 4.83L26 23.27l-4.33 2.24.83-4.83L19 17.27l4.91-1.03L26 12z"
              fill="url(#sg)"/>
            <defs>
              <linearGradient id="sg" x1="0" y1="0" x2="1" y2="1">
                <stop stopColor="#5B6BF5"/><stop offset="1" stopColor="#9B59F5"/>
              </linearGradient>
            </defs>
          </svg>
        </div>
        <h1 className="text-white font-extrabold text-4xl tracking-tight">Wish maker</h1>
      </motion.div>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} transition={{ delay: 0.8 }}
        className="absolute bottom-10 text-white text-sm">Version 1.0.0</motion.p>
    </div>
  )
}
