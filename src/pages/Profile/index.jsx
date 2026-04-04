import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import BottomTabBar from '../../components/layout/BottomTabBar'
import Button from '../../components/ui/Button'
import useAuthStore from '../../store/authStore'
import { useAuth } from '../../hooks/useAuth'
import AccountTypeBadge from '../../components/ui/AccountTypeBadge'
import { requestPushPermission } from '../../lib/pushNotifications'

// ── Composants utilitaires ──

function ProfileItem({ icon, label, value, onClick }) {
  return (
    <button onClick={onClick} className="flex items-center gap-4 w-full py-4 text-left">
      <div className="w-6 flex items-center justify-center flex-shrink-0">{icon}</div>
      <span className="flex-1 text-[15px] font-medium text-[#1A1A2E]">{label}</span>
      {value && <span className="text-[13px] text-[#8A8A9A]">{value}</span>}
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="flex-shrink-0">
        <path d="M9 18l6-6-6-6" stroke="#C0C0C0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </button>
  )
}

function SectionTitle({ title }) {
  return <p className="text-[13px] font-semibold text-[#8A8A9A] uppercase tracking-wide mt-5 mb-1">{title}</p>
}

function EditModal({ open, onClose, title, children }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 z-[900] overlay-backdrop"
          />
          <motion.div
            initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-[28px] z-[901] px-5 pb-8 pt-4 max-h-[85vh] overflow-y-auto bottom-sheet"
          >
            <div className="w-10 h-1 rounded-full bg-[#E0E0E0] mx-auto mb-4" />
            <h2 className="text-lg font-bold text-[#1A1A2E] mb-5">{title}</h2>
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ── Icons ──
const icons = {
  user: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="#1A1A2E" strokeWidth="1.8"/><path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" stroke="#1A1A2E" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  payment: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="20" height="14" rx="3" stroke="#1A1A2E" strokeWidth="1.8"/><path d="M2 10h20" stroke="#1A1A2E" strokeWidth="1.8"/></svg>,
  lock: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="10" rx="2" stroke="#1A1A2E" strokeWidth="1.8"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="#1A1A2E" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  lockDot: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="10" rx="2" stroke="#1A1A2E" strokeWidth="1.8"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="#1A1A2E" strokeWidth="1.8" strokeLinecap="round"/><circle cx="12" cy="16" r="1.5" fill="#1A1A2E"/></svg>,
  shield: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#1A1A2E" strokeWidth="1.8" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" stroke="#1A1A2E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  globe: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#1A1A2E" strokeWidth="1.8"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z" stroke="#1A1A2E" strokeWidth="1.8"/></svg>,
  trash: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M3 6l2 14h14l2-14M10 11v6M14 11v6" stroke="#1A1A2E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  legal: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#1A1A2E" strokeWidth="1.8" strokeLinejoin="round"/></svg>,
  help: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#1A1A2E" strokeWidth="1.8"/><path d="M9 9a3 3 0 015.12 2.13c0 2-3 2.5-3 4.37" stroke="#1A1A2E" strokeWidth="1.8" strokeLinecap="round"/><circle cx="12" cy="19" r="0.5" fill="#1A1A2E" stroke="#1A1A2E" strokeWidth="0.5"/></svg>,
}

export default function Profile() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { signOut } = useAuth()
  const profile = useAuthStore((s) => s.profile)
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.email === import.meta.env.VITE_ADMIN_EMAIL

  const [editModal, setEditModal] = useState(null) // 'password' | 'langue' | null
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [newPwd, setNewPwd] = useState('')
  const [confirmPwd, setConfirmPwd] = useState('')
  const [selectedLang, setSelectedLang] = useState(null)

  if (!profile) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-[#5B6BF5] border-t-transparent animate-spin" />
      </div>
    )
  }

  async function savePassword() {
    if (newPwd.length < 6) { toast.error('Min. 6 caractères'); return }
    if (newPwd !== confirmPwd) { toast.error('Les mots de passe ne correspondent pas'); return }
    setSaving(true)
    try {
      const { error } = await (await import('../../lib/supabase')).supabase.auth.updateUser({ password: newPwd })
      if (error) throw error
      setEditModal(null)
      setNewPwd('')
      setConfirmPwd('')
      toast.success('Mot de passe mis à jour !')
    } catch (err) {
      toast.error(err.message || 'Erreur')
    } finally { setSaving(false) }
  }

  function handleLanguageChange(lang) {
    i18n.changeLanguage(lang)
    localStorage.setItem('lang', lang)
    setEditModal(null)
    toast.success(lang === 'fr' ? 'Langue mise à jour !' : 'Language updated!')
  }

  return (
    <div className="h-screen bg-white flex flex-col">

      {/* Header profil — fixe en haut */}
      <div className="px-5 pt-4 pb-2 flex items-center gap-4 flex-shrink-0">
        <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0 border border-[#E8E8E8]">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center font-bold text-white text-lg"
              style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}>
              {profile.prenom[0]}{profile.nom[0]}
            </div>
          )}
        </div>
        <div>
          <p className="text-lg font-bold text-[#1A1A2E]">{profile.prenom} {profile.nom}</p>
          <p className="text-[13px] text-[#5B6BF5] font-medium">
            {profile.pseudo || `user_${(profile.id || '0000').slice(0, 4)}`}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <AccountTypeBadge type={profile.type_compte} />
            {profile.rating > 0 ? (
              <div className="flex items-center gap-1">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#F5C542"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                <span className="text-xs font-semibold text-[#1A1A2E]">{profile.rating}</span>
              </div>
            ) : (
              <span className="text-xs text-[#8A8A9A]">Aucun avis</span>
            )}
          </div>
        </div>
      </div>

      {/* Contenu scrollable */}
      <div className="flex-1 px-5 pb-28 overflow-y-auto">

        <SectionTitle title="Personal Info" />
        <ProfileItem icon={icons.user} label="Profil" onClick={() => navigate('/profile/edit')} />
        <ProfileItem
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="#1A1A2E" strokeWidth="1.8" strokeLinejoin="round"/></svg>}
          label="Mes avis"
          value={profile.rating > 0 ? `${profile.rating}/5` : null}
          onClick={() => navigate('/profile/reviews')}
        />

        <SectionTitle title="Security" />
        <ProfileItem icon={icons.lock} label="Changer le mot de passe"
          onClick={() => { setNewPwd(''); setConfirmPwd(''); setEditModal('password') }} />

        <SectionTitle title="General" />
        <ProfileItem icon={icons.globe} label="Langue" onClick={() => setEditModal('langue')} />
        <ProfileItem
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="#1A1A2E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M13.73 21a2 2 0 01-3.46 0" stroke="#1A1A2E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          label="Notifications"
          value={typeof Notification !== 'undefined' && Notification.permission === 'granted' ? 'Activées' : 'Désactivées'}
          onClick={async () => {
            const user = useAuthStore.getState().user
            if (!user) return
            const ok = await requestPushPermission(user.id)
            if (ok) {
              toast.success('Notifications activées !')
            } else {
              toast('Pour activer les notifications, va dans Réglages → Wishmaker → Notifications', { icon: 'ℹ️', duration: 5000 })
            }
          }}
        />

        {isAdmin && (
          <>
            <SectionTitle title="Administration" />
            <ProfileItem icon={icons.shield} label="Panel Admin" onClick={() => navigate('/admin')} />
          </>
        )}

        <SectionTitle title="About" />
        <ProfileItem icon={icons.legal} label="Mentions légales" />
        <ProfileItem icon={icons.help} label="Aide et assistance" />

        {/* Inviter des amis */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={async () => {
            const shareData = {
              title: 'Wish Maker',
              text: "Découvre Wish Maker, l'app qui exauce tes vœux du quotidien !",
              url: 'https://wishmaker-project.vercel.app',
            }
            try {
              if (navigator.share) {
                await navigator.share(shareData)
              } else {
                await navigator.clipboard.writeText(shareData.url)
                toast.success('Lien copié ! Partage-le à tes amis')
              }
            } catch (err) {
              if (err.name !== 'AbortError') {
                await navigator.clipboard.writeText(shareData.url)
                toast.success('Lien copié ! Partage-le à tes amis')
              }
            }
          }}
          className="mt-8 mb-3 w-full h-14 rounded-full text-white font-bold text-sm flex items-center justify-center gap-2"
          style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 6l-4-4-4 4" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 2v13" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Inviter des amis
        </motion.button>

        {/* Déconnexion */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => setShowLogoutConfirm(true)}
          className="mb-4 w-full h-12 rounded-full border border-[#5B6BF5] text-[#5B6BF5] font-semibold text-sm"
        >
          {t('profile.deconnexion')}
        </motion.button>
      </div>

      {/* Modal mot de passe */}
      <EditModal open={editModal === 'password'} onClose={() => setEditModal(null)} title="Changer le mot de passe">
        <div className="mb-4">
          <label className="text-xs font-semibold text-[#8A8A9A] mb-1.5 block">Nouveau mot de passe</label>
          <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)}
            placeholder="Min. 6 caractères"
            className="w-full h-12 bg-[#F7F8FC] rounded-2xl px-4 text-sm text-[#1A1A2E] outline-none" />
        </div>
        <div className="mb-4">
          <label className="text-xs font-semibold text-[#8A8A9A] mb-1.5 block">Confirmer</label>
          <input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)}
            placeholder="Confirmez le mot de passe"
            className="w-full h-12 bg-[#F7F8FC] rounded-2xl px-4 text-sm text-[#1A1A2E] outline-none" />
        </div>
        <Button onClick={savePassword} loading={saving}>Mettre à jour</Button>
      </EditModal>

      {/* Modal langue */}
      <EditModal open={editModal === 'langue'} onClose={() => { setEditModal(null); setSelectedLang(null) }} title="Choisir la langue">
        <div className="flex flex-col gap-2">
          {[
            { code: 'fr', label: 'Français', flag: (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 24" width="32" height="22" className="rounded-sm">
                <rect width="12" height="24" fill="#002395"/>
                <rect x="12" width="12" height="24" fill="#FFF"/>
                <rect x="24" width="12" height="24" fill="#ED2939"/>
              </svg>
            )},
            { code: 'en', label: 'English', flag: (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 60 30" width="32" height="22" className="rounded-sm">
                <rect width="60" height="30" fill="#012169"/>
                <path d="M0,0 L60,30 M60,0 L0,30" stroke="#FFF" strokeWidth="6"/>
                <path d="M0,0 L60,30 M60,0 L0,30" stroke="#C8102E" strokeWidth="4" clipPath="url(#t-profile)"/>
                <clipPath id="t-profile"><path d="M30,0 V15 H60 V0zM30,30 V15 H0 V30z"/></clipPath>
                <path d="M30,0 V30 M0,15 H60" stroke="#FFF" strokeWidth="10"/>
                <path d="M30,0 V30 M0,15 H60" stroke="#C8102E" strokeWidth="6"/>
              </svg>
            )},
          ].map((lang) => {
            const current = selectedLang || i18n.language?.split('-')[0]
            const isActive = current === lang.code
            return (
              <button key={lang.code} onClick={() => setSelectedLang(lang.code)}
                className="flex items-center gap-3 px-4 py-4 rounded-2xl transition-all border-2"
                style={isActive ? { borderColor: '#5B6BF5', background: '#EEF0FF' } : { borderColor: '#F0F0F0' }}>
                <span className="flex-shrink-0">{lang.flag}</span>
                <span className={`text-sm font-semibold ${isActive ? 'text-[#5B6BF5]' : 'text-[#1A1A2E]'}`}>{lang.label}</span>
                {isActive && (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="ml-auto">
                    <path d="M5 13l4 4L19 7" stroke="#5B6BF5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            )
          })}
        </div>
        <div className="mt-4">
          <Button
            disabled={!selectedLang || selectedLang === i18n.language?.split('-')[0]}
            onClick={() => {
              if (selectedLang) handleLanguageChange(selectedLang)
              setSelectedLang(null)
            }}
          >
            Sauvegarder
          </Button>
        </div>
      </EditModal>

      {/* Modal confirmation déconnexion */}
      <EditModal open={showLogoutConfirm} onClose={() => setShowLogoutConfirm(false)} title="Se déconnecter">
        <p className="text-[15px] text-[#8A8A9A] mb-6">Êtes-vous sûr de vouloir vous déconnecter ?</p>
        <div className="flex gap-3">
          <button
            onClick={() => setShowLogoutConfirm(false)}
            className="flex-1 h-12 rounded-full border border-[#E0E0E0] text-[#1A1A2E] font-semibold text-sm"
          >
            Annuler
          </button>
          <button
            onClick={signOut}
            className="flex-1 h-12 rounded-full bg-[#FF4D4D] text-white font-semibold text-sm"
          >
            Se déconnecter
          </button>
        </div>
      </EditModal>

      <BottomTabBar />
    </div>
  )
}
