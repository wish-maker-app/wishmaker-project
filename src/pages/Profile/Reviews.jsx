import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import Header from '../../components/layout/Header'
import useAuthStore from '../../store/authStore'
import { supabase } from '../../lib/supabase'
import { formatRelativeDate } from '../../lib/utils'

// Charte WishMaker
const PRIMARY_GRADIENT = 'linear-gradient(135deg,#5B6BF5,#9B59F5)'
const STAR_COLOR = '#F5C542'
const TEXT_PRIMARY = '#1A1A2E'
const TEXT_SECONDARY = '#8A8A9A'

function Stars({ count, size = 12 }) {
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

function ReviewItem({ review, isReceived, index }) {
  const otherUser = isReceived ? review.from_user : review.to_user
  if (!otherUser) return null
  return (
    <motion.article
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index * 0.04, 0.2), ease: [0.22, 1, 0.36, 1] }}
      className="py-5 border-b border-[#F0F0F2] last:border-b-0"
    >
      <header className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-[#E8E8E8]">
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
        <div className="flex-1 min-w-0 pt-px">
          <div className="flex items-baseline gap-1.5 flex-wrap">
            <h3 className="text-[14px] font-semibold leading-tight" style={{ color: TEXT_PRIMARY }}>
              {otherUser.prenom} {otherUser.nom?.[0]}.
            </h3>
            <span className="text-[11px] text-[#C0C0C8]">·</span>
            <time className="text-[12px] tabular-nums leading-tight" style={{ color: TEXT_SECONDARY }}>
              {formatRelativeDate(review.created_at)}
            </time>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <Stars count={review.note} size={11} />
            <span className="text-[11px] font-semibold tabular-nums leading-none" style={{ color: TEXT_SECONDARY }}>
              {review.note}/5
            </span>
          </div>
        </div>
      </header>
      {review.commentaire && (
        <p className="text-[14px] leading-[1.55] mt-3 pl-[52px]" style={{ color: '#3A3A4E' }}>
          {review.commentaire}
        </p>
      )}
    </motion.article>
  )
}

function EmptyState({ kind }) {
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
        {kind === 'received' ? "Pas encore d'avis" : 'Aucun avis laissé'}
      </p>
      <p className="text-[12.5px] mt-1.5 max-w-[260px] leading-[1.5]" style={{ color: TEXT_SECONDARY }}>
        {kind === 'received'
          ? "Les avis apparaîtront ici dès qu'un utilisateur notera vos services."
          : "Notez un utilisateur après une mission pour qu'il apparaisse ici."}
      </p>
    </motion.div>
  )
}

export default function Reviews() {
  const navigate = useNavigate()
  const profile = useAuthStore((s) => s.profile)
  const [reviewsReceived, setReviewsReceived] = useState([])
  const [reviewsGiven, setReviewsGiven] = useState([])
  const [activeTab, setActiveTab] = useState('received')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!profile?.id) return
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
    ]).then(([received, given]) => {
      if (received.error) console.error('[Reviews] received error:', received.error)
      if (given.error) console.error('[Reviews] given error:', given.error)
      setReviewsReceived(received.data || [])
      setReviewsGiven(given.data || [])
      setLoading(false)
    })
  }, [profile?.id])

  const avgRating = reviewsReceived.length > 0
    ? (reviewsReceived.reduce((sum, r) => sum + r.note, 0) / reviewsReceived.length).toFixed(1)
    : null

  const currentReviews = activeTab === 'received' ? reviewsReceived : reviewsGiven

  const tabs = [
    { key: 'received', label: 'Reçus', count: reviewsReceived.length },
    { key: 'given', label: 'Laissés', count: reviewsGiven.length },
  ]

  return (
    <div className="h-screen bg-white flex flex-col">
      <Header title="Mes avis" onBack={() => navigate('/profile')} />

      {/* HERO — note moyenne avec gradient primaire de l'app */}
      <section className="px-5 pt-5 pb-6">
        <div className="flex items-center gap-4">
          <div
            className="w-[72px] h-[72px] rounded-2xl flex items-center justify-center flex-shrink-0 shadow-[0_8px_24px_-8px_rgba(91,107,245,0.45)]"
            style={{ background: PRIMARY_GRADIENT }}
          >
            <span className="text-white font-bold tabular-nums" style={{ fontSize: '26px', letterSpacing: '-0.02em' }}>
              {avgRating || '—'}
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            <Stars count={parseFloat(avgRating) || 0} size={14} />
            <p className="text-[12.5px] tabular-nums" style={{ color: TEXT_SECONDARY }}>
              <span className="font-semibold" style={{ color: TEXT_PRIMARY }}>{reviewsReceived.length}</span>{' '}
              {reviewsReceived.length > 0 ? 'avis · note moyenne' : 'avis pour le moment'}
            </p>
          </div>
        </div>
      </section>

      {/* TABS underline avec accent gradient */}
      <div className="px-5 border-b border-[#F0F0F2]">
        <div className="flex gap-7">
          {tabs.map((tab) => {
            const active = activeTab === tab.key
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="relative pb-3 pt-1 transition-colors"
              >
                <span className="flex items-baseline gap-1.5">
                  <span
                    className="text-[14px] font-semibold tracking-[-0.005em]"
                    style={{ color: active ? TEXT_PRIMARY : TEXT_SECONDARY }}
                  >
                    {tab.label}
                  </span>
                  <span
                    className="text-[11.5px] font-semibold tabular-nums"
                    style={{ color: active ? '#5B6BF5' : '#C0C0C8' }}
                  >
                    {tab.count}
                  </span>
                </span>
                {active && (
                  <motion.span
                    layoutId="reviews-tab-underline"
                    className="absolute -bottom-px left-0 right-0 h-[2px] rounded-full"
                    style={{ background: PRIMARY_GRADIENT }}
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* LIST */}
      <div className="flex-1 overflow-y-auto px-5 pb-12">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 rounded-full border-[2px] border-[#5B6BF5] border-t-transparent animate-spin" />
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
              {currentReviews.length > 0 ? (
                currentReviews.map((r, idx) => (
                  <ReviewItem
                    key={r.id}
                    review={r}
                    isReceived={activeTab === 'received'}
                    index={idx}
                  />
                ))
              ) : (
                <EmptyState kind={activeTab} />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}
