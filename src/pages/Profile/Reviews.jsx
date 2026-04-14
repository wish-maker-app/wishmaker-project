import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Header from '../../components/layout/Header'
import useAuthStore from '../../store/authStore'
import { supabase } from '../../lib/supabase'
import { formatRelativeDate } from '../../lib/utils'

function Stars({ count }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i <= Math.round(count) ? '#F5C542' : '#E0E0E0'}>
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
      ))}
    </div>
  )
}

function ReviewCard({ review, isReceived }) {
  const otherUser = isReceived ? review.from_user : review.to_user
  if (!otherUser) return null
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
    >
      <div className="flex items-center gap-2.5 mb-2">
        <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0 border border-[#E8E8E8]">
          {otherUser.avatar_url ? (
            <img src={otherUser.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-bold text-white text-xs"
              style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}>
              {otherUser.prenom?.[0]}{otherUser.nom?.[0]}
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#1A1A2E]">{otherUser.prenom} {otherUser.nom?.[0]}.</p>
          <p className="text-[11px] text-[#8A8A9A]">{formatRelativeDate(review.created_at)}</p>
        </div>
        <Stars count={review.note} />
      </div>
      {review.commentaire && (
        <p className="text-[13px] text-[#4A4A5A] leading-relaxed">{review.commentaire}</p>
      )}
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

  return (
    <div className="h-screen bg-[#FAFAFA] flex flex-col">
      <Header title="Mes avis" onBack={() => navigate('/profile')} />

      {/* Note moyenne */}
      <div className="px-5 py-5 flex items-center gap-4 bg-white border-b border-[#F0F0F0]">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}>
          <span className="text-white text-xl font-bold">{avgRating || '-'}</span>
        </div>
        <div>
          {avgRating && <Stars count={parseFloat(avgRating)} />}
          <p className="text-sm text-[#8A8A9A] mt-1">
            {reviewsReceived.length} avis reçu{reviewsReceived.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {/* Onglets */}
      <div className="px-5 pt-4 pb-2">
        <div className="flex bg-[#F0F0F2] rounded-full p-1">
          {[
            { key: 'received', label: `Reçus (${reviewsReceived.length})` },
            { key: 'given', label: `Laissés (${reviewsGiven.length})` },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="flex-1 h-10 rounded-full text-sm font-semibold transition-all"
              style={activeTab === tab.key
                ? { background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)', color: '#fff' }
                : { color: '#8A8A9A' }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Liste des avis */}
      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-6 h-6 rounded-full border-[3px] border-[#5B6BF5] border-t-transparent animate-spin" />
          </div>
        ) : currentReviews.length > 0 ? (
          <div className="flex flex-col gap-3 pt-2">
            {currentReviews.map((r) => (
              <ReviewCard key={r.id} review={r} isReceived={activeTab === 'received'} />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="text-[48px]">💬</span>
            <p className="text-[15px] font-medium text-[#AAA]">
              {activeTab === 'received' ? 'Aucun avis reçu' : 'Aucun avis laissé'}
            </p>
            <p className="text-xs text-[#C0C0C0] text-center max-w-[240px]">
              {activeTab === 'received'
                ? 'Les avis apparaîtront ici quand d\'autres utilisateurs noteront vos services.'
                : 'Vos avis laissés aux autres utilisateurs apparaîtront ici.'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
