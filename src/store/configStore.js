import { create } from 'zustand'
import { supabase } from '../lib/supabase'

// Valeurs par défaut utilisées avant le chargement de la config depuis Supabase.
// La source de vérité reste la fonction SQL get_wish_config().
const DEFAULTS = {
  wish_duration_hours: 168, // 1 semaine (7j × 24h). Source de vérité = get_wish_config() SQL.
  urgent_duration_hours: 24,
  expired_retention_days: 30,
}

const useConfigStore = create((set) => ({
  ...DEFAULTS,
  loaded: false,

  loadConfig: async () => {
    const { data, error } = await supabase.rpc('get_wish_config')
    if (error) {
      console.warn('[configStore] Fallback to defaults — get_wish_config failed:', error.message)
      set({ loaded: true })
      return
    }
    set({ ...DEFAULTS, ...data, loaded: true })
  },
}))

export default useConfigStore
