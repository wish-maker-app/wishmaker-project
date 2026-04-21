import { useEffect, useState } from 'react'
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js'
import toast from 'react-hot-toast'
import { getStripe, createPaymentIntent, formatEuros } from '../../lib/stripe'
import Button from './Button'

/**
 * Formulaire de paiement Stripe réutilisable.
 *
 * Props :
 *  - type: 'wish_payment' | 'urgent_boost' | 'extension' | 'pack_starter' | 'pack_essential' | 'pack_pro'
 *  - amount_cents: montant TTC en centimes (pour wish_payment uniquement, les autres ont prix fixe)
 *  - wish_id: optionnel, lié à un wish
 *  - metadata: infos supplémentaires
 *  - onSuccess(paymentIntent) : callback quand paiement autorisé/capturé
 *  - onCancel : callback si l'user ferme le modal
 *  - submitLabel: texte custom pour le bouton ("Publier", "Payer", etc.)
 */
export default function PaymentForm({
  type,
  amount_cents,
  wish_id,
  metadata,
  onSuccess,
  onCancel,
  submitLabel,
}) {
  const [clientSecret, setClientSecret] = useState(null)
  const [finalAmount, setFinalAmount] = useState(amount_cents || 0)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function init() {
      try {
        const res = await createPaymentIntent({ type, amount_cents, wish_id, metadata })
        if (cancelled) return
        setClientSecret(res.client_secret)
        setFinalAmount(res.amount_cents)
      } catch (err) {
        if (cancelled) return
        setError(err.message || 'Erreur lors de l\'initialisation du paiement')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    init()
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <div className="py-10 text-center text-[#8A8A9A]">
        Préparation du paiement...
      </div>
    )
  }

  if (error || !clientSecret) {
    return (
      <div className="py-6 text-center">
        <p className="text-red-500 text-sm mb-4">{error || 'Erreur'}</p>
        <Button onClick={onCancel} variant="secondary">Fermer</Button>
      </div>
    )
  }

  return (
    <Elements
      stripe={getStripe()}
      options={{
        clientSecret,
        appearance: {
          theme: 'stripe',
          variables: {
            colorPrimary: '#5B6BF5',
            colorBackground: '#ffffff',
            colorText: '#1A1A2E',
            colorDanger: '#ef4444',
            fontFamily: 'system-ui, -apple-system, sans-serif',
            borderRadius: '12px',
          },
        },
        locale: 'fr',
      }}
    >
      <InnerForm
        clientSecret={clientSecret}
        amount={finalAmount}
        onSuccess={onSuccess}
        onCancel={onCancel}
        submitLabel={submitLabel}
      />
    </Elements>
  )
}

function InnerForm({ clientSecret, amount, onSuccess, onCancel, submitLabel }) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!stripe || !elements) return

    setProcessing(true)

    // Stripe exige elements.submit() AVANT toute action async + confirmPayment()
    const submitResult = await elements.submit()
    if (submitResult.error) {
      setProcessing(false)
      toast.error(submitResult.error.message || 'Informations de carte invalides')
      return
    }

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      clientSecret,
      redirect: 'if_required',
    })
    setProcessing(false)

    if (error) {
      toast.error(error.message || 'Paiement refusé')
      return
    }

    if (!paymentIntent) return

    // 'requires_capture' = pré-autorisation OK (wish payment), 'succeeded' = débité (urgent/pack)
    if (
      paymentIntent.status === 'requires_capture' ||
      paymentIntent.status === 'succeeded' ||
      paymentIntent.status === 'processing'
    ) {
      onSuccess(paymentIntent)
    } else {
      toast.error(`Statut inattendu : ${paymentIntent.status}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <PaymentElement options={{ layout: 'tabs' }} />
      <div className="flex gap-2 mt-2">
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} disabled={processing}>
            Annuler
          </Button>
        )}
        <Button type="submit" loading={processing} disabled={!stripe || !elements}>
          {submitLabel || `Payer ${formatEuros(amount)}`}
        </Button>
      </div>
      <p className="text-xs text-[#8A8A9A] text-center">
        🔒 Paiement sécurisé par Stripe. Aucune carte n'est stockée chez nous.
      </p>
    </form>
  )
}
