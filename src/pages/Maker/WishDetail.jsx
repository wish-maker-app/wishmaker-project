import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import Header from '../../components/layout/Header'
import Button from '../../components/ui/Button'
import { MOCK_WISHES } from '../../data/mock'

function Avatar({ user, size = 44 }) {
  const initials = `${user.prenom[0]}${user.nom[0]}`
  return (
    <div className="rounded-full flex items-center justify-center font-bold text-white flex-shrink-0"
      style={{ width: size, height: size, background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)', fontSize: size * 0.3 }}>
      {initials}
    </div>
  )
}

function StarRating({ rating }) {
  return (
    <span className="flex items-center gap-1 text-sm font-semibold text-[#1A1A2E]">
      <svg width="14" height="14" viewBox="0 0 12 12" fill="#F5C542">
        <path d="M6 1l1.35 2.74L10.5 4.27l-2.25 2.19.53 3.09L6 8.1l-2.78 1.45.53-3.09L1.5 4.27l3.15-.53L6 1z"/>
      </svg>
      {rating}
    </span>
  )
}

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000
  if (diff < 60)    return 'à l\'instant'
  if (diff < 3600)  return `il y a ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `il y a ${Math.floor(diff / 3600)}h`
  return `il y a ${Math.floor(diff / 86400)}j`
}

export default function WishDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const wish = MOCK_WISHES.find((w) => w.id === id) || MOCK_WISHES[0]

  return (
    <div className="min-h-screen bg-[#F7F8FC] flex flex-col">

      {/* Hero */}
      <div className="relative h-52 flex-shrink-0"
        style={{ background: 'linear-gradient(160deg,#5B6BF5 0%,#9B59F5 100%)' }}>
        <Header transparent onBack={() => navigate(-1)} />
        <div className="absolute bottom-5 left-5">
          <span className="text-white/70 text-xs font-medium">{timeAgo(wish.created_at)}</span>
          {wish.is_sponsored && (
            <span className="ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/20 text-white">
              ✦ Sponsorisé
            </span>
          )}
        </div>
      </div>

      {/* Contenu */}
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="flex-1 bg-white rounded-t-[32px] -mt-6 px-5 pt-6 pb-28 overflow-y-auto"
      >
        {/* Titre + statut */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <h1 className="font-extrabold text-[#1A1A2E] text-xl leading-tight flex-1">{wish.titre}</h1>
          <span className="text-xs font-bold px-3 py-1 rounded-full flex-shrink-0"
            style={{ background: '#EEF0FF', color: '#5B6BF5' }}>
            {wish.statut === 'en_attente' ? 'En attente' : wish.statut === 'en_cours' ? 'En cours' : 'Terminé'}
          </span>
        </div>

        {/* Description */}
        <p className="text-[#4A4A5A] text-sm leading-relaxed mb-5">{wish.description}</p>

        {/* Tags */}
        {wish.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-5">
            {wish.tags.map((tag) => (
              <span key={tag} className="text-xs font-semibold px-3 py-1.5 rounded-full"
                style={{ background: '#EEF0FF', color: '#5B6BF5' }}>
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Localisation */}
        <div className="flex items-center gap-2 mb-5 p-3 rounded-2xl" style={{ background: '#F7F8FC' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: '#EEF0FF' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
                stroke="#5B6BF5" strokeWidth="2"/>
              <circle cx="12" cy="9" r="2.5" stroke="#5B6BF5" strokeWidth="2"/>
            </svg>
          </div>
          <div>
            <p className="text-[10px] text-[#8A8A9A] font-medium">Localisation</p>
            <p className="text-sm font-semibold text-[#1A1A2E]">{wish.adresse}</p>
          </div>
        </div>

        {/* Wisher */}
        <div className="p-4 rounded-2xl mb-6" style={{ background: '#F7F8FC' }}>
          <p className="text-xs font-semibold text-[#8A8A9A] mb-3 uppercase tracking-wide">Publié par</p>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar user={wish.wisher} size={48} />
              {wish.wisher.is_online && (
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#22C55E] border-2 border-white" />
              )}
            </div>
            <div className="flex-1">
              <p className="font-bold text-[#1A1A2E]">{wish.wisher.prenom} {wish.wisher.nom}</p>
              <StarRating rating={wish.wisher.rating} />
            </div>
            <button
              onClick={() => navigate('/messages/conv-1')}
              className="w-10 h-10 rounded-full flex items-center justify-center"
              style={{ background: '#EEF0FF' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
                  stroke="#5B6BF5" strokeWidth="2" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        </div>

        {/* CTA */}
        <Button onClick={() => navigate('/maker/success')}>
          Accepter ce vœu
        </Button>
        <button
          onClick={() => navigate(-1)}
          className="w-full mt-3 h-12 text-sm font-semibold text-[#8A8A9A]">
          Pas pour moi
        </button>
      </motion.div>
    </div>
  )
}
