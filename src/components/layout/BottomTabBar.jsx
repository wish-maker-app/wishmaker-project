import { useState } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useNotifications } from '../../hooks/useNotifications'
import useAuthStore from '../../store/authStore'
import WishPackModal from '../ui/WishPackModal'

// Icônes SVG inline pour éviter une dépendance supplémentaire
function IconWisher({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78L12 21.23l8.84-8.84a5.5 5.5 0 000-7.78z"
        stroke={active ? 'url(#gw)' : '#C0C0C0'}
        strokeWidth="2"
        strokeLinejoin="round"
        fill={active ? 'url(#gwfill)' : 'none'}
        fillOpacity={active ? 0.2 : 0}
      />
      <defs>
        <linearGradient id="gw" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#5B6BF5" /><stop offset="1" stopColor="#9B59F5" />
        </linearGradient>
        <linearGradient id="gwfill" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#5B6BF5" /><stop offset="1" stopColor="#9B59F5" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function IconMaker({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
        stroke={active ? 'url(#gk)' : '#C0C0C0'}
        strokeWidth="2"
        strokeLinejoin="round"
        fill={active ? 'url(#gkfill)' : 'none'}
        fillOpacity={active ? 0.2 : 0}
      />
      <defs>
        <linearGradient id="gk" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#5B6BF5" /><stop offset="1" stopColor="#9B59F5" />
        </linearGradient>
        <linearGradient id="gkfill" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#5B6BF5" /><stop offset="1" stopColor="#9B59F5" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function IconMessages({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path
        d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
        stroke={active ? 'url(#gm)' : '#C0C0C0'}
        strokeWidth="2"
        strokeLinejoin="round"
        fill={active ? 'url(#gmfill)' : 'none'}
        fillOpacity={active ? 0.15 : 0}
      />
      <defs>
        <linearGradient id="gm" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#5B6BF5" /><stop offset="1" stopColor="#9B59F5" />
        </linearGradient>
        <linearGradient id="gmfill" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#5B6BF5" /><stop offset="1" stopColor="#9B59F5" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function IconProfile({ active }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke={active ? 'url(#gp)' : '#C0C0C0'} strokeWidth="2" />
      <path
        d="M4 20c0-4 3.582-7 8-7s8 3 8 7"
        stroke={active ? 'url(#gp)' : '#C0C0C0'}
        strokeWidth="2"
        strokeLinecap="round"
      />
      <defs>
        <linearGradient id="gp" x1="0" y1="0" x2="1" y2="1">
          <stop stopColor="#5B6BF5" /><stop offset="1" stopColor="#9B59F5" />
        </linearGradient>
      </defs>
    </svg>
  )
}

const TABS_LEFT = [
  { to: '/wisher', labelKey: 'nav.accueil', Icon: IconWisher },
  { to: '/maker',  labelKey: 'nav.explorer', Icon: IconMaker },
]

const TABS_RIGHT = [
  { to: '/messages', labelKey: 'nav.messages', Icon: IconMessages },
  { to: '/profile',  labelKey: 'nav.profil',   Icon: IconProfile },
]

export default function BottomTabBar() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { unreadMessagesCount, expiringWishesCount } = useNotifications()
  const profile = useAuthStore((s) => s.profile)
  const [showPackModal, setShowPackModal] = useState(false)

  function getBadge(to) {
    if (to === '/messages' && unreadMessagesCount > 0) {
      return { count: unreadMessagesCount > 9 ? '9+' : unreadMessagesCount, color: '#EF4444' }
    }
    if (to === '/wisher' && expiringWishesCount > 0) {
      return { count: expiringWishesCount > 9 ? '9+' : expiringWishesCount, color: '#F59E0B' }
    }
    return null
  }

  function handleCreateWish() {
    const freeRemaining = Math.max(0, 3 - (profile?.monthly_free_used || 0))
    const totalRemaining = freeRemaining + (profile?.pack_slots || 0)
    if (totalRemaining <= 0) {
      setShowPackModal(true)
    } else {
      navigate('/wisher/create')
    }
  }

  function renderTab({ to, labelKey, Icon }) {
    const active = location.pathname.startsWith(to)
    const badge = getBadge(to)
    return (
      <NavLink
        key={to}
        to={to}
        className="flex flex-col items-center gap-1 flex-1 py-2 relative"
      >
        <div className="relative">
          <Icon active={active} />
          {badge && (
            <span
              className="absolute -top-1.5 -right-2.5 min-w-[18px] h-[18px] rounded-full flex items-center justify-center text-white text-[11px] font-bold px-1"
              style={{ background: badge.color }}
            >
              {badge.count}
            </span>
          )}
        </div>
        <span
          className="text-[10px] font-semibold"
          style={
            active
              ? { background: 'linear-gradient(135deg, #5B6BF5, #9B59F5)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }
              : { color: '#C0C0C0' }
          }
        >
          {t(labelKey)}
        </span>
      </NavLink>
    )
  }

  return (
    <>
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[430px] bg-white z-40
                      flex items-center justify-around px-2 pt-2
                      shadow-[0_-2px_16px_rgba(0,0,0,0.07)]"
        style={{ paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))' }}>

        {/* Onglets gauche */}
        {TABS_LEFT.map(renderTab)}

        {/* Bouton + central */}
        <div className="flex flex-col items-center gap-1 flex-1 py-2">
          <button
            onClick={handleCreateWish}
            className="w-12 h-12 rounded-full flex items-center justify-center active:scale-95 transition-transform"
            style={{
              background: 'linear-gradient(135deg, #5B6BF5, #9B59F5)',
              boxShadow: '0 2px 8px rgba(91,107,245,0.3)',
            }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Onglets droite */}
        {TABS_RIGHT.map(renderTab)}
      </nav>

      <WishPackModal
        open={showPackModal}
        onClose={() => setShowPackModal(false)}
        onSuccess={() => {
          setShowPackModal(false)
          navigate('/wisher/create')
        }}
      />
    </>
  )
}
