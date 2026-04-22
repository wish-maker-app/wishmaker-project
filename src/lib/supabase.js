import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Variables VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY manquantes dans .env')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    // Bypass le Web Locks API de Supabase qui peut hang sur refresh (F5)
    // et laisser getSession()/refreshSession() bloqués indéfiniment.
    // Sans cette option, les pages restent vides après F5.
    // Ref: https://github.com/supabase/auth-js/issues/768
    lock: async (_name, _acquireTimeout, fn) => fn(),
  },
})
