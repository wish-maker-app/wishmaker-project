import { useState, useEffect, useCallback, useRef } from 'react'
import BottomSheet from '../../components/ui/BottomSheet'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import toast from 'react-hot-toast'
import BottomTabBar from '../../components/layout/BottomTabBar'
import useAuthStore from '../../store/authStore'
import useConfigStore from '../../store/configStore'
import { useWishes } from '../../hooks/useWishes'
import { supabase } from '../../lib/supabase'
import WishPackModal from '../../components/ui/WishPackModal'
import PaymentForm from '../../components/ui/PaymentForm'
import { applyPurchase } from '../../lib/stripe'
import { getCached, setCached } from '../../lib/wishesCache'
import lampeGenieIcon from '../../assets/lampe-genie.svg'
import CategoryFallback from '../../components/ui/CategoryFallback'
import { CATEGORY_ICONS, CATEGORY_COLORS } from '../../lib/categoryIcons'

// Slugs des exemples de voeux (couleur + icone par categorie).
// Les textes sont dans i18n : wisher.home.exemples (FR/EN/ES).
const WISH_EXAMPLE_SLUGS = ['delegue', 'sauve', 'exauce', 'soin', 'divertis', 'transport']

const TABS = ['en_attente', 'realise', 'expire']

const STATUS_MAP = {
  en_attente: 'en_attente',
  en_cours: 'en_attente',
  terminé: 'realise',
  realise: 'realise',
  annule: 'expire',
  expire: 'expire',
}

// timeAgo et expirationInfo prennent `t` en argument pour produire des labels
// traduits selon la langue courante (sinon ils restent figés en FR).
function timeAgo(iso, t) {
  const diff = (Date.now() - new Date(iso)) / 1000
  if (diff < 60)    return t('wisher.home.il_y_a_instant')
  if (diff < 3600)  return t('wisher.home.il_y_a_min', { n: Math.floor(diff / 60) })
  if (diff < 86400) return t('wisher.home.il_y_a_h', { n: Math.floor(diff / 3600) })
  return t('wisher.home.il_y_a_j', { n: Math.floor(diff / 86400) })
}

function expirationInfo(expiresAt, t) {
  if (!expiresAt) return null
  const diff = new Date(expiresAt) - Date.now()
  if (diff <= 0) return { label: t('wisher.home.expire'), color: '#EF4444', expired: true }
  const hours = Math.floor(diff / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  const label = hours > 0
    ? t('wisher.home.expire_dans_h', { h: hours, m: minutes })
    : t('wisher.home.expire_dans_min', { m: minutes })
  const color = hours < 6 ? '#EF4444' : hours < 24 ? '#F59E0B' : '#22C55E'
  return { label, color }
}

function ConfirmModal({ open, onClose, title, description, price, buttonLabel, onConfirm, loading }) {
  return (
    <BottomSheet open={open} onClose={onClose}>
      <h2 className="text-lg font-bold text-[#1A1A2E] mb-2">{title}</h2>
      <p className="text-sm text-[#8A8A9A] mb-1">{description}</p>
      <p className="text-base font-bold text-[#1A1A2E] mb-5">{price}</p>
      <button
        onClick={onConfirm}
        disabled={loading}
        className="w-full h-12 rounded-full text-white font-bold text-sm"
        style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
      >
        {loading ? 'Traitement...' : buttonLabel}
      </button>
      <button onClick={onClose} className="w-full mt-3 text-sm text-[#8A8A9A] text-center">Annuler</button>
    </BottomSheet>
  )
}

function WishCard({ wish, onExtend, onMakeUrgent, onDelete, onConfirmRealization }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const exp = expirationInfo(wish.expires_at, t)
  const isActive = wish.statut === 'en_attente' || wish.statut === 'en_cours'
  const isExpired = wish.statut === 'expire' || wish.statut === 'annule' || (isActive && exp?.expired)
  const coverUrl = wish.images?.[0]?.url || null
  // Un Maker a marque ce voeu comme realise → on attend la confirmation du Wisher
  const awaitingConfirmation = !!wish.marked_realized_at && wish.statut !== 'realise'

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="bg-white rounded-[20px] overflow-hidden shadow-[0_2px_12px_rgba(0,0,0,0.06)] relative"
    >
      {/* Menu 3 points */}
      <button
        onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
        className="absolute top-2.5 right-2.5 z-10 w-8 h-8 rounded-full flex items-center justify-center bg-white/80 backdrop-blur-sm shadow-sm"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#1A1A2E">
          <circle cx="12" cy="5" r="2"/>
          <circle cx="12" cy="12" r="2"/>
          <circle cx="12" cy="19" r="2"/>
        </svg>
      </button>

      {/* Menu déroulant */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-[50]" onClick={() => setMenuOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: -4 }}
              transition={{ duration: 0.15 }}
              className="absolute right-4 top-12 bg-white rounded-2xl shadow-[0_4px_24px_rgba(0,0,0,0.12)] z-[51] overflow-hidden min-w-[160px]"
            >
              {(wish.statut === 'en_attente') && (
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); navigate(`/wisher/edit/${wish.id}`) }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#1A1A2E] hover:bg-[#F5F5F7] transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" stroke="#1A1A2E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" stroke="#1A1A2E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {t('wisher.home.modifier_voeu')}
                </button>
              )}
              {isExpired && (
                <button
                  onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onExtend(wish) }}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#1A1A2E] hover:bg-[#F5F5F7] transition-colors"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="9" stroke="#1A1A2E" strokeWidth="1.8"/>
                    <path d="M12 7v5l3 2" stroke="#1A1A2E" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  {t('wisher.home.prolonger')}
                </button>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onDelete(wish) }}
                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#EF4444] hover:bg-red-50 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                  <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6" stroke="#EF4444" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                {t('wisher.home.supprimer')}
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Banniere "Un Maker a marque ce voeu comme realise" — TRES visible, en haut de la card.
          Le Wisher peut confirmer en 1 clic SANS aller dans la conversation. */}
      {awaitingConfirmation && (
        <div className="px-4 pt-3.5 pb-3" style={{ background: 'linear-gradient(135deg,#ECFDF5,#D1FAE5)', borderBottom: '1px solid #A7F3D0' }}>
          <div className="flex-1 min-w-0 mb-2.5">
            <p className="text-[12.5px] font-bold text-[#065F46] leading-snug">
              Un Maker a indiqué avoir réalisé ce vœu
            </p>
            <p className="text-[11px] text-[#047857] mt-0.5 leading-snug">
              Confirmez si c'est exact pour clôturer la mise en relation.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={async (e) => {
                e.stopPropagation()
                if (confirming) return
                setConfirming(true)
                try { await onConfirmRealization?.(wish) } finally { setConfirming(false) }
              }}
              disabled={confirming}
              className="flex-1 h-9 rounded-full text-[12px] font-bold text-white disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg,#22C55E,#16A34A)' }}
            >
              {confirming ? 'Confirmation…' : 'Confirmer la réalisation'}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); navigate(`/messages?wishId=${wish.id}`) }}
              className="h-9 px-4 rounded-full text-[12px] font-semibold text-[#065F46] border border-[#A7F3D0] bg-white"
            >
              Discuter
            </button>
          </div>
        </div>
      )}

      <div onClick={() => navigate(`/maker/wish/${wish.id}?owner=1`)} className="cursor-pointer">
        {/* Photo de couverture ou fallback catégorie */}
        <div className="relative h-[200px] bg-[#F0F0F5]">
          {coverUrl ? (
            <img src={coverUrl} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
          ) : (
            <CategoryFallback slug={wish.category_slug} iconSize={72} />
          )}
          {wish.is_urgent && (
            <span className="absolute top-2.5 left-2.5 text-[10px] font-bold px-2 py-1 rounded-full"
              style={{ background: '#FFF4E0', color: '#F59E0B' }}>
              URGENT
            </span>
          )}
        </div>
        <div className="p-4">
          <h3 className="font-bold text-[#1A1A2E] text-base leading-snug mb-1">{wish.titre}</h3>
          <p className="text-[#8A8A9A] text-xs leading-relaxed line-clamp-2 mb-3">{wish.description}</p>

          {exp && isActive && (
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ background: exp.color }} />
              <span className="text-xs font-semibold" style={{ color: exp.color }}>{exp.label}</span>
            </div>
          )}
        </div>
      </div>

      {/* Bannière expiration proche (<6h) */}
      {isActive && exp && !exp.expired && !wish.is_extended && exp.color === '#EF4444' && (
        <div className="mx-4 mb-3 px-3 py-2.5 rounded-xl flex items-center justify-between"
          style={{ background: '#FFF7ED', border: '1px solid #FFEDD5' }}>
          <div className="flex items-center gap-2">
            <span className="text-sm">⚠️</span>
            <span className="text-xs font-semibold text-[#EA580C]">{t('wisher.home.expire_bientot')}</span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); onExtend(wish) }}
            className="text-[11px] font-bold text-white px-3 py-1 rounded-full"
            style={{ background: 'linear-gradient(135deg,#F59E0B,#F97316)' }}
          >
            {t('wisher.home.prolonger')}
          </button>
        </div>
      )}

      {/* CTA Buttons — visibles en bas de la carte */}
      {isActive && (
        <div className="px-4 pb-4 flex items-center gap-2">
          {!wish.is_extended && (
            <button
              onClick={(e) => { e.stopPropagation(); onExtend(wish) }}
              className="flex-1 h-10 rounded-full text-xs font-bold flex items-center justify-center border border-[#5B6BF5] text-[#5B6BF5] active:scale-[0.97] transition-transform"
            >
              {t('wisher.home.prolonger')}
            </button>
          )}
          {!wish.is_urgent && !exp?.expired && (
            <button
              onClick={(e) => { e.stopPropagation(); onMakeUrgent(wish) }}
              className="flex-1 h-10 rounded-full text-xs font-bold flex items-center justify-center text-white active:scale-[0.97] transition-transform"
              style={{ background: 'linear-gradient(135deg,#F59E0B,#F97316)' }}
            >
              {t('wisher.home.mettre_urgent')}
            </button>
          )}
        </div>
      )}
    </motion.div>
  )
}

export default function WisherHome() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const user = useAuthStore((s) => s.profile)
  const authTick = useAuthStore((s) => s.authTick)
  const wishDurationHours = useConfigStore((s) => s.wish_duration_hours)
  const { getMyWishes, extendWish, makeUrgent, deleteWish, confirmRealization } = useWishes()
  // Hydratation depuis le cache (évite l'écran vide à chaque retour sur la page)
  const [wishes, setWishes] = useState(() => getCached('my_wishes')?.value || [])
  const [loading, setLoading] = useState(() => !getCached('my_wishes'))
  const [activeTab, setActiveTab] = useState('en_attente')
  const [modal, setModal] = useState(null)
  const [actionLoading, setActionLoading] = useState(false)
  const [showPackModal, setShowPackModal] = useState(false)
  const [paymentModal, setPaymentModal] = useState(null) // { type, wish_id, label }
  const [showTip, setShowTip] = useState(() => localStorage.getItem('wishmaker-tip-dismissed') !== 'true')

  // ─── Drag-to-scroll horizontal pour le carrousel exemples (desktop uniquement) ───
  // Sur mobile/tablette le swipe natif fonctionne deja. Sur desktop, par defaut
  // overflow-x ne reagit pas au clic-glisser souris → on ajoute la behavior
  // manuellement (pattern Airbnb / Booking / Google Flights).
  const examplesRef = useRef(null)
  useEffect(() => {
    const el = examplesRef.current
    if (!el) return
    let isDown = false
    let startX = 0
    let startScroll = 0

    function onMouseDown(e) {
      isDown = true
      startX = e.pageX - el.offsetLeft
      startScroll = el.scrollLeft
      el.style.cursor = 'grabbing'
      el.style.userSelect = 'none'
      // CRITIQUE : on desactive scroll-snap pendant le drag. Sinon le navigateur
      // re-aligne immediatement le scroll sur le snap-point a chaque update de
      // scrollLeft → les cards "ne bougent pas" visuellement pendant le drag.
      el.style.scrollSnapType = 'none'
      el.style.scrollBehavior = 'auto'
    }
    function release() {
      if (!isDown) return
      isDown = false
      el.style.cursor = 'grab'
      el.style.userSelect = ''
      // On reactive le snap + animation smooth pour que le navigateur glisse
      // la card jusqu'au snap-point le plus proche au moment du relachement.
      el.style.scrollBehavior = 'smooth'
      el.style.scrollSnapType = 'x mandatory'
    }
    function onMouseLeave() { release() }
    function onMouseUp() { release() }
    function onMouseMove(e) {
      if (!isDown) return
      e.preventDefault()
      const x = e.pageX - el.offsetLeft
      const walk = (x - startX) * 1.2 // multiplicateur pour glisse plus fluide
      el.scrollLeft = startScroll - walk
    }

    el.addEventListener('mousedown', onMouseDown)
    el.addEventListener('mouseleave', onMouseLeave)
    el.addEventListener('mouseup', onMouseUp)
    el.addEventListener('mousemove', onMouseMove)
    el.style.cursor = 'grab'

    return () => {
      el.removeEventListener('mousedown', onMouseDown)
      el.removeEventListener('mouseleave', onMouseLeave)
      el.removeEventListener('mouseup', onMouseUp)
      el.removeEventListener('mousemove', onMouseMove)
    }
  }, [showTip]) // re-attache si le carrousel apparait/disparait

  const [, setTick] = useState(0)

  // Dedup anti "deuxième vague" : voir Maker/Home pour le détail. Absorbe le
  // fetch au mount + le bump authTick + focus/visibility + rafales realtime.
  const inFlightRef = useRef(false)
  const lastFetchTsRef = useRef(0)

  const refetchWishes = useCallback((force = false) => {
    if (inFlightRef.current) return
    if (!force && Date.now() - lastFetchTsRef.current < 1500) return
    inFlightRef.current = true
    getMyWishes()
      .then((w) => {
        setWishes(w)
        // Évite d'écraser un cache existant avec une liste vide (race condition
        // au mount : session pas encore prête → RLS renvoie []).
        const existing = getCached('my_wishes')?.value
        if (w.length > 0 || !existing || existing.length === 0) {
          setCached('my_wishes', w)
        }
        setLoading(false)
      })
      .catch((err) => {
        console.error('[WisherHome] getMyWishes:', err)
        setLoading(false)
        // Pas de toast si on a déjà un cache (UX silencieuse)
        if (!getCached('my_wishes')) toast.error('Erreur de chargement')
      })
      .finally(() => {
        inFlightRef.current = false
        lastFetchTsRef.current = Date.now()
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    refetchWishes()
    if (user?.id) {
      supabase.from('users').select('*').eq('id', user.id).single()
        .then(({ data }) => { if (data) useAuthStore.getState().setProfile(data) })
    }
  }, [authTick, refetchWishes])

  // Refetch au retour au premier plan (visibilitychange seul ; 'focus' faisait doublon).
  useEffect(() => {
    function onVisibility() {
      if (document.visibilityState === 'visible') refetchWishes()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [refetchWishes])

  // Realtime : changements sur ses wishes (statut, expiration, urgent…) → refetch silencieux
  useEffect(() => {
    if (!user?.id) return
    const channel = supabase
      .channel(`wisher-wishes-${user.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'wishes', filter: `wisher_id=eq.${user.id}` },
        () => { refetchWishes() }
      )
      .subscribe((status) => {
        if (import.meta.env.DEV) console.log('[WisherHome realtime]', status)
      })
    return () => { supabase.removeChannel(channel) }
  }, [user?.id, refetchWishes])

  // Polling 30s supprimé (comme sur Maker/Home) : le Realtime + le refetch
  // on-visibility suffisent ; ça evitait un re-render lourd toutes les 30s.

  // Rafraîchir le compte à rebours toutes les minutes
  useEffect(() => {
    const interval = setInterval(() => setTick((t) => t + 1), 60000)
    return () => clearInterval(interval)
  }, [])

  if (!user) {
    return (
      <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-4 border-[#5B6BF5] border-t-transparent animate-spin" />
      </div>
    )
  }

  // Déterminer le tab effectif d'un vœu (prend en compte l'expiration côté frontend)
  function getEffectiveTab(w) {
    // Si expires_at est dépassé et statut encore en_attente → considérer comme expiré
    if ((w.statut === 'en_attente' || w.statut === 'en_cours') && w.expires_at && new Date(w.expires_at) < Date.now()) {
      return 'expire'
    }
    return STATUS_MAP[w.statut] || 'en_attente'
  }

  const tabCounts = {
    en_attente: wishes.filter((w) => getEffectiveTab(w) === 'en_attente').length,
    realise: wishes.filter((w) => getEffectiveTab(w) === 'realise').length,
    expire: wishes.filter((w) => getEffectiveTab(w) === 'expire').length,
  }

  const filtered = wishes.filter((w) => getEffectiveTab(w) === activeTab)

  const hour = new Date().getHours()
  const greeting = hour < 12 ? t('wisher.home.bonjour') : hour < 18 ? t('wisher.home.bon_apres_midi') : t('wisher.home.bonsoir')

  // Tab labels traduits — recalculés à chaque render pour suivre i18n.language
  const TAB_LABELS_T = {
    en_attente: t('wisher.home.tab_en_attente'),
    realise: t('wisher.home.tab_realise'),
    expire: t('wisher.home.tab_expire'),
  }

  function handleExtend() {
    if (!modal?.wish) return
    // Ouvrir le paiement 0.99€ pour la prolongation
    setPaymentModal({ type: 'extension', wish_id: modal.wish.id, label: t('wisher.home.modal_prolonger_label') })
    setModal(null)
  }

  function handleMakeUrgent() {
    if (!modal?.wish) return
    // Ouvrir le paiement 0.99€ pour l'urgent
    setPaymentModal({ type: 'urgent_boost', wish_id: modal.wish.id, label: t('wisher.home.mettre_urgent') })
    setModal(null)
  }

  async function handlePaymentSuccess(paymentIntent) {
    try {
      await applyPurchase(paymentIntent.id)
      const action = paymentModal?.type === 'urgent_boost' ? 'Urgent activé' : 'Vœu prolongé'
      toast.success(`✅ ${action} !`)
      const updated = await getMyWishes()
      setWishes(updated)
      setPaymentModal(null)
    } catch (err) {
      toast.error(err.message || 'Erreur activation')
    }
  }

  function handlePaymentCancel() {
    setPaymentModal(null)
    toast('Paiement annulé', { icon: 'ℹ️' })
  }

  async function handleDelete() {
    if (!modal?.wish) return
    setActionLoading(true)
    try {
      await deleteWish(modal.wish.id)
      toast.success('Vœu supprimé')
      setWishes((prev) => prev.filter((w) => w.id !== modal.wish.id))
      setModal(null)
    } catch (err) {
      toast.error(err.message || 'Erreur')
    } finally { setActionLoading(false) }
  }

  return (
    <div className="h-screen bg-[#FAFAFA] flex flex-col overflow-hidden">

      {/* Header — sticky en haut, separe du contenu scrollable par une fine border */}
      <div className="px-5 pt-4 pb-4 flex items-center justify-between border-b border-[#EEEEF2] flex-shrink-0">
        <div className="flex items-center gap-3">
          <div onClick={() => navigate('/profile')} className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0 border border-[#E8E8E8] cursor-pointer">
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
            <p className="text-[13px] text-[#8A8A9A]">{greeting}</p>
            <p className="text-[16px] font-bold text-[#1A1A2E]">{user.prenom} {user.nom}</p>
          </div>
        </div>
        {/* Compteur quota mini */}
        {(() => {
          const freeRemaining = Math.max(0, 3 - (user.monthly_free_used || 0))
          const packSlots = user.pack_slots || 0
          const totalRemaining = freeRemaining + packSlots
          if (totalRemaining === 0) {
            return (
              <button
                onClick={() => setShowPackModal(true)}
                className="flex items-center gap-2 active:scale-95 transition-transform"
              >
                <span className="text-[11px] font-bold text-[#EF4444]">{t('wisher.home.quota_zero')}</span>
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)', boxShadow: '0 2px 6px rgba(91,107,245,0.3)' }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              </button>
            )
          }
          {
            const totalCapacity = 3 + packSlots
            const used = totalCapacity - totalRemaining
            const pct = Math.max(0, Math.min(100, (used / totalCapacity) * 100))
            return (
              <button
                onClick={() => setShowPackModal(true)}
                className="flex flex-col items-end gap-1 active:scale-95 transition-transform"
              >
                <span className="text-[11px] font-semibold flex items-center gap-1">
                  <span className="text-[#8A8A9A] font-medium">{t('wisher.home.quota_label')}</span>
                  <span className="text-[#5B6BF5]">{used}/{totalCapacity}</span>
                </span>
                <div className="w-20 h-1.5 rounded-full bg-[#EEF0FF] overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${pct}%`,
                      background: 'linear-gradient(90deg,#5B6BF5,#9B59F5)',
                    }}
                  />
                </div>
              </button>
            )
          }
        })()}
      </div>

      {/* Contenu scrollable */}
      <div className="flex-1 overflow-y-auto pb-28">

        {/* CTA principal — Faire un vœu */}
        <div className="px-5 mb-5">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              const freeRemaining = Math.max(0, 3 - (user.monthly_free_used || 0))
              const totalRemaining = freeRemaining + (user.pack_slots || 0)
              if (totalRemaining <= 0) {
                setShowPackModal(true)
              } else {
                navigate('/wisher/create')
              }
            }}
            className="w-full rounded-[20px] p-5 text-left relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg,#5B6BF5 0%,#9B59F5 100%)' }}
          >
            <div className="absolute -top-6 -right-6 w-28 h-28 rounded-full bg-white/10" />
            <div className="absolute -bottom-4 -right-10 w-20 h-20 rounded-full bg-white/5" />
            <img
              src={lampeGenieIcon}
              alt=""
              className="absolute -right-2 -bottom-1 w-32 h-32 opacity-25 pointer-events-none object-contain"
            />
            <div className="relative z-10 max-w-[65%]">
              <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center mb-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                  <path d="M12 5v14M5 12h14" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                </svg>
              </div>
              <h3 className="text-white font-bold text-lg mb-1">{t('wisher.home.faire_voeu')}</h3>
              <p className="text-white/70 text-sm">{t('wisher.home.make_wish_sub')}</p>
            </div>
          </motion.button>
        </div>

        {/* Astuce — bannière dismissible. Quand fermée, on affiche un carrousel d'exemples de vœux. */}
        {showTip ? (
          <div className="px-5 mb-5">
            <div className="rounded-2xl bg-white border border-[#F0F0F0] p-4 flex items-start gap-3 relative">
              <button onClick={() => { setShowTip(false); localStorage.setItem('wishmaker-tip-dismissed', 'true') }}
                className="absolute top-2 right-2 w-6 h-6 rounded-full bg-[#F0F0F0] flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#8A8A9A" strokeWidth="3" strokeLinecap="round">
                  <path d="M18 6L6 18M6 6l12 12"/>
                </svg>
              </button>
              <div className="w-10 h-10 rounded-xl bg-[#FFF4E0] flex items-center justify-center flex-shrink-0">
                <span className="text-lg">💡</span>
              </div>
              <div className="pr-6">
                <p className="text-sm font-bold text-[#1A1A2E] mb-0.5">{t('wisher.home.astuce_titre')}</p>
                <p className="text-xs text-[#8A8A9A] leading-relaxed">
                  {t('wisher.home.astuce_text')}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="mb-5">
            <p className="px-5 text-xs font-semibold text-[#8A8A9A] uppercase tracking-wide mb-2">
              {t('wisher.home.exemples_titre')}
            </p>
            {/* Carrousel "aimante" facon Airbnb :
                - snap-x + snap-mandatory + scroll-snap-stop:always → on ne peut pas
                  s'arreter entre deux cards, le navigateur cale toujours sur la
                  prochaine
                - scroll-padding-inline:20px → le point de snap coincide avec le
                  bord de la card (sinon le padding px-5 du conteneur decalerait
                  les cards et on en verrait toujours une moitie) */}
            <div
              ref={examplesRef}
              className="flex gap-3 overflow-x-auto px-5 pb-2 snap-x snap-mandatory scrollbar-hide"
              style={{ scrollPaddingLeft: '20px', scrollPaddingRight: '20px' }}
            >
              {(() => {
                // Recupere les textes traduits depuis i18n (fallback array vide)
                const texts = t('wisher.home.exemples', { returnObjects: true })
                const exemples = Array.isArray(texts) ? texts : []
                return exemples.map((text, i) => {
                  const slug = WISH_EXAMPLE_SLUGS[i] || 'autre'
                  const Icon = CATEGORY_ICONS[slug]
                  const theme = CATEGORY_COLORS[slug]
                  return (
                    <div
                      key={i}
                      className="flex-shrink-0 w-[260px] rounded-2xl bg-white border border-[#F0F0F0] p-3 flex items-center gap-3 snap-start"
                      style={{ scrollSnapStop: 'always' }}
                    >
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-white"
                        style={{ background: theme?.grad }}
                      >
                        {Icon && <Icon size={20} stroke={2.2} />}
                      </div>
                      <p className="text-xs text-[#1A1A2E] leading-snug line-clamp-3">
                        « {text} »
                      </p>
                    </div>
                  )
                })
              })()}
            </div>
          </div>
        )}

        {/* Section Mes vœux */}
        <div className="px-5">
          <h2 className="font-bold text-[#1A1A2E] text-base mb-3">{t('wisher.home.section_mes_voeux')}</h2>

          {/* Onglets */}
          <div className="flex bg-[#F5F5F7] rounded-full p-1 mb-4">
            {TABS.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 py-2.5 rounded-full text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
                style={activeTab === tab
                  ? { background: 'white', color: '#5B6BF5', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }
                  : { color: '#8A8A9A' }
                }
              >
                {TAB_LABELS_T[tab]}
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px]"
                  style={activeTab === tab
                    ? { background: '#EEF0FF', color: '#5B6BF5' }
                    : { background: '#E8E8E8', color: '#8A8A9A' }
                  }>
                  {tabCounts[tab]}
                </span>
              </button>
            ))}
          </div>

          {/* Liste des vœux filtrés */}
          <div className="flex flex-col gap-3">
            <AnimatePresence mode="popLayout">
              {loading ? (
                <div className="flex items-center justify-center py-10">
                  <div className="w-6 h-6 rounded-full border-3 border-[#5B6BF5] border-t-transparent animate-spin" />
                </div>
              ) : filtered.length > 0 ? (
                filtered.map((wish) => (
                  <WishCard
                    key={wish.id}
                    wish={wish}
                    onExtend={(w) => setModal({ type: 'extend', wish: w })}
                    onMakeUrgent={(w) => setModal({ type: 'urgent', wish: w })}
                    onDelete={(w) => setModal({ type: 'delete', wish: w })}
                    onConfirmRealization={async (w) => {
                      try {
                        await confirmRealization(w.id)
                        toast.success('Vœu confirmé comme réalisé ! 🎉')
                        const updated = await getMyWishes()
                        setWishes(updated)
                        setCached('my_wishes', updated)
                      } catch (err) {
                        toast.error(err.message || 'Erreur')
                      }
                    }}
                  />
                ))
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-16 gap-3"
                >
                  <div className="w-16 h-16 rounded-full bg-[#EEF0FF] flex items-center justify-center">
                    <span className="text-3xl">
                      {activeTab === 'en_attente' ? '✨' : activeTab === 'realise' ? '🎉' : '📭'}
                    </span>
                  </div>
                  <p className="text-[#1A1A2E] font-bold text-sm">Aucun vœu ici pour le moment</p>
                  <p className="text-[#8A8A9A] text-xs text-center max-w-[220px]">
                    {activeTab === 'en_attente'
                      ? 'Crée ton premier vœu et laisse la magie opérer !'
                      : activeTab === 'realise'
                        ? 'Tes vœux réalisés apparaîtront ici.'
                        : 'Tes vœux annulés apparaîtront ici.'}
                  </p>
                  {activeTab === 'en_attente' && (
                    <button
                      onClick={() => navigate('/wisher/create')}
                      className="mt-1 px-6 h-10 rounded-full text-sm font-semibold text-white"
                      style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
                    >
                      Créer un vœu
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

      </div>

      {/* Modals */}
      <AnimatePresence>
        {modal?.type === 'extend' && (
          <ConfirmModal
            open
            onClose={() => setModal(null)}
            title={t('wisher.home.modal_prolonger_titre')}
            description={t('wisher.home.modal_prolonger_desc', { h: wishDurationHours })}
            price="0,99€"
            buttonLabel={t('wisher.home.modal_prolonger_btn')}
            onConfirm={handleExtend}
            loading={actionLoading}
          />
        )}
        {modal?.type === 'urgent' && (
          <ConfirmModal
            open
            onClose={() => setModal(null)}
            title={t('wisher.home.modal_urgent_titre')}
            description={t('wisher.home.modal_urgent_desc')}
            price="1,99€"
            buttonLabel={t('wisher.home.modal_urgent_btn')}
            onConfirm={handleMakeUrgent}
            loading={actionLoading}
          />
        )}
        {modal?.type === 'delete' && (
          <ConfirmModal
            open
            onClose={() => setModal(null)}
            title={t('wisher.home.modal_delete_titre')}
            description={t('wisher.home.modal_delete_desc')}
            price=""
            buttonLabel={t('wisher.home.modal_delete_btn')}
            onConfirm={handleDelete}
            loading={actionLoading}
            danger
          />
        )}
      </AnimatePresence>

      <WishPackModal
        open={showPackModal}
        onClose={() => setShowPackModal(false)}
        // Apres un achat de pack, on NE force PAS la navigation vers /wisher/create.
        // L'user reste sur sa page actuelle, libre de choisir quand creer son voeu.
        onSuccess={() => setShowPackModal(false)}
      />

      {/* Modal paiement Stripe (Urgent 0.99€ / Prolongation 0.99€) */}
      <BottomSheet open={!!paymentModal} onClose={handlePaymentCancel} maxHeight="90vh">
        {paymentModal && (
          <>
            <div className="text-center mb-5">
              <span className="text-3xl mb-2 block">
                {paymentModal.type === 'urgent_boost' ? '⚡' : '⏱️'}
              </span>
              <h2 className="text-lg font-bold text-[#1A1A2E]">{paymentModal.label}</h2>
              <p className="text-sm text-[#8A8A9A] mt-1">
                {paymentModal.type === 'urgent_boost'
                  ? 'Votre vœu sera mis en avant pendant 24h'
                  : 'Votre vœu sera prolongé de 48h supplémentaires'}
              </p>
            </div>
            <PaymentForm
              type={paymentModal.type}
              wish_id={paymentModal.wish_id}
              onSuccess={handlePaymentSuccess}
              onCancel={handlePaymentCancel}
              submitLabel={paymentModal.type === 'urgent_boost' ? 'Payer 1,99€' : 'Payer 0,99€'}
            />
          </>
        )}
      </BottomSheet>

      <BottomTabBar />
    </div>
  )
}
