import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import useWishFormStore from '../../../store/wishFormStore'
import { useWishes } from '../../../hooks/useWishes'
import useAuthStore from '../../../store/authStore'
import { checkContent } from '../../../lib/moderation'

const HERO_H = 200

const sectionVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.08 * i, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] },
  }),
}

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

  const scrollRef = useRef(null)
  const { scrollY } = useScroll({ container: scrollRef })
  const imgScale = useTransform(scrollY, [0, HERO_H], [1, 1.12])
  const imgOpacity = useTransform(scrollY, [0, HERO_H * 0.6], [1, 0.6])

  async function handlePublish() {
    setError(null)
    if (!titre || titre.length < 5) { setError('Le titre est obligatoire (min. 5 caractères)'); return }
    if (!description || description.length < 10) { setError('La description est obligatoire (min. 10 caractères)'); return }
    if (!latitude || !longitude) { setError('La localisation est obligatoire. Retournez à l\'étape "Lieu".'); return }
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

  return (
    <div ref={scrollRef} className="h-full bg-[#F7F8FC] overflow-y-auto overflow-x-hidden">

      {/* ── Hero image — sticky parallax ── */}
      <div className="sticky top-0 z-0" style={{ height: HERO_H }}>
        {cover ? (
          <motion.div className="relative h-full bg-[#F0F0F5] overflow-hidden" style={{ scale: imgScale }}>
            <motion.img
              src={cover.preview}
              alt=""
              className="w-full h-full object-cover"
              style={{ opacity: imgOpacity }}
            />
            <div className="absolute inset-0" style={{
              background: 'linear-gradient(to top, rgba(0,0,0,0.45) 0%, transparent 50%, rgba(0,0,0,0.12) 100%)',
            }} />
            {images.length > 1 && (
              <span className="absolute bottom-3 right-3 text-[10px] font-bold text-white/90 bg-black/25 backdrop-blur-md px-2 py-0.5 rounded-full">
                +{images.length - 1} photo{images.length > 2 ? 's' : ''}
              </span>
            )}
          </motion.div>
        ) : (
          <div className="relative h-full" style={{ background: 'linear-gradient(160deg,#5B6BF5 0%,#9B59F5 100%)' }}>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-5xl">✨</span>
            </div>
          </div>
        )}

        {/* Bouton retour */}
        <div className="absolute top-12 left-4 z-20">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate('/wisher/create/4')}
            className="w-9 h-9 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M15 18l-6-6 6-6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.button>
        </div>

        {/* Label flottant */}
        <div className="absolute top-12 right-4 z-20">
          <span className="text-[10px] font-bold tracking-wide uppercase text-white/80 bg-black/20 backdrop-blur-md px-2.5 py-1 rounded-full">
            Récap
          </span>
        </div>
      </div>

      {/* ── Contenu — scrolle par-dessus le hero ── */}
      <div className="relative z-10 -mt-5">
        <div className="bg-[#F7F8FC] rounded-t-[22px] pt-3 pb-10 flex flex-col gap-3">

          {/* Drag handle */}
          <div className="flex justify-center pb-1">
            <div className="w-8 h-1 rounded-full bg-[#D5D5DC]" />
          </div>

          <div className="px-4 flex flex-col gap-3">

            {/* ── Card vœu ── */}
            <motion.div
              custom={0}
              initial="hidden"
              animate="visible"
              variants={sectionVariants}
              className="bg-white rounded-2xl p-4"
              style={{ boxShadow: '0 1px 3px rgba(26,26,46,0.06), 0 6px 16px rgba(26,26,46,0.04)' }}
            >
              <h2 className="font-bold text-[#1A1A2E] text-[16px] leading-snug mb-1">{titre || 'Titre du vœu'}</h2>
              <p className="text-[#8A8A9A] text-[13px] leading-relaxed mb-3.5">{description || 'Description du vœu...'}</p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mb-3.5">
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

              {/* Localisation + profil */}
              <div className="flex items-center justify-between pt-3 border-t border-[#F0F0F5]">
                <div className="flex items-center gap-1.5 text-xs text-[#8A8A9A]">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#B0B0BE">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                  </svg>
                  <span className="truncate max-w-[160px]">{adresse || 'Non renseignée'}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover border border-[#E8E8E8]" />
                  ) : (
                    <div className="w-5 h-5 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                      style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}>
                      {initials}
                    </div>
                  )}
                  <span className="text-[11px] font-medium text-[#1A1A2E]">
                    {profile?.pseudo || profile?.prenom}
                  </span>
                </div>
              </div>
            </motion.div>

            {/* ── Récompense ── */}
            <motion.div
              custom={1}
              initial="hidden"
              animate="visible"
              variants={sectionVariants}
              className="bg-white rounded-2xl p-4"
              style={{ boxShadow: '0 1px 3px rgba(26,26,46,0.06), 0 6px 16px rgba(26,26,46,0.04)' }}
            >
              <p className="text-sm font-bold text-[#1A1A2E] mb-3">Récompense</p>
              <div className="flex gap-2 mb-3">
                {['argent', 'bon_procede'].map((type) => (
                  <motion.button
                    key={type}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setRecompenseType(type)}
                    className="flex-1 h-10 rounded-full text-sm font-semibold transition-colors duration-200"
                    style={recompenseType === type
                      ? { background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)', color: '#fff' }
                      : { border: '1.5px solid #E8E8E8', color: '#8A8A9A' }
                    }
                  >
                    {type === 'argent' ? 'Argent' : 'Bon procédé'}
                  </motion.button>
                ))}
              </div>
              <AnimatePresence mode="wait">
                {recompenseType === 'argent' ? (
                  <motion.div
                    key="argent"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="relative overflow-hidden"
                  >
                    <input
                      type="number" min="0" step="1"
                      value={montant}
                      onChange={(e) => setMontant(e.target.value)}
                      placeholder="Montant"
                      className="w-full h-11 bg-[#F7F8FC] rounded-xl pl-4 pr-10 text-sm text-[#1A1A2E] outline-none focus:ring-2 focus:ring-[#5B6BF5]/20 transition-shadow"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#8A8A9A]">€</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="bon"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <textarea
                      value={bonProcedeText}
                      onChange={(e) => setBonProcedeText(e.target.value)}
                      placeholder="Décrivez votre bon procédé (optionnel)"
                      rows={2}
                      className="w-full bg-[#F7F8FC] rounded-xl px-4 py-3 text-sm text-[#1A1A2E] outline-none resize-none focus:ring-2 focus:ring-[#5B6BF5]/20 transition-shadow"
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* ── Erreur ── */}
            <AnimatePresence>
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.98 }}
                  className="bg-red-50 border border-red-100 rounded-2xl px-4 py-3 text-red-600 text-sm text-center"
                >
                  {error}
                </motion.div>
              )}
            </AnimatePresence>

            {/* ── Publier ── */}
            <motion.button
              custom={2}
              initial="hidden"
              animate="visible"
              variants={sectionVariants}
              whileTap={{ scale: 0.97 }}
              onClick={handlePublish}
              disabled={publishing}
              className="w-full h-[52px] rounded-full text-white font-bold text-[15px] disabled:opacity-50 relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
            >
              <span className="relative z-10">{publishing ? 'Publication...' : 'Publier mon vœu'}</span>
            </motion.button>

          </div>
        </div>
      </div>
    </div>
  )
}
