import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import BottomTabBar from '../../components/layout/BottomTabBar'
import { MOCK_USER } from '../../data/mock'

function ProfileItem({ icon, label, right, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-4 w-full py-4 text-left"
    >
      <div className="w-6 flex items-center justify-center flex-shrink-0 text-[#1A1A2E]">
        {icon}
      </div>
      <span className="flex-1 text-[15px] font-medium text-[#1A1A2E]">{label}</span>
      {right || (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
          <path d="M9 18l6-6-6-6" stroke="#C0C0C0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </button>
  )
}

function SectionTitle({ title }) {
  return <p className="text-[13px] font-semibold text-[#8A8A9A] uppercase tracking-wide mt-4 mb-1">{title}</p>
}

export default function Profile() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const user = MOCK_USER

  return (
    <div className="min-h-screen bg-white flex flex-col">

      {/* Header profil */}
      <div className="px-5 pt-14 pb-4 flex items-center gap-4">
        <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0">
          {user.avatar_url ? (
            <img src={user.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-bold text-white text-lg"
              style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}>
              {user.prenom[0]}{user.nom[0]}
            </div>
          )}
        </div>
        <div>
          <p className="text-lg font-bold text-[#1A1A2E]">{user.prenom} {user.nom}</p>
          <p className="text-[13px] text-[#8A8A9A]">@{user.prenom}{user.nom}</p>
        </div>
      </div>

      {/* Contenu scrollable */}
      <div className="flex-1 px-5 pb-28 overflow-y-auto">

        {/* Personal Info */}
        <SectionTitle title="Personal Info" />
        <ProfileItem
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="#1A1A2E" strokeWidth="1.8"/><path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" stroke="#1A1A2E" strokeWidth="1.8" strokeLinecap="round"/></svg>}
          label="Profil"
        />
        <ProfileItem
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="20" height="14" rx="3" stroke="#1A1A2E" strokeWidth="1.8"/><path d="M2 10h20" stroke="#1A1A2E" strokeWidth="1.8"/></svg>}
          label="Méthode de paiement"
        />

        {/* Security */}
        <SectionTitle title="Security" />
        <ProfileItem
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="10" rx="2" stroke="#1A1A2E" strokeWidth="1.8"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="#1A1A2E" strokeWidth="1.8" strokeLinecap="round"/></svg>}
          label="Changer le mot de passe"
        />
        <ProfileItem
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="10" rx="2" stroke="#1A1A2E" strokeWidth="1.8"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="#1A1A2E" strokeWidth="1.8" strokeLinecap="round"/><circle cx="12" cy="16" r="1.5" fill="#1A1A2E"/></svg>}
          label="Mot de passe oublié"
        />
        <ProfileItem
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#1A1A2E" strokeWidth="1.8" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" stroke="#1A1A2E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          label="Sécurité"
        />

        {/* General */}
        <SectionTitle title="General" />
        <ProfileItem
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#1A1A2E" strokeWidth="1.8"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z" stroke="#1A1A2E" strokeWidth="1.8"/></svg>}
          label="Langue"
        />
        <ProfileItem
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M3 6l2 14h14l2-14M10 11v6M14 11v6" stroke="#1A1A2E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          label="Vider le cash"
          right={<span className="text-[13px] text-[#8A8A9A]">88 MB</span>}
        />

        {/* About */}
        <SectionTitle title="About" />
        <ProfileItem
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#1A1A2E" strokeWidth="1.8" strokeLinejoin="round"/></svg>}
          label="Mentions légales et politiques"
        />

        {/* Déconnexion */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          className="mt-6 mb-4 w-full h-12 rounded-full border border-red-400 text-red-500 font-semibold text-sm"
        >
          {t('profile.deconnexion')}
        </motion.button>
      </div>

      <BottomTabBar />
    </div>
  )
}
