import { useState } from 'react'
import toast from 'react-hot-toast'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../store/authStore'
import { applyPurchase } from '../../lib/stripe'
import PaymentForm from './PaymentForm'
import BottomSheet from './BottomSheet'

const PACKS = [
  { id: 'pack_starter', type: 'pack_starter', name: 'Pack Starter', wishes: 3, price: 2.99, description: 'Idéal pour débuter' },
  { id: 'pack_essential', type: 'pack_essential', name: 'Pack Essentiel', wishes: 7, price: 5.99, description: 'Le plus populaire', recommended: true },
  { id: 'pack_pro', type: 'pack_pro', name: 'Pack Pro', wishes: 15, price: 9.99, description: 'Pour les utilisateurs actifs' },
]

export default function WishPackModal({ open, onClose, onSuccess }) {
  const [selectedPack, setSelectedPack] = useState(null)
  const profile = useAuthStore((s) => s.profile)

  async function handlePaymentSuccess(paymentIntent, pack) {
    try {
      await applyPurchase(paymentIntent.id)

      // Refresh profile local depuis BDD
      const { data: updated } = await supabase
        .from('users').select('*').eq('id', profile.id).single()
      if (updated) useAuthStore.getState().setProfile(updated)

      toast.success(`🎉 ${pack.wishes} vœux ajoutés à votre compte !`)
      setSelectedPack(null)
      onSuccess?.()
      onClose?.()
    } catch (err) {
      toast.error(err.message || 'Erreur lors de l\'activation du pack')
    }
  }

  function handlePaymentCancel() {
    setSelectedPack(null)
    toast('Paiement annulé', { icon: 'ℹ️' })
  }

  return (
    <BottomSheet open={open} onClose={onClose} maxHeight="90vh">
        {/* Vue paiement Stripe */}
        {selectedPack ? (
          <>
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setSelectedPack(null)}
                className="flex items-center gap-1 text-sm text-[#5B6BF5] font-medium"
              >
                ← Retour aux packs
              </button>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="#8A8A9A" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <div className="text-center mb-5">
              <span className="text-3xl mb-2 block">💳</span>
              <h2 className="text-lg font-bold text-[#1A1A2E]">{selectedPack.name}</h2>
              <p className="text-sm text-[#8A8A9A] mt-1">
                {selectedPack.wishes} vœux pour {selectedPack.price.toFixed(2).replace('.', ',')}€
              </p>
            </div>
            <PaymentForm
              type={selectedPack.type}
              metadata={{ pack_wishes: String(selectedPack.wishes) }}
              onSuccess={(pi) => handlePaymentSuccess(pi, selectedPack)}
              onCancel={handlePaymentCancel}
              submitLabel={`Payer ${selectedPack.price.toFixed(2).replace('.', ',')}€`}
            />
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-lg font-bold text-[#1A1A2E]">Acheter des vœux</h2>
              <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#F5F5F7] flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M18 6L6 18M6 6l12 12" stroke="#8A8A9A" strokeWidth="2" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
            <p className="text-sm text-[#8A8A9A] mb-2">Vous avez atteint votre limite. Choisissez un pack pour continuer.</p>
            <p className="text-xs text-[#B0B0B0] mb-4">
              Vos 3 vœux gratuits se renouvellent chaque mois. Les packs achetés restent valables jusqu'à utilisation.
            </p>

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
                    onClick={() => setSelectedPack(pack)}
                    className="w-full h-11 rounded-full text-white font-bold text-sm"
                    style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
                  >
                    Choisir
                  </button>
                </div>
              ))}
            </div>

            <p className="text-center text-[11px] text-[#B0B0B0] mt-4">🔒 Paiement sécurisé — Stripe</p>
          </>
        )}
    </BottomSheet>
  )
}
