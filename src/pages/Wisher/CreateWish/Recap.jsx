import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import toast from 'react-hot-toast'
import useWishFormStore from '../../../store/wishFormStore'
import { useWishes } from '../../../hooks/useWishes'
import useAuthStore from '../../../store/authStore'
import { formatLocation } from '../../../lib/geo'
import CategoryFallback from '../../../components/ui/CategoryFallback'
import { useCatalog } from '../../../hooks/useTags'

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
  const {
    titre, description, images, adresse, quartier, ville, code_postal, latitude, longitude,
    tags, category_id, tag_ids,
    type_recompense, montant_recompense, description_bon_procede,
    prestation_type, prestation_montant,
    setRecompense, setPrestation, reset,
  } = useWishFormStore()
  const { createWish, loading: publishing } = useWishes()
  const [submitting, setSubmitting] = useState(false)
  // RÉCOMPENSE : ce que le Maker touche pour la mise en relation (= commission)
  const [recompenseType, setRecompenseType] = useState(type_recompense || 'bon_procede')
  const [montant, setMontant] = useState(montant_recompense || '')
  const [bonProcedeText, setBonProcedeText] = useState(description_bon_procede || '')
  // PRESTATION (optionnel) : comment se définit le coût de la prestation.
  // null = rien coché, 'devis' = attendre un devis, 'budget' = annoncer un budget.
  // Click sur l'option active = désélection (toggle).
  const [prestationType, setPrestationType] = useState(prestation_type || null)
  const [prestationMontant, setPrestationMontant] = useState(prestation_montant || '')
  const [isUrgent, setIsUrgent] = useState(false)
  const [showUrgentModal, setShowUrgentModal] = useState(false)

  const cover = images.find((img) => img.is_cover) || images[0]
  const initials = profile ? `${profile.prenom?.[0] || ''}${profile.nom?.[0] || ''}` : '?'
  const { categories } = useCatalog()
  const categorySlug = categories.find((c) => c.id === category_id)?.slug

  const scrollRef = useRef(null)
  const { scrollY } = useScroll({ container: scrollRef })
  const imgScale = useTransform(scrollY, [0, HERO_H], [1, 1.12])
  const imgOpacity = useTransform(scrollY, [0, HERO_H * 0.6], [1, 0.6])

  // Validation synchrone uniquement — la modération a déjà tourné en Step1
  // et le texte n'est plus éditable ici, donc inutile de re-checker.
  function validateFields() {
    if (!titre || titre.length < 5) { toast.error(t('wisher.create.recap.err_titre')); return false }
    if (!description || description.length < 10) { toast.error(t('wisher.create.recap.err_desc')); return false }
    if (!latitude || !longitude) { toast.error(t('wisher.create.recap.err_loc')); return false }
    return true
  }

  async function handlePublish() {
    if (submitting || publishing) return // anti-double-clic
    setSubmitting(true)
    try {
      if (!validateFields()) return

      // Récompense : si argent, montant ≥ 1€
      if (recompenseType === 'argent') {
        const montantNum = parseFloat(montant)
        if (!montantNum || montantNum < 1) {
          toast.error(t('wisher.create.recap.err_montant'))
          return
        }
      }

      // Prestation : si budget annoncé, montant > 0
      if (prestationType === 'budget') {
        const presNum = parseFloat(prestationMontant)
        if (!presNum || presNum <= 0) {
          toast.error('Veuillez indiquer un budget pour la prestation')
          return
        }
      }

      // Modal urgent (paiement 0.99€) si l'option urgent est cochée
      if (isUrgent) {
        setShowUrgentModal(true)
        return
      }
      await doPublish(false)
    } finally {
      setSubmitting(false)
    }
  }

  async function doPublish(urgent) {
    setRecompense(recompenseType, recompenseType === 'argent' ? parseFloat(montant) || null : null, bonProcedeText)
    setPrestation(prestationType, prestationType === 'budget' ? parseFloat(prestationMontant) || null : null)
    try {
      const wish = await createWish({
        titre, description, latitude, longitude, adresse, quartier, ville, code_postal, tags, images,
        category_id, tag_ids,
        type_recompense: recompenseType,
        montant_recompense: recompenseType === 'argent' ? parseFloat(montant) || null : null,
        prestation_type: prestationType,
        prestation_montant: prestationType === 'budget' ? parseFloat(prestationMontant) || null : null,
        is_urgent: urgent,
      })
      // Si des images n'ont pas pu être uploadées, on prévient l'user
      if (wish?._failedUploads?.length) {
        toast.error(`${wish._failedUploads.length} image(s) n'ont pas pu être ajoutées au vœu`, { duration: 5000 })
      }
      reset()
      if (urgent) toast.success(t('wisher.create.recap.succes_urgent'))
      navigate('/wisher/create/success')
    } catch (err) {
      console.error('[Recap] doPublish:', err)
      toast.error(err.message || t('wisher.create.recap.err_publication'))
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
                {t(images.length > 2 ? 'wisher.create.recap.photos_plus_pluriel' : 'wisher.create.recap.photos_plus', { n: images.length - 1 })}
              </span>
            )}
          </motion.div>
        ) : (
          <div className="relative h-full overflow-hidden">
            <CategoryFallback slug={categorySlug} iconSize={72} />
            <div className="absolute inset-0" style={{
              background: 'linear-gradient(to top, rgba(0,0,0,0.30) 0%, transparent 50%)',
            }} />
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
            {t('wisher.create.recap.label')}
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
              <h2 className="font-bold text-[#1A1A2E] text-[16px] leading-snug mb-1">{titre || t('wisher.create.recap.titre_default')}</h2>
              <p className="text-[#8A8A9A] text-[13px] leading-relaxed mb-3.5">{description || t('wisher.create.recap.desc_default')}</p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5 mb-3.5">
                {recompenseType && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full"
                    style={
                      recompenseType === 'argent' ? { background: '#ECFDF5', color: '#059669' }
                      : recompenseType === 'devis' ? { background: '#F2E9FF', color: '#7A3BC4' }
                      : { background: '#EFF6FF', color: '#3B82F6' }
                    }>
                    {recompenseType === 'argent' ? `${montant ? montant + '€' : t('wisher.create.recap.argent_label')}`
                      : recompenseType === 'devis' ? t('wisher.create.recap.devis_label')
                      : t('wisher.create.recap.bon_procede_label')}
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
                  <span className="truncate max-w-[160px]">{formatLocation({ quartier, ville, code_postal, adresse }) || t('wisher.create.recap.non_renseignee')}</span>
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

            {/* ── 1. RÉCOMPENSE — commission Maker pour la mise en relation ── */}
            <motion.div
              custom={1}
              initial="hidden"
              animate="visible"
              variants={sectionVariants}
              className="bg-white rounded-2xl p-4"
              style={{ boxShadow: '0 1px 3px rgba(26,26,46,0.06), 0 6px 16px rgba(26,26,46,0.04)' }}
            >
              <p className="text-sm font-bold text-[#1A1A2E] mb-1">Récompense</p>
              <p className="text-[11.5px] text-[#8A8A9A] mb-3 leading-snug">
                Petit montant que le Maker touche pour avoir répondu à votre vœu.
              </p>

              {/* 2 boutons côte à côte (chip horizontal) */}
              <div className="flex gap-2">
                {['argent', 'bon_procede'].map((mode) => (
                  <motion.button
                    key={mode}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setRecompenseType(mode)}
                    className="flex-1 h-10 rounded-full text-sm font-semibold transition-colors duration-200"
                    style={recompenseType === mode
                      ? { background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)', color: '#fff' }
                      : { border: '1.5px solid #E8E8E8', color: '#8A8A9A', background: '#fff' }
                    }
                  >
                    {mode === 'argent' ? 'Argent' : 'Bon procédé'}
                  </motion.button>
                ))}
              </div>

              {/* Champ montant si Argent */}
              <AnimatePresence>
                {recompenseType === 'argent' && (
                  <motion.div
                    key="recompense-argent"
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.2 }}
                    className="relative overflow-hidden"
                  >
                    <input
                      type="number" min="1" step="1"
                      value={montant}
                      onChange={(e) => setMontant(e.target.value)}
                      placeholder="Ex : 5"
                      className="w-full h-11 bg-[#F7F8FC] rounded-xl pl-4 pr-10 text-sm text-[#1A1A2E] outline-none"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#8A8A9A]">€</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* ── 2. PRESTATION (optionnel) — comment se définit le coût ── */}
            <motion.div
              custom={1.5}
              initial="hidden"
              animate="visible"
              variants={sectionVariants}
              className="bg-white rounded-2xl p-4"
              style={{ boxShadow: '0 1px 3px rgba(26,26,46,0.06), 0 6px 16px rgba(26,26,46,0.04)' }}
            >
              <p className="text-sm font-bold text-[#1A1A2E] mb-1">Prestation <span className="text-[11px] font-medium text-[#8A8A9A]">(optionnel)</span></p>
              <p className="text-[11.5px] text-[#8A8A9A] mb-3 leading-snug">
                Coût éventuel de la prestation elle-même (réglé directement au Maker).
              </p>

              <div className="flex flex-col gap-2">
                {[
                  { id: 'devis', label: 'Sur devis', sub: 'Les Makers vous envoient un devis via la messagerie' },
                  { id: 'budget', label: 'Budget de la prestation', sub: 'Vous indiquez le budget que vous êtes prêt à mettre' },
                ].map((mode) => {
                  const active = prestationType === mode.id
                  return (
                    <motion.button
                      key={mode.id}
                      whileTap={{ scale: 0.98 }}
                      // Toggle : click sur l'option active → désélection
                      onClick={() => setPrestationType(active ? null : mode.id)}
                      className="text-left rounded-2xl px-4 py-3 border-2 transition-all"
                      style={active
                        ? { borderColor: '#5B6BF5', background: '#FAFBFF' }
                        : { borderColor: '#F0F0F0', background: '#fff' }
                      }
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-bold text-[#1A1A2E]">{mode.label}</p>
                          <p className="text-[11.5px] text-[#8A8A9A] leading-snug mt-0.5">{mode.sub}</p>
                        </div>
                        {/* Checkbox style carré coché */}
                        <span
                          className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0"
                          style={active
                            ? { background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }
                            : { border: '1.5px solid #D0D0D8', background: '#fff' }
                          }
                        >
                          {active && (
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </span>
                      </div>
                    </motion.button>
                  )
                })}
              </div>

              {/* Champ montant si Budget coché */}
              <AnimatePresence>
                {prestationType === 'budget' && (
                  <motion.div
                    key="prestation-budget"
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 12 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    transition={{ duration: 0.2 }}
                    className="relative overflow-hidden"
                  >
                    <input
                      type="number" min="1" step="1"
                      value={prestationMontant}
                      onChange={(e) => setPrestationMontant(e.target.value)}
                      placeholder="Ex : 20"
                      className="w-full h-11 bg-[#F7F8FC] rounded-xl pl-4 pr-10 text-sm text-[#1A1A2E] outline-none"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#8A8A9A]">€</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Disclaimer : Wish Maker ne traite pas le paiement */}
              <div className="mt-3 flex items-start gap-2 px-3 py-2.5 rounded-xl bg-[#F7F8FC]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8A8A9A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4" />
                  <path d="M12 16h.01" />
                </svg>
                <p className="text-[11px] text-[#8A8A9A] leading-relaxed">
                  Wish Maker met en relation. Le paiement se fait directement entre vous et le Maker.
                </p>
              </div>
            </motion.div>

            {/* ── Option Urgent ── */}
            <motion.div
              custom={2}
              initial="hidden"
              animate="visible"
              variants={sectionVariants}
              onClick={() => setIsUrgent(!isUrgent)}
              className="rounded-2xl p-4 cursor-pointer transition-all border-2"
              style={{
                background: isUrgent ? 'linear-gradient(135deg, #FFF7ED, #FFF0E0)' : '#fff',
                borderColor: isUrgent ? '#F59E0B' : '#F0F0F0',
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">{isUrgent ? '\u26A1' : '\u26A1'}</span>
                  <div>
                    <p className="text-sm font-bold text-[#1A1A2E]">
                      {isUrgent ? t('wisher.create.recap.urgent_active') : t('wisher.create.recap.urgent_mettre')}
                    </p>
                    <p className="text-xs text-[#8A8A9A]">{t('wisher.create.recap.urgent_sub')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold px-2 py-1 rounded-full"
                    style={isUrgent
                      ? { background: '#F59E0B', color: '#fff' }
                      : { background: '#FFF4E0', color: '#F59E0B' }
                    }>
                    0,99€
                  </span>
                  {/* Toggle switch */}
                  <div className="w-11 h-6 rounded-full p-0.5 transition-colors"
                    style={{ background: isUrgent ? '#F59E0B' : '#D1D5DB' }}>
                    <div className="w-5 h-5 rounded-full bg-white shadow-sm transition-transform"
                      style={{ transform: isUrgent ? 'translateX(20px)' : 'translateX(0)' }} />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* ── Publier ── */}
            <motion.button
              custom={3}
              initial="hidden"
              animate="visible"
              variants={sectionVariants}
              whileTap={{ scale: 0.97 }}
              onClick={handlePublish}
              disabled={publishing || submitting}
              className="w-full h-[52px] rounded-full text-white font-bold text-[15px] disabled:opacity-50 relative overflow-hidden flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
            >
              {(publishing || submitting) && (
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="white" strokeWidth="3"/>
                  <path className="opacity-75" fill="white" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
              )}
              <span className="relative z-10">
                {(publishing || submitting) ? t('wisher.create.recap.btn_publication') : isUrgent ? t('wisher.create.recap.btn_publier_urgent') : t('wisher.create.recap.btn_publier')}
              </span>
            </motion.button>

          </div>
        </div>
      </div>

      {/* Modal paiement urgent (option urgent — applique au bon procédé OU argent) */}
      <AnimatePresence>
        {showUrgentModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowUrgentModal(false)}
              className="fixed inset-0 bg-black/40 z-[900] overlay-backdrop"
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 320 }}
              className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[28px] z-[901] px-5 pb-8 pt-4 bottom-sheet"
            >
              <div className="w-10 h-1 rounded-full bg-[#E0E0E0] mx-auto mb-4" />
              <div className="text-center mb-4">
                <span className="text-4xl mb-2 block">{'\u26A1'}</span>
                <h2 className="text-lg font-bold text-[#1A1A2E]">{t('wisher.create.recap.modal_urgent_titre')}</h2>
                <p className="text-sm text-[#8A8A9A] mt-1">{t('wisher.create.recap.modal_urgent_sub')}</p>
              </div>
              <div className="rounded-2xl bg-[#FFF7ED] border border-[#FFEDD5] p-4 mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-[#1A1A2E]">{t('wisher.create.recap.modal_urgent_option')}</p>
                  <p className="text-xs text-[#8A8A9A]">{t('wisher.create.recap.modal_urgent_option_sub')}</p>
                </div>
                <p className="text-xl font-bold text-[#F59E0B]">0,99€</p>
              </div>
              <button
                onClick={async () => {
                  setShowUrgentModal(false)
                  await doPublish(true)
                }}
                disabled={publishing}
                className="w-full h-[52px] rounded-full text-white font-bold text-[15px] disabled:opacity-50 mb-3"
                style={{ background: 'linear-gradient(135deg,#F59E0B,#F97316)' }}
              >
                {publishing ? t('wisher.create.recap.btn_publication') : t('wisher.create.recap.modal_urgent_pay')}
              </button>
              <button
                onClick={() => {
                  setShowUrgentModal(false)
                  setIsUrgent(false)
                  doPublish(false)
                }}
                className="w-full text-sm text-[#8A8A9A] text-center py-2"
              >
                {t('wisher.create.recap.modal_urgent_skip')}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
