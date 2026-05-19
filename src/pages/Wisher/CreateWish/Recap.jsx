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
  const { titre, description, images, adresse, quartier, ville, code_postal, latitude, longitude, tags, category_id, tag_ids, type_recompense, montant_recompense, description_bon_procede, setRecompense, reset } = useWishFormStore()
  const { createWish, loading: publishing } = useWishes()
  const [submitting, setSubmitting] = useState(false)
  const [recompenseType, setRecompenseType] = useState(type_recompense || 'argent')
  const [montant, setMontant] = useState(montant_recompense || '')
  const [bonProcedeText, setBonProcedeText] = useState(description_bon_procede || '')
  const [devisText, setDevisText] = useState('')
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

      // Si budget : verifier que le montant est valide (optionnel pour devis)
      if (recompenseType === 'argent') {
        const montantNum = parseFloat(montant)
        if (!montantNum || montantNum < 1) {
          toast.error(t('wisher.create.recap.err_montant'))
          return
        }
      }
      // Pour 'devis' et 'bon_procede' : pas de validation montant

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
    // Selon le mode, on stocke le bon texte descriptif (bon procede ou devis)
    const descText = recompenseType === 'devis' ? devisText : bonProcedeText
    setRecompense(recompenseType, recompenseType === 'argent' ? parseFloat(montant) || null : null, descText)
    try {
      const wish = await createWish({
        titre, description, latitude, longitude, adresse, quartier, ville, code_postal, tags, images,
        category_id, tag_ids,
        type_recompense: recompenseType,
        montant_recompense: recompenseType === 'argent' ? parseFloat(montant) || null : null,
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

            {/* ── Récompense ── */}
            <motion.div
              custom={1}
              initial="hidden"
              animate="visible"
              variants={sectionVariants}
              className="bg-white rounded-2xl p-4"
              style={{ boxShadow: '0 1px 3px rgba(26,26,46,0.06), 0 6px 16px rgba(26,26,46,0.04)' }}
            >
              <p className="text-sm font-bold text-[#1A1A2E] mb-3">{t('wisher.create.recap.recompense_titre')}</p>

              {/* 3 cards verticales : Budget / Bon procede / Sur devis */}
              <div className="flex flex-col gap-2 mb-3">
                {[
                  { id: 'argent', label: t('wisher.create.recap.argent_label'), sub: t('wisher.create.recap.argent_sub') },
                  { id: 'bon_procede', label: t('wisher.create.recap.bon_procede_label'), sub: t('wisher.create.recap.bon_procede_sub') },
                  { id: 'devis', label: t('wisher.create.recap.devis_label'), sub: t('wisher.create.recap.devis_sub') },
                ].map((mode) => {
                  const active = recompenseType === mode.id
                  return (
                    <motion.button
                      key={mode.id}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setRecompenseType(mode.id)}
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
                        {/* Radio dot */}
                        <span
                          className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0"
                          style={active
                            ? { background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }
                            : { border: '1.5px solid #D0D0D8', background: '#fff' }
                          }
                        >
                          {active && (
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </span>
                      </div>
                    </motion.button>
                  )
                })}
              </div>

              {/* Champ contextuel selon le mode choisi */}
              <AnimatePresence mode="wait">
                {recompenseType === 'argent' && (
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
                      placeholder={t('wisher.create.recap.montant_ph')}
                      className="w-full h-11 bg-[#F7F8FC] rounded-xl pl-4 pr-10 text-sm text-[#1A1A2E] outline-none focus:ring-2 focus:ring-[#5B6BF5]/20 transition-shadow"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#8A8A9A]">€</span>
                  </motion.div>
                )}
                {recompenseType === 'bon_procede' && (
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
                      placeholder={t('wisher.create.recap.bon_ph')}
                      rows={2}
                      className="w-full bg-[#F7F8FC] rounded-xl px-4 py-3 text-sm text-[#1A1A2E] outline-none resize-none focus:ring-2 focus:ring-[#5B6BF5]/20 transition-shadow"
                    />
                  </motion.div>
                )}
                {recompenseType === 'devis' && (
                  <motion.div
                    key="devis"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <textarea
                      value={devisText}
                      onChange={(e) => setDevisText(e.target.value)}
                      placeholder={t('wisher.create.recap.devis_ph')}
                      rows={2}
                      className="w-full bg-[#F7F8FC] rounded-xl px-4 py-3 text-sm text-[#1A1A2E] outline-none resize-none focus:ring-2 focus:ring-[#5B6BF5]/20 transition-shadow"
                    />
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
                  {t('wisher.create.recap.disclaimer')}
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
