import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import useWishFormStore from '../../../store/wishFormStore'
import { useWishes } from '../../../hooks/useWishes'
import useAuthStore from '../../../store/authStore'
import { checkContent } from '../../../lib/moderation'

export default function Recap() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const profile = useAuthStore((s) => s.profile)
  const { titre, description, images, adresse, latitude, longitude, tags, type_recompense, montant_recompense, description_bon_procede, setRecompense, reset } = useWishFormStore()
  const { createWish, loading: publishing } = useWishes()
  const [error, setError] = useState(null)
  const [recompenseType, setRecompenseType] = useState(type_recompense || 'bon_procede')
  const [montant, setMontant] = useState(montant_recompense || '')
  const [bonProcedeText, setBonProcedeText] = useState(description_bon_procede || '')

  const cover = images.find((img) => img.is_cover) || images[0]
  const initials = profile ? `${profile.prenom?.[0] || ''}${profile.nom?.[0] || ''}` : '?'

  async function handlePublish() {
    setError(null)
    if (!titre || titre.length < 5) { setError('Le titre est obligatoire (min. 5 caractères)'); return }
    if (!description || description.length < 10) { setError('La description est obligatoire (min. 10 caractères)'); return }
    if (!latitude || !longitude) { setError('La localisation est obligatoire. Retournez à l\'étape "Lieu".'); return }
    // Vérification modération avant publication
    const [titreCheck, descCheck] = await Promise.all([
      checkContent(titre),
      checkContent(description),
    ])
    if (!titreCheck.isClean || !descCheck.isClean) {
      toast.error('Publication impossible : contenu non conforme.')
      return
    }

    setRecompense(recompenseType, recompenseType === 'argent' ? parseFloat(montant) || null : null, bonProcedeText)
    try {
      await createWish({
        titre, description, latitude, longitude, adresse, tags, images,
        type_recompense: recompenseType,
        montant_recompense: recompenseType === 'argent' ? parseFloat(montant) || null : null,
      })
      reset()
      navigate('/wisher/create/success')
    } catch (err) {
      setError(err.message || 'Erreur lors de la publication')
    }
  }

  const heroH = cover ? 260 : 160

  return (
    <div className="h-screen bg-[#F7F8FC] overflow-y-auto">

      {/* ── Photo hero (sticky, reste en place pendant le scroll) ── */}
      <div className="sticky top-0 z-0" style={{ height: heroH }}>
        {cover ? (
          <div className="relative h-full bg-[#F0F0F5]">
            <img src={cover.preview} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/15" />
            {images.length > 1 && (
              <span className="absolute bottom-4 right-4 text-[11px] font-bold text-white bg-black/30 backdrop-blur-sm px-2.5 py-1 rounded-full">
                +{images.length - 1} photo{images.length > 2 ? 's' : ''}
              </span>
            )}
          </div>
        ) : (
          <div className="relative h-full" style={{ background: 'linear-gradient(160deg,#5B6BF5 0%,#9B59F5 100%)' }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-5xl">✨</span>
            </div>
          </div>
        )}

        {/* Bouton retour */}
        <div className="absolute top-14 left-4 z-20">
          <button onClick={() => navigate('/wisher/create/4')}
            className="w-10 h-10 rounded-full bg-black/20 backdrop-blur-sm flex items-center justify-center">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Contenu (scrolle par-dessus la photo) ── */}
      <div className="relative z-10 -mt-5">
        <div className="bg-[#F7F8FC] rounded-t-[24px] px-5 pt-5 pb-10 flex flex-col gap-4">

          {/* Card vœu */}
          <div className="bg-white rounded-[20px] shadow-sm p-4">
            <h2 className="font-bold text-[#1A1A2E] text-[17px] leading-snug mb-1.5">{titre || 'Titre du vœu'}</h2>
            <p className="text-[#8A8A9A] text-[13px] leading-relaxed mb-4">{description || 'Description du vœu...'}</p>

            {/* Récompense + Tags sur une ligne */}
            <div className="flex flex-wrap gap-1.5 mb-4">
              {recompenseType && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full"
                  style={recompenseType === 'argent'
                    ? { background: '#ECFDF5', color: '#059669' }
                    : { background: '#EFF6FF', color: '#3B82F6' }
                  }>
                  {recompenseType === 'argent'
                    ? `${montant ? montant + '€' : 'Argent'}`
                    : 'Bon procédé'}
                </span>
              )}
              {tags.map((tag) => (
                <span key={tag} className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: '#EEF0FF', color: '#5B6BF5' }}>
                  {tag}
                </span>
              ))}
            </div>

            {/* Localisation */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-[#8A8A9A]">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#8A8A9A">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                </svg>
                <span className="truncate max-w-[180px]">{adresse || 'Non renseignée'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover border border-[#E8E8E8]" />
                ) : (
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white border border-[#E8E8E8]"
                    style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}>
                    {initials}
                  </div>
                )}
                <span className="text-[11px] font-medium text-[#1A1A2E]">
                  {profile?.pseudo || profile?.prenom}
                </span>
              </div>
            </div>
          </div>

          {/* Récompense */}
          <div className="bg-white rounded-[20px] shadow-sm p-4">
            <p className="text-sm font-bold text-[#1A1A2E] mb-3">Récompense</p>
            <div className="flex gap-2 mb-3">
              {['argent', 'bon_procede'].map((type) => (
                <button
                  key={type}
                  onClick={() => setRecompenseType(type)}
                  className="flex-1 h-10 rounded-full text-sm font-semibold transition-all"
                  style={recompenseType === type
                    ? { background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)', color: '#fff' }
                    : { border: '1.5px solid #E8E8E8', color: '#8A8A9A' }
                  }
                >
                  {type === 'argent' ? 'Argent' : 'Bon procédé'}
                </button>
              ))}
            </div>
            {recompenseType === 'argent' ? (
              <div className="relative">
                <input
                  type="number" min="0" step="1"
                  value={montant}
                  onChange={(e) => setMontant(e.target.value)}
                  placeholder="Montant"
                  className="w-full h-11 bg-[#F7F8FC] rounded-xl pl-4 pr-10 text-sm text-[#1A1A2E] outline-none"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#8A8A9A]">€</span>
              </div>
            ) : (
              <textarea
                value={bonProcedeText}
                onChange={(e) => setBonProcedeText(e.target.value)}
                placeholder="Décrivez votre bon procédé (optionnel)"
                rows={2}
                className="w-full bg-[#F7F8FC] rounded-xl px-4 py-3 text-sm text-[#1A1A2E] outline-none resize-none"
              />
            )}
          </div>

          {/* Erreur */}
          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="bg-red-50 rounded-2xl px-4 py-3 text-red-600 text-sm text-center">
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Publier */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={handlePublish}
            disabled={publishing}
            className="w-full h-14 rounded-full text-white font-bold text-base disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
          >
            {publishing ? 'Publication...' : 'Publier mon vœu'}
          </motion.button>

        </div>
      </div>
    </div>
  )
}
