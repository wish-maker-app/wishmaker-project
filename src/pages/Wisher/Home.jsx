import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import BottomTabBar from '../../components/layout/BottomTabBar'
import { MOCK_USER, MOCK_WISHES } from '../../data/mock'

function NotificationBell() {
  return (
    <button className="w-11 h-11 rounded-full border border-[#E8E8E8] flex items-center justify-center relative bg-white">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9z" stroke="#1A1A2E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M13.73 21a2 2 0 01-3.46 0" stroke="#1A1A2E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-red-500" />
    </button>
  )
}

function ActionCard({ icon, title, subtitle, onClick }) {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="flex items-center gap-4 w-full bg-white rounded-2xl border border-[#F0F0F0] px-4 py-4 text-left"
    >
      <div className="w-12 h-12 rounded-full bg-[#F0F2FF] flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-bold text-[#1A1A2E]">{title}</p>
        <p className="text-[13px] text-[#8A8A9A]">{subtitle}</p>
      </div>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
        <path d="M9 18l6-6-6-6" stroke="#C0C0C0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </motion.button>
  )
}

export default function WisherHome() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const user = MOCK_USER
  const wishCount = MOCK_WISHES.filter(w => w.wisher.prenom === user.prenom).length || MOCK_WISHES.length

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex flex-col">

      {/* Header */}
      <div className="px-5 pt-14 pb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center font-bold text-white text-sm"
                style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}>
                {user.prenom[0]}{user.nom[0]}
              </div>
            )}
          </div>
          <div>
            <p className="text-[13px] text-[#8A8A9A]">{t('wisher.home.bonjour').toLowerCase()} {user.prenom}</p>
            <p className="text-[15px] font-bold text-[#1A1A2E] flex items-center gap-1">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#5B6BF5">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
              {user.ville}, France
            </p>
          </div>
        </div>
        <NotificationBell />
      </div>

      {/* Séparateur */}
      <div className="h-px bg-[#F0F0F0] mx-5" />

      {/* Contenu */}
      <div className="px-5 pt-5 pb-28 flex flex-col gap-4">
        <h2 className="text-xl font-bold text-[#1A1A2E]">{t('wisher.home.bienvenue')}</h2>

        <ActionCard
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z" fill="#5B6BF5" fillOpacity="0.3"/>
              <path d="M20 11h-2.05A6.98 6.98 0 0013 6.05V4h-2v2.05A6.98 6.98 0 006.05 11H4v2h2.05A6.98 6.98 0 0011 17.95V20h2v-2.05A6.98 6.98 0 0017.95 13H20v-2zm-8 5c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5z" fill="#5B6BF5"/>
            </svg>
          }
          title={t('wisher.home.faire_voeu')}
          subtitle={t('wisher.home.faire_voeu_sub')}
          onClick={() => navigate('/wisher/create/1')}
        />

        <ActionCard
          icon={
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="18" height="18" rx="3" stroke="#5B6BF5" strokeWidth="1.8"/>
              <path d="M3 9h18" stroke="#5B6BF5" strokeWidth="1.8"/>
              <path d="M9 3v6" stroke="#5B6BF5" strokeWidth="1.8"/>
              <path d="M7 13h4M7 17h6" stroke="#5B6BF5" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          }
          title={t('wisher.home.mes_voeux')}
          subtitle={`${wishCount} ${t('wisher.home.mes_voeux_sub')}`}
          onClick={() => navigate('/wisher/mes-voeux')}
        />
      </div>

      <BottomTabBar />
    </div>
  )
}
