import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import Header from '../../components/layout/Header'
import useAuthStore from '../../store/authStore'
import { supabase } from '../../lib/supabase'

// Charte WishMaker
const PRIMARY_GRADIENT = 'linear-gradient(135deg,#5B6BF5,#9B59F5)'
const STAR_COLOR = '#F5C542'
const TEXT_PRIMARY = '#1A1A2E'
const TEXT_SECONDARY = '#8A8A9A'
const BORDER = '#F0F0F2'

function Stars({ count, size = 14 }) {
  return (
    <div className="flex items-center gap-[2px]" aria-label={`${count} étoiles sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= Math.round(count)
        return (
          <svg
            key={i}
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill={filled ? STAR_COLOR : 'none'}
            stroke={filled ? STAR_COLOR : '#E0E0E0'}
            strokeWidth="1.6"
            strokeLinejoin="round"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        )
      })}
    </div>
  )
}

function formatMonthYear(iso, locale = 'fr-FR') {
  const date = new Date(iso)
  return date.toLocaleDateString(locale, { month: 'long', year: 'numeric' })
    .replace(/^\w/, (c) => c.toUpperCase())
}

function ReviewItem({ review, isReceived, index, onClickProfile }) {
  const { t, i18n } = useTranslation()
  const otherUser = isReceived ? review.from_user : review.to_user
  if (!otherUser) return null
  const fullName = `${otherUser.prenom || ''} ${otherUser.nom?.[0] ? otherUser.nom[0] + '.' : ''}`.trim()

  return (
    <motion.article
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.2), ease: [0.22, 1, 0.36, 1] }}
      className="py-5 border-b last:border-b-0"
      style={{ borderColor: BORDER }}
    >
      {/* Ligne avatar + nom + chevron */}
      <button
        onClick={() => onClickProfile?.(otherUser.id)}
        className="w-full flex items-center gap-3 active:opacity-70 transition-opacity"
      >
        <div
          className="w-11 h-11 rounded-full flex-shrink-0 p-[2px]"
          style={{ background: PRIMARY_GRADIENT }}
        >
          <div className="w-full h-full rounded-full overflow-hidden bg-white">
            {otherUser.avatar_url ? (
              <img src={otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center font-bold text-white text-xs"
                style={{ background: PRIMARY_GRADIENT }}
              >
                {otherUser.prenom?.[0]}{otherUser.nom?.[0]}
              </div>
            )}
          </div>
        </div>
        <span className="flex-1 text-left text-[15px] font-semibold tracking-[-0.01em]" style={{ color: TEXT_PRIMARY }}>
          {fullName || t('profile.reviews.utilisateur')}
        </span>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={TEXT_SECONDARY} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>

      {/* Étoiles + commentaire + date */}
      <div className="mt-3">
        <Stars count={review.note} size={14} />
        {review.commentaire && (
          <p className="text-[14px] leading-[1.55] mt-2" style={{ color: '#3A3A4E' }}>
            {review.commentaire}
          </p>
        )}
        <p className="text-[12px] mt-2" style={{ color: TEXT_SECONDARY }}>
          {formatMonthYear(review.created_at, i18n.language === 'en' ? 'en-US' : 'fr-FR')}
        </p>
      </div>
    </motion.article>
  )
}

function EmptyState({ kind }) {
  const { t } = useTranslation()
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center justify-center py-20 text-center"
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'linear-gradient(135deg, rgba(91,107,245,0.10), rgba(155,89,245,0.10))' }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#5B6BF5" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      </div>
      <p className="text-[14px] font-bold" style={{ color: TEXT_PRIMARY }}>
        {kind === 'received' ? t('profile.reviews.vide_recus_titre') : t('profile.reviews.vide_donnes_titre')}
      </p>
      <p className="text-[12.5px] mt-1.5 max-w-[260px] leading-[1.5]" style={{ color: TEXT_SECONDARY }}>
        {kind === 'received' ? t('profile.reviews.vide_recus_text') : t('profile.reviews.vide_donnes_text')}
      </p>
    </motion.div>
  )
}

export default function Reviews() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const profile = useAuthStore((s) => s.profile)
  const [reviewsReceived, setReviewsReceived] = useState([])
  const [reviewsGiven, setReviewsGiven] = useState([])
  const [activeTab, setActiveTab] = useState('received')
  const [loading, setLoading] = useState(true)

  const [error, setError] = useState(null)

  useEffect(() => {
    if (!profile?.id) {
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError(null)

    Promise.all([
      supabase
        .from('ratings')
        .select('id, note, commentaire, created_at, from_user:users!ratings_from_user_fkey(id, prenom, nom, avatar_url)')
        .eq('to_user', profile.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('ratings')
        .select('id, note, commentaire, created_at, to_user:users!ratings_to_user_fkey(id, prenom, nom, avatar_url)')
        .eq('from_user', profile.id)
        .order('created_at', { ascending: false }),
    ])
      .then(([received, given]) => {
        if (cancelled) return
        if (received.error) console.error('[Reviews] received error:', received.error)
        if (given.error) console.error('[Reviews] given error:', given.error)
        if (received.error && given.error) {
          setError(t('profile.reviews.erreur_titre'))
        }
        setReviewsReceived(received.data || [])
        setReviewsGiven(given.data || [])
      })
      .catch((err) => {
        if (cancelled) return
        console.error('[Reviews] fatal:', err)
        setError(err?.message || t('profile.reviews.erreur_titre'))
      })
      .finally(() => {
        // setLoading(false) TOUJOURS, plus de spinner infini
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [profile?.id])

  // Note moyenne arrondie au dixième
  const avgRating = useMemo(() => {
    if (reviewsReceived.length === 0) return null
    const sum = reviewsReceived.reduce((s, r) => s + r.note, 0)
    return (sum / reviewsReceived.length).toFixed(1).replace('.0', '')
  }, [reviewsReceived])

  const currentReviews = activeTab === 'received' ? reviewsReceived : reviewsGiven

  const tabs = [
    { key: 'received', label: t('profile.reviews.tab_recus'), count: reviewsReceived.length },
    { key: 'given', label: t('profile.reviews.tab_donnes'), count: reviewsGiven.length },
  ]

  return (
    <div className="h-screen bg-white flex flex-col">
      <Header title={t('profile.reviews.titre')} onBack={() => navigate('/profile')} />

      <div className="flex-1 overflow-y-auto">
        {/* TABS underline pleine largeur */}
        <div className="border-b" style={{ borderColor: BORDER }}>
          <div className="flex">
            {tabs.map((tab) => {
              const active = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className="relative flex-1 pb-3.5 pt-2 transition-colors"
                >
                  <span
                    className="text-[15px] font-bold tracking-[-0.005em]"
                    style={{ color: active ? TEXT_PRIMARY : TEXT_SECONDARY }}
                  >
                    {tab.label}
                  </span>
                  {active && (
                    <motion.span
                      layoutId="reviews-tab-underline"
                      className="absolute -bottom-px left-0 right-0 h-[2.5px] rounded-full"
                      style={{ background: PRIMARY_GRADIENT }}
                      transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-5 h-5 rounded-full border-[2px] border-[#5B6BF5] border-t-transparent animate-spin" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 gap-3 text-center">
            <span className="text-3xl mb-1">⚠️</span>
            <p className="text-sm font-bold text-[#1A1A2E]">{t('profile.reviews.erreur_titre')}</p>
            <p className="text-xs text-[#8A8A9A]">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-3 h-9 px-4 rounded-full text-white font-bold text-xs"
              style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
            >
              {t('profile.reviews.reessayer')}
            </button>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
            >
              {/* HERO note moyenne — uniquement sur l'onglet Reçus */}
              {activeTab === 'received' && reviewsReceived.length > 0 && (
                <section className="px-5 pt-6 pb-6">
                  <div className="flex items-baseline gap-1">
                    <span
                      className="font-bold tabular-nums leading-none"
                      style={{ color: TEXT_PRIMARY, fontSize: '56px', letterSpacing: '-0.04em' }}
                    >
                      {avgRating}
                    </span>
                    <span
                      className="font-bold tabular-nums leading-none"
                      style={{ color: TEXT_SECONDARY, fontSize: '40px', letterSpacing: '-0.03em' }}
                    >
                      /5
                    </span>
                  </div>
                  <p className="text-[13px] mt-2" style={{ color: TEXT_SECONDARY }}>
                    {t(reviewsReceived.length === 1 ? 'profile.reviews.compteur_un' : 'profile.reviews.compteur', { n: reviewsReceived.length })}
                  </p>
                </section>
              )}

              {/* LIST des avis */}
              <div className="px-5 pb-12">
                {currentReviews.length > 0 ? (
                  currentReviews.map((r, idx) => (
                    <ReviewItem
                      key={r.id}
                      review={r}
                      isReceived={activeTab === 'received'}
                      index={idx}
                      onClickProfile={(userId) => navigate(`/maker/user/${userId}`)}
                    />
                  ))
                ) : (
                  <EmptyState kind={activeTab} />
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
