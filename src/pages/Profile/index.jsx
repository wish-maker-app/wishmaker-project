import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import BottomSheet from '../../components/ui/BottomSheet'
import toast from 'react-hot-toast'
import BottomTabBar from '../../components/layout/BottomTabBar'
import Button from '../../components/ui/Button'
import useAuthStore from '../../store/authStore'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
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
    <BottomSheet open={open} onClose={onClose}>
      <h2 className="text-lg font-bold text-[#1A1A2E] mb-5">{title}</h2>
      {children}
    </BottomSheet>
  )
}

// ── Icons ──
const icons = {
  user: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="8" r="4" stroke="#1A1A2E" strokeWidth="1.8"/><path d="M4 20c0-4 3.582-7 8-7s8 3 8 7" stroke="#1A1A2E" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  payment: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="2" y="5" width="20" height="14" rx="3" stroke="#1A1A2E" strokeWidth="1.8"/><path d="M2 10h20" stroke="#1A1A2E" strokeWidth="1.8"/></svg>,
  lock: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="10" rx="2" stroke="#1A1A2E" strokeWidth="1.8"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="#1A1A2E" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  lockDot: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="3" y="11" width="18" height="10" rx="2" stroke="#1A1A2E" strokeWidth="1.8"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="#1A1A2E" strokeWidth="1.8" strokeLinecap="round"/><circle cx="12" cy="16" r="1.5" fill="#1A1A2E"/></svg>,
  shield: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#1A1A2E" strokeWidth="1.8" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" stroke="#1A1A2E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  chart: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><line x1="18" y1="20" x2="18" y2="10" stroke="#1A1A2E" strokeWidth="1.8" strokeLinecap="round"/><line x1="12" y1="20" x2="12" y2="4" stroke="#1A1A2E" strokeWidth="1.8" strokeLinecap="round"/><line x1="6" y1="20" x2="6" y2="14" stroke="#1A1A2E" strokeWidth="1.8" strokeLinecap="round"/></svg>,
  globe: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#1A1A2E" strokeWidth="1.8"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10A15.3 15.3 0 0112 2z" stroke="#1A1A2E" strokeWidth="1.8"/></svg>,
  trash: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M3 6h18M5 6l1.5 14a1 1 0 001 1h9a1 1 0 001-1L19 6M9 6V4a1 1 0 011-1h4a1 1 0 011 1v2M10 11v6M14 11v6" stroke="#1A1A2E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  legal: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#1A1A2E" strokeWidth="1.8" strokeLinejoin="round"/></svg>,
  help: <svg width="22" height="22" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke="#1A1A2E" strokeWidth="1.8"/><path d="M9 9a3 3 0 015.12 2.13c0 2-3 2.5-3 4.37" stroke="#1A1A2E" strokeWidth="1.8" strokeLinecap="round"/><circle cx="12" cy="19" r="0.5" fill="#1A1A2E" stroke="#1A1A2E" strokeWidth="0.5"/></svg>,
}

export default function Profile() {
  const navigate = useNavigate()
  const { t, i18n } = useTranslation()
  const { signOut } = useAuth()
  const profile = useAuthStore((s) => s.profile)
  const user = useAuthStore((s) => s.user)
  // Source de verite : colonne users.is_admin en BDD (coherent avec /admin et /admin/stats)
  const isAdmin = !!profile?.is_admin

  const [editModal, setEditModal] = useState(null) // 'password' | 'langue' | null
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletingAccount, setDeletingAccount] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  // État live de la permission notifications (mis à jour après chaque demande
  // + au focus de la page, pour refléter un changement fait via les Réglages OS).
  const [notifPermission, setNotifPermission] = useState(
    typeof Notification !== 'undefined' ? Notification.permission : 'unsupported'
  )

  useEffect(() => {
    function syncPermission() {
      if (typeof Notification !== 'undefined') {
        setNotifPermission(Notification.permission)
      }
    }
    // Resync au focus de la page (cas où user va dans Réglages OS puis revient)
    window.addEventListener('focus', syncPermission)
    document.addEventListener('visibilitychange', syncPermission)
    return () => {
      window.removeEventListener('focus', syncPermission)
      document.removeEventListener('visibilitychange', syncPermission)
    }
  }, [])
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
    if (newPwd.length < 6) { toast.error(t('profile.password.min_chars')); return }
    if (newPwd !== confirmPwd) { toast.error(t('profile.password.no_match')); return }
    setSaving(true)
    try {
      const { error } = await (await import('../../lib/supabase')).supabase.auth.updateUser({ password: newPwd })
      if (error) throw error
      setEditModal(null)
      setNewPwd('')
      setConfirmPwd('')
      toast.success(t('profile.password.success'))
    } catch (err) {
      toast.error(err.message || t('common.erreur'))
    } finally { setSaving(false) }
  }

  function handleLanguageChange(lang) {
    i18n.changeLanguage(lang)
    // Clé alignée avec src/lib/i18n.js (sinon le choix ne persiste pas au F5)
    localStorage.setItem('wishmaker-lang', lang)
    setEditModal(null)
    toast.success(t('profile.lang_updated'))
  }

  return (
    <div className="h-screen bg-white flex flex-col">

      {/* Header profil — fixe en haut, separe du contenu par une fine border */}
      <div className="px-5 pt-4 pb-4 flex items-center gap-4 flex-shrink-0 border-b border-[#EEEEF2]">
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
              <span className="text-xs text-[#8A8A9A]">{t('profile.aucun_avis')}</span>
            )}
          </div>
        </div>
      </div>

      {/* Contenu scrollable */}
      <div className="flex-1 px-5 pb-28 overflow-y-auto">

        <SectionTitle title={t('profile.section_personal')} />
        <ProfileItem icon={icons.user} label={t('profile.item_profil')} onClick={() => navigate('/profile/edit')} />
        <ProfileItem
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" stroke="#1A1A2E" strokeWidth="1.8" strokeLinejoin="round"/></svg>}
          label={t('profile.item_avis')}
          onClick={() => navigate('/profile/reviews')}
        />
        <ProfileItem
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="#1A1A2E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          label={t('profile.item_favoris')}
          onClick={() => navigate('/profile/favorites')}
        />
        {profile?.type_compte === 'pro' && (
          <ProfileItem
            icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><rect x="2" y="7" width="20" height="14" rx="2" stroke="#1A1A2E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" stroke="#1A1A2E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
            label={t('profile.item_pro_tags')}
            onClick={() => navigate('/profile/pro-tags')}
          />
        )}

        <SectionTitle title={t('profile.section_security')} />
        <ProfileItem icon={icons.lock} label={t('profile.item_password')}
          onClick={() => { setNewPwd(''); setConfirmPwd(''); setEditModal('password') }} />

        <SectionTitle title={t('profile.section_general')} />
        <ProfileItem icon={icons.globe} label={t('profile.item_langue')} onClick={() => setEditModal('langue')} />
        <ProfileItem
          icon={<svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="#1A1A2E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/><path d="M13.73 21a2 2 0 01-3.46 0" stroke="#1A1A2E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          label={t('profile.item_notifications')}
          value={notifPermission === 'granted' ? t('profile.notifications_on') : t('profile.notifications_off')}
          onClick={async () => {
            const user = useAuthStore.getState().user
            if (!user) return
            const ok = await requestPushPermission(user.id)
            // Resync immédiatement après la demande, peu importe le résultat
            if (typeof Notification !== 'undefined') {
              setNotifPermission(Notification.permission)
            }
            if (ok) {
              toast.success(t('profile.notifications_success'))
            } else {
              toast(t('profile.notifications_help'), { icon: 'ℹ️', duration: 5000 })
            }
          }}
        />

        {isAdmin && (
          <>
            <SectionTitle title={t('profile.section_admin')} />
            <ProfileItem icon={icons.chart} label={t('profile.item_admin_stats')} onClick={() => navigate('/admin/stats')} />
            <ProfileItem icon={icons.shield} label={t('profile.item_admin_panel')} onClick={() => navigate('/admin')} />
          </>
        )}

        <SectionTitle title={t('profile.section_about')} />
        <ProfileItem icon={icons.legal} label={t('profile.item_legal')} onClick={() => navigate('/mentions-legales')} />
        <ProfileItem icon={icons.legal} label={t('profile.item_cgu')} onClick={() => navigate('/cgu')} />
        <ProfileItem icon={icons.legal} label={t('profile.item_cgv')} onClick={() => navigate('/cgv')} />
        <ProfileItem icon={icons.legal} label={t('profile.item_privacy')} onClick={() => navigate('/privacy')} />
        <ProfileItem icon={icons.help} label={t('profile.item_help')} onClick={() => navigate('/support')} />
        <ProfileItem icon={icons.trash} label="Supprimer mon compte" onClick={() => setShowDeleteConfirm(true)} />

        {/* Inviter des amis */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={async () => {
            const shareData = {
              title: 'Wish Maker',
              text: t('invite.share_text'),
              url: 'https://wishmaker-project.vercel.app',
            }
            try {
              if (navigator.share) {
                await navigator.share(shareData)
              } else {
                await navigator.clipboard.writeText(shareData.url)
                toast.success(t('invite.lien_copie'))
              }
            } catch (err) {
              if (err.name !== 'AbortError') {
                await navigator.clipboard.writeText(shareData.url)
                toast.success(t('invite.lien_copie'))
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
          {t('invite.btn')}
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
      <EditModal open={editModal === 'password'} onClose={() => setEditModal(null)} title={t('profile.password.modal_titre')}>
        <div className="mb-4">
          <label className="text-xs font-semibold text-[#8A8A9A] mb-1.5 block">{t('profile.password.nouveau')}</label>
          <input type="password" value={newPwd} onChange={(e) => setNewPwd(e.target.value)}
            placeholder={t('profile.password.min_chars')}
            className="w-full h-12 bg-[#F7F8FC] rounded-2xl px-4 text-sm text-[#1A1A2E] outline-none" />
        </div>
        <div className="mb-4">
          <label className="text-xs font-semibold text-[#8A8A9A] mb-1.5 block">{t('profile.password.confirmer')}</label>
          <input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)}
            placeholder={t('profile.password.confirmer_placeholder')}
            className="w-full h-12 bg-[#F7F8FC] rounded-2xl px-4 text-sm text-[#1A1A2E] outline-none" />
        </div>
        <Button onClick={savePassword} loading={saving}>{t('profile.password.btn')}</Button>
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
            { code: 'es', label: 'Español', flag: (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 24" width="32" height="22" className="rounded-sm">
                <rect width="36" height="24" fill="#AA151B"/>
                <rect y="6" width="36" height="12" fill="#F1BF00"/>
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
      <EditModal open={showLogoutConfirm} onClose={() => setShowLogoutConfirm(false)} title={t('profile.logout.titre')}>
        <p className="text-[15px] text-[#8A8A9A] mb-6">{t('profile.logout.confirm_question')}</p>
        <div className="flex gap-3">
          <button
            onClick={() => setShowLogoutConfirm(false)}
            disabled={signingOut}
            className="flex-1 h-12 rounded-full border border-[#E0E0E0] text-[#1A1A2E] font-semibold text-sm disabled:opacity-60"
          >
            {t('common.annuler')}
          </button>
          <button
            disabled={signingOut}
            onClick={async () => {
              if (signingOut) return
              setSigningOut(true)
              try {
                await signOut()
              } finally {
                // Le composant peut être démonté avant ce point (navigate /auth),
                // donc on protège contre setState sur unmounted — pas grave si ça throw.
                try { setSigningOut(false) } catch {}
              }
            }}
            className="flex-1 h-12 rounded-full bg-[#FF4D4D] text-white font-semibold text-sm disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {signingOut ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>{t('profile.logout.loading') || 'Déconnexion…'}</span>
              </>
            ) : (
              t('profile.logout.confirm') || 'Se déconnecter'
            )}
          </button>
        </div>
      </EditModal>

      {/* Modal suppression de compte (RGPD) */}
      <EditModal
        open={showDeleteConfirm}
        onClose={() => { if (!deletingAccount) { setShowDeleteConfirm(false); setDeleteConfirmText('') } }}
        title="Supprimer mon compte"
      >
        <div className="mb-4 p-4 rounded-2xl bg-[#FEF2F2] border border-[#FECACA]">
          <p className="text-sm font-semibold text-[#991B1B] mb-2">Action irréversible</p>
          <p className="text-[13px] text-[#7F1D1D] leading-relaxed">
            Cette suppression efface définitivement :
          </p>
          <ul className="text-[13px] text-[#7F1D1D] leading-relaxed list-disc pl-5 mt-1">
            <li>Votre compte et vos données personnelles</li>
            <li>Tous vos vœux publiés</li>
            <li>Toutes vos conversations</li>
            <li>Vos avis donnés et reçus</li>
          </ul>
          <p className="text-[13px] text-[#7F1D1D] leading-relaxed mt-2">
            Aucune récupération ne sera possible.
          </p>
        </div>
        <div className="mb-4">
          <label className="text-xs font-semibold text-[#8A8A9A] mb-1.5 block">
            Pour confirmer, tapez <span className="font-bold text-[#EF4444]">SUPPRIMER</span> ci-dessous :
          </label>
          <input
            type="text"
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder="SUPPRIMER"
            disabled={deletingAccount}
            className="w-full h-12 bg-[#F7F8FC] rounded-2xl px-4 text-sm text-[#1A1A2E] outline-none border border-transparent focus:border-[#EF4444]"
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => { setShowDeleteConfirm(false); setDeleteConfirmText('') }}
            disabled={deletingAccount}
            className="flex-1 h-12 rounded-full border border-[#E0E0E0] text-[#1A1A2E] font-semibold text-sm disabled:opacity-60"
          >
            {t('common.annuler')}
          </button>
          <button
            disabled={deletingAccount || deleteConfirmText !== 'SUPPRIMER'}
            onClick={async () => {
              if (deleteConfirmText !== 'SUPPRIMER') return
              setDeletingAccount(true)
              try {
                const { data: { session } } = await supabase.auth.getSession()
                if (!session) throw new Error('Session expirée')
                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
                // Timeout 20s : la suppression touche plusieurs tables, mais on
                // ne laisse JAMAIS le spinner tourner dans le vide si la connexion
                // est morte (retour d'arrière-plan) ou la fonction trop lente.
                const ctrl = new AbortController()
                const to = setTimeout(() => ctrl.abort('timeout'), 20000)
                let res
                try {
                  res = await fetch(`${supabaseUrl}/functions/v1/delete-account`, {
                    method: 'POST',
                    headers: {
                      Authorization: `Bearer ${session.access_token}`,
                      'Content-Type': 'application/json',
                      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
                    },
                    signal: ctrl.signal,
                  })
                } catch (e) {
                  if (e?.name === 'AbortError' || e === 'timeout') {
                    throw new Error('Délai dépassé. Réessaie dans un instant.')
                  }
                  throw new Error('Connexion impossible. Vérifie ta connexion et réessaie.')
                } finally {
                  clearTimeout(to)
                }
                const data = await res.json().catch(() => ({}))
                if (!res.ok) throw new Error(data.error || 'Erreur lors de la suppression')
                toast.success('Compte supprimé. Au revoir.')
                // Logout et navigate vers /auth
                await signOut()
              } catch (err) {
                toast.error(err.message || 'Erreur lors de la suppression')
                setDeletingAccount(false)
              }
            }}
            className="flex-1 h-12 rounded-full bg-[#EF4444] text-white font-semibold text-sm disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {deletingAccount ? (
              <>
                <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                <span>Suppression…</span>
              </>
            ) : (
              'Supprimer définitivement'
            )}
          </button>
        </div>
      </EditModal>

      <BottomTabBar />
    </div>
  )
}
