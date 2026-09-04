import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { supabase } from '../../lib/supabase'
import { formatLocation } from '../../lib/geo'
import CategoryFallback from '../../components/ui/CategoryFallback'
import { setPostAuthRedirect } from '../../lib/postAuthRedirect'

/**
 * Aperçu PUBLIC d'un vœu (page de destination d'un lien partagé, /w/:id).
 *
 * Accessible SANS compte : lit uniquement des champs sûrs via la RPC
 * `get_wish_preview` (titre, photo, localisation approximative, récompense).
 * - Visiteur connecté → redirigé vers la fiche complète /maker/wish/:id.
 * - Visiteur anonyme → aperçu + CTA d'inscription (retour au vœu ensuite).
 */
export default function WishPreview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('loading') // loading | ready | notfound
  const [wish, setWish] = useState(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      // Déjà connecté → on envoie directement vers la fiche complète.
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          navigate(`/maker/wish/${id}`, { replace: true })
          return
        }
      } catch { /* pas de session lisible → on affiche l'aperçu public */ }

      try {
        const { data, error } = await supabase.rpc('get_wish_preview', { p_id: id })
        if (!alive) return
        if (error || !data) { setStatus('notfound'); return }
        setWish(data)
        setStatus('ready')
      } catch {
        if (alive) setStatus('notfound')
      }
    })()
    return () => { alive = false }
  }, [id, navigate])

  function goRegister() {
    setPostAuthRedirect(`/maker/wish/${id}`)
    navigate('/auth/register')
  }
  function goLogin() {
    setPostAuthRedirect(`/maker/wish/${id}`)
    navigate('/auth/login')
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-[#5B6BF5] border-t-transparent animate-spin" />
      </div>
    )
  }

  if (status === 'notfound') {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center gap-3 px-6 text-center">
        <span className="text-5xl mb-2">🔎</span>
        <h1 className="text-lg font-bold text-[#1A1A2E]">Vœu introuvable</h1>
        <p className="text-sm text-[#8A8A9A] max-w-xs">Ce vœu n'existe plus ou n'est plus disponible.</p>
        <button onClick={goRegister} className="mt-4 h-12 px-6 rounded-full text-white font-bold text-sm"
          style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}>
          Découvrir Wish Maker
        </button>
      </div>
    )
  }

  const cover = wish.wish_images?.find((i) => i.is_cover)?.url || wish.wish_images?.[0]?.url || null
  const slug = wish.category?.slug || null
  const isRealise = wish.statut === 'realise'
  const loc = formatLocation(wish)

  return (
    <div className="min-h-screen bg-white flex flex-col mx-auto max-w-[480px]">
      {/* Hero : photo de couverture ou visuel de catégorie */}
      <div className="relative w-full aspect-[4/3] bg-[#F0F0F5]">
        {cover ? (
          <img src={cover} alt="" className="w-full h-full object-cover" />
        ) : (
          <CategoryFallback slug={slug} iconSize={72} />
        )}
        <div className="absolute top-4 left-4">
          <span className="text-xs font-bold px-3 py-1.5 rounded-full text-white"
            style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(8px)' }}>
            ✨ Wish Maker
          </span>
        </div>
        {isRealise && (
          <div className="absolute top-4 right-4">
            <span className="text-xs font-bold px-3 py-1.5 rounded-full text-white" style={{ background: '#22C55E' }}>
              Vœu réalisé
            </span>
          </div>
        )}
      </div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        className="flex-1 flex flex-col px-6 pt-5 gap-4 pb-8">
        <h1 className="font-extrabold text-[#1A1A2E] text-2xl leading-tight break-words">{wish.titre}</h1>

        {loc && (
          <div className="flex items-center gap-1.5 text-sm text-[#8A8A9A] font-medium -mt-1">
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="#8A8A9A">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            {loc}
          </div>
        )}

        {(wish.type_recompense || wish.prestation_type) && (
          <div className="flex flex-wrap gap-1.5">
            {wish.type_recompense && (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full"
                style={wish.type_recompense === 'argent'
                  ? { background: '#ECFDF5', color: '#059669' }
                  : { background: '#EFF6FF', color: '#3B82F6' }}>
                Récompense : {wish.type_recompense === 'argent'
                  ? (wish.montant_recompense ? wish.montant_recompense + '€' : 'Argent')
                  : 'Bon procédé'}
              </span>
            )}
            {wish.prestation_type === 'devis' && (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full"
                style={{ background: '#F3E8FF', color: '#7C3AED' }}>Sur devis</span>
            )}
            {wish.prestation_type === 'budget' && wish.prestation_montant && (
              <span className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full"
                style={{ background: '#F3E8FF', color: '#7C3AED' }}>Budget : {wish.prestation_montant}€</span>
            )}
          </div>
        )}

        {wish.description && (
          <p className="text-[#4A4A5A] text-sm leading-relaxed break-words line-clamp-6">{wish.description}</p>
        )}

        <div className="flex-1 min-h-[16px]" />

        {/* CTA d'inscription */}
        <div className="rounded-3xl p-5 flex flex-col items-center text-center gap-1.5"
          style={{ background: 'linear-gradient(135deg,#EEF0FF,#F3E8FF)' }}>
          <span className="text-2xl">🧞</span>
          <h2 className="text-base font-bold text-[#1A1A2E]">
            {isRealise ? 'Toi aussi, réalise des vœux' : 'Tu peux réaliser ce vœu'}
          </h2>
          <p className="text-xs text-[#6A6A7A] mb-2 max-w-[260px]">
            Rejoins Wish Maker pour aider près de chez toi et gagner des récompenses.
          </p>
          <button onClick={goRegister} className="w-full rounded-full text-white font-bold text-[15px] flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)', height: 52 }}>
            Inscris-toi pour aider
          </button>
          <button onClick={goLogin} className="text-sm text-[#8A8A9A] font-medium py-1.5">
            J'ai déjà un compte
          </button>
        </div>
      </motion.div>
    </div>
  )
}
