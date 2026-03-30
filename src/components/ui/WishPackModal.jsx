import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../store/authStore'

const PACKS = [
  { id: 'pack_3', name: 'Pack Starter', wishes: 3, price: 2.99, description: 'Idéal pour débuter' },
  { id: 'pack_7', name: 'Pack Essentiel', wishes: 7, price: 5.99, description: 'Le plus populaire', recommended: true },
  { id: 'pack_15', name: 'Pack Pro', wishes: 15, price: 9.99, description: 'Pour les utilisateurs actifs' },
]

export default function WishPackModal({ open, onClose, onSuccess }) {
  const [loading, setLoading] = useState(null)
  const profile = useAuthStore((s) => s.profile)

  if (!open) return null

  async function handleBuy(pack) {
    setLoading(pack.id)
    try {
      // Mettre à jour le quota
      const { error: updateErr } = await supabase
        .from('users')
        .update({ wishes_quota: (profile?.wishes_quota || 3) + pack.wishes })
        .eq('id', profile.id)
      if (updateErr) throw updateErr

      // Insérer l'historique d'achat
      await supabase.from('wish_packs').insert({
        user_id: profile.id,
        pack_type: pack.id,
        prix: pack.price,
        wishes_added: pack.wishes,
      })

      // Mettre à jour le profil local
      const { data: updated } = await supabase
        .from('users')
        .select('*')
        .eq('id', profile.id)
        .single()
      if (updated) useAuthStore.getState().setProfile(updated)

      toast.success(`${pack.wishes} vœux ajoutés à votre compte !`)
      onSuccess?.()
    } catch (err) {
      toast.error(err.message || 'Erreur')
    } finally {
      setLoading(null)
    }
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 z-[900] overlay-backdrop"
      />
      <motion.div
        initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 320 }}
        className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[28px] z-[901] px-5 pb-8 pt-4 max-h-[85vh] overflow-y-auto bottom-sheet"
      >
        <div className="w-10 h-1 rounded-full bg-[#E0E0E0] mx-auto mb-4" />

        <div className="flex items-center justify-between mb-1">
          <h2 className="text-lg font-bold text-[#1A1A2E]">Acheter des vœux</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M18 6L6 18M6 6l12 12" stroke="#8A8A9A" strokeWidth="2" strokeLinecap="round"/>
            </svg>
          </button>
        </div>
        <p className="text-sm text-[#8A8A9A] mb-5">Vous avez atteint votre limite. Choisissez un pack pour continuer.</p>

        <div className="flex flex-col gap-3">
          {PACKS.map((pack) => (
            <div
              key={pack.id}
              className="relative rounded-[20px] p-4 border-2 transition-all"
              style={{
                borderColor: pack.recommended ? '#5B6BF5' : '#F0F0F0',
                background: pack.recommended ? '#FAFBFF' : '#fff',
              }}
            >
              {pack.recommended && (
                <span
                  className="absolute -top-3 left-4 text-[10px] font-bold px-3 py-1 rounded-full text-white"
                  style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
                >
                  Recommandé
                </span>
              )}
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-bold text-[#1A1A2E] text-[15px]">{pack.name}</p>
                  <p className="text-xs text-[#8A8A9A]">{pack.description}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-[#1A1A2E] text-lg">{pack.price.toFixed(2).replace('.', ',')}€</p>
                  <p className="text-[10px] text-[#8A8A9A]">{pack.wishes} vœux</p>
                </div>
              </div>
              <button
                onClick={() => handleBuy(pack)}
                disabled={loading === pack.id}
                className="w-full h-11 rounded-full text-white font-bold text-sm disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
              >
                {loading === pack.id ? 'Traitement...' : 'Choisir'}
              </button>
            </div>
          ))}
        </div>

        <p className="text-center text-[11px] text-[#B0B0B0] mt-4">Paiement sécurisé — Stripe</p>
      </motion.div>
    </AnimatePresence>
  )
}
