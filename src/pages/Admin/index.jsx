import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import toast from 'react-hot-toast'
import { supabase, withTimeout, ensureFreshSession } from '../../lib/supabase'
import useAuthStore from '../../store/authStore'
import Header from '../../components/layout/Header'
import ConfirmSheet from '../../components/ui/ConfirmSheet'
import SanctionSheet from '../../components/ui/SanctionSheet'
import TagsAdminTab from './TagsAdminTab'

const CATEGORIES = [
  { value: 'all', label: 'Tous' },
  { value: 'grossierete', label: 'Grossièretés' },
  { value: 'drogue', label: 'Drogues' },
  { value: 'violence', label: 'Violence' },
  { value: 'illicite', label: 'Illicite' },
  { value: 'autre', label: 'Autre' },
]

// ── Onglet 1 : Mots interdits ──
function MotsInterditsTab() {
  const [words, setWords] = useState([])
  const [filter, setFilter] = useState('all')
  const [newMot, setNewMot] = useState('')
  const [newCat, setNewCat] = useState('grossierete')
  const [loading, setLoading] = useState(true)

  async function loadWords() {
    const { data } = await supabase
      .from('forbidden_words')
      .select('*')
      .order('categorie')
      .order('mot')
    setWords(data || [])
    setLoading(false)
  }

  useEffect(() => { loadWords() }, [])

  async function handleAdd() {
    if (!newMot.trim()) return
    const { error } = await supabase.from('forbidden_words').insert({ mot: newMot.trim().toLowerCase(), categorie: newCat })
    if (error) {
      toast.error(error.message.includes('duplicate') ? 'Ce mot existe déjà.' : error.message)
      return
    }
    toast.success(`"${newMot}" ajouté !`)
    setNewMot('')
    loadWords()
  }

  async function handleDelete(id, mot) {
    const { error } = await supabase.from('forbidden_words').delete().eq('id', id)
    if (error) { toast.error(error.message); return }
    toast.success(`"${mot}" supprimé`)
    loadWords()
  }

  const filtered = filter === 'all' ? words : words.filter(w => w.categorie === filter)

  const catColors = {
    grossierete: { bg: '#FFE4E4', text: '#EF4444' },
    drogue: { bg: '#FFF3DC', text: '#F59E0B' },
    violence: { bg: '#FFE4E4', text: '#DC2626' },
    illicite: { bg: '#E6F1FB', text: '#0C447C' },
    autre: { bg: '#F0F0F5', text: '#8A8A9A' },
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Filtres catégorie */}
      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
        {CATEGORIES.map(c => (
          <button
            key={c.value}
            onClick={() => setFilter(c.value)}
            className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex-shrink-0"
            style={filter === c.value
              ? { background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)', color: '#fff' }
              : { background: '#F5F5F7', color: '#8A8A9A' }
            }
          >
            {c.label}
          </button>
        ))}
      </div>

      {/* Compteur */}
      <p className="text-xs text-[#8A8A9A]">{filtered.length} mot{filtered.length > 1 ? 's' : ''}</p>

      {/* Liste */}
      <div className="flex flex-col gap-2 max-h-[40vh] overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-8">
            <div className="w-6 h-6 rounded-full border-3 border-[#5B6BF5] border-t-transparent animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-[#8A8A9A] text-center py-4">Aucun mot dans cette catégorie</p>
        ) : (
          filtered.map(w => {
            const colors = catColors[w.categorie] || catColors.autre
            return (
              <div key={w.id} className="flex items-center justify-between bg-white border border-[#F0F0F0] rounded-[14px] px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-sm text-[#1A1A2E]">{w.mot}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: colors.bg, color: colors.text }}>
                    {w.categorie}
                  </span>
                </div>
                <button onClick={() => handleDelete(w.id, w.mot)} className="text-[#EF4444] text-xs font-semibold">
                  Supprimer
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* Formulaire ajout */}
      <div className="bg-[#F5F5F7] rounded-[20px] p-4 flex flex-col gap-3 mt-2">
        <p className="text-sm font-bold text-[#1A1A2E]">Ajouter un mot</p>
        <input
          value={newMot}
          onChange={e => setNewMot(e.target.value)}
          placeholder="Nouveau mot interdit..."
          className="h-12 bg-white rounded-[14px] px-4 text-sm text-[#1A1A2E] outline-none border border-[#E8E8E8] focus:border-[#5B6BF5]"
        />
        <select
          value={newCat}
          onChange={e => setNewCat(e.target.value)}
          className="h-12 bg-white rounded-[14px] px-4 text-sm text-[#1A1A2E] outline-none border border-[#E8E8E8] focus:border-[#5B6BF5]"
        >
          {CATEGORIES.filter(c => c.value !== 'all').map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <button
          onClick={handleAdd}
          disabled={!newMot.trim()}
          className="h-12 rounded-full text-white font-bold text-sm disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
        >
          Ajouter
        </button>
      </div>
    </div>
  )
}

// ── Onglet 2 : Utilisateurs suspendus ──
function UtilisateursTab() {
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState({ temp: 0, def: 0, reports: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [confirm, setConfirm] = useState(null) // { title, message, confirmLabel, destructive, run }
  const [confirmBusy, setConfirmBusy] = useState(false)
  const authTick = useAuthStore((s) => s.authTick)

  // Retourne true si chargé, false sinon (l'effet planifie alors un retry).
  async function loadData() {
    setError(false)
    try {
      // Session OBLIGATOIRE (ensureFreshSession, pas le best-effort
      // ensureSession) : au réveil PWA, la requête partait en ANONYME → la RLS
      // renvoyait vide / la garde admin rejetait → page admin « morte ».
      const session = await ensureFreshSession()
      if (!session) throw new Error('NO_SESSION')
      // withTimeout : sans ça, une requête qui hang (réveil PWA / connexion
      // morte) laissait setLoading(false) inatteignable → SPINNER INFINI.
      const { data: suspended, error: e1 } = await withTimeout(
        supabase.from('users').select('*').eq('is_suspended', true)
      )
      if (e1) throw e1
      setUsers(suspended || [])

      const temp = (suspended || []).filter(u => u.suspension_type === 'temporaire').length
      const def = (suspended || []).filter(u => u.suspension_type === 'definitive').length

      const { count: reportsCount, error: e2 } = await withTimeout(
        supabase.from('reports').select('*', { count: 'exact', head: true }).eq('statut', 'en_attente')
      )
      if (e2) throw e2
      setStats({ temp, def, reports: reportsCount || 0 })
      setLoading(false)
      return true
    } catch (err) {
      console.warn('[admin users] load error:', err?.message)
      // NO_SESSION (session pas prête au réveil) → on GARDE le spinner, le
      // retry planifié / authTick relancera. Vraie erreur → écran d'erreur.
      if (err?.message !== 'NO_SESSION') {
        setError(true)
        setLoading(false)
      }
      return false
    }
  }

  useEffect(() => {
    let cancelled = false
    let timer = null
    let attempt = 0
    function tryLoad() {
      loadData().then((ok) => {
        if (cancelled || ok) return
        // Retry borné (2s/5s/15s, app visible uniquement) : au réveil PWA,
        // l'échec arrive pendant que session/connexion se rétablissent.
        if (attempt < 3) {
          const delay = [2000, 5000, 15000][attempt]
          attempt += 1
          timer = setTimeout(() => {
            timer = null
            if (!cancelled && document.visibilityState === 'visible') tryLoad()
          }, delay)
        } else {
          // Après 3 échecs : on sort du spinner sur l'écran d'erreur.
          setError(true)
          setLoading(false)
        }
      })
    }
    tryLoad()
    return () => { cancelled = true; if (timer) clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authTick])

  async function liftSuspension(userId) {
    // RPC admin (la RLS users est verrouillée au propriétaire → update direct
    // échouait silencieusement). La fonction vérifie is_admin côté serveur.
    const { error } = await supabase.rpc('admin_lift_suspension', { p_user_id: userId })
    if (error) { toast.error(error.message); return }
    toast.success('Suspension levée')
    loadData()
  }

  async function makeDefinitive(userId) {
    const { error } = await supabase.rpc('admin_make_suspension_definitive', { p_user_id: userId })
    if (error) { toast.error(error.message); return }
    toast.success('Suspension rendue définitive')
    loadData()
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 rounded-full border-4 border-[#5B6BF5] border-t-transparent animate-spin" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <p className="text-sm font-bold text-[#1A1A2E]">Erreur de chargement</p>
        <p className="text-xs text-[#8A8A9A]">Vérifie ta connexion et réessaie.</p>
        <button
          onClick={() => {
            setLoading(true)
            // Échec du retry manuel (même NO_SESSION) → retour à l'écran
            // d'erreur, pas de spinner infini.
            loadData().then((ok) => { if (!ok) { setError(true); setLoading(false) } })
          }}
          className="mt-2 h-10 px-5 rounded-full text-white font-bold text-xs"
          style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
        >
          Réessayer
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Dashboard */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-[#FFF3DC] rounded-[14px] p-3 text-center">
          <p className="text-2xl font-bold text-[#F59E0B]">{stats.temp}</p>
          <p className="text-[10px] text-[#F59E0B] font-medium mt-1">Temporaires</p>
        </div>
        <div className="bg-[#FFE4E4] rounded-[14px] p-3 text-center">
          <p className="text-2xl font-bold text-[#EF4444]">{stats.def}</p>
          <p className="text-[10px] text-[#EF4444] font-medium mt-1">Définitifs</p>
        </div>
        <div className="bg-[#E6F1FB] rounded-[14px] p-3 text-center">
          <p className="text-2xl font-bold text-[#0C447C]">{stats.reports}</p>
          <p className="text-[10px] text-[#0C447C] font-medium mt-1">Signalements</p>
        </div>
      </div>

      {/* Liste */}
      {users.length === 0 ? (
        <p className="text-sm text-[#8A8A9A] text-center py-8">Aucun utilisateur suspendu</p>
      ) : (
        users.map(u => (
          <div key={u.id} className="bg-white border border-[#F0F0F0] rounded-[20px] p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-[#1A1A2E] text-sm">@{u.pseudo || `user_${u.id.slice(0,4)}`}</p>
                <p className="text-[11px] text-[#8A8A9A]">{u.email}</p>
              </div>
              <span
                className="text-[10px] font-bold px-2.5 py-1 rounded-full"
                style={u.suspension_type === 'definitive'
                  ? { background: '#FFE4E4', color: '#EF4444' }
                  : { background: '#FFF3DC', color: '#F59E0B' }
                }
              >
                {u.suspension_type === 'definitive' ? 'Définitif' : 'Temporaire'}
              </span>
            </div>

            {u.suspension_type === 'temporaire' && u.suspended_until && (
              <p className="text-xs text-[#8A8A9A]">
                Fin : {new Date(u.suspended_until).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}

            <p className="text-xs text-[#8A8A9A]">
              Suspensions antérieures : {u.suspension_count || 0}
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setConfirm({
                  title: 'Lever la suspension ?',
                  message: `@${u.pseudo || 'cet utilisateur'} pourra de nouveau utiliser l'application.`,
                  confirmLabel: 'Lever la suspension',
                  destructive: false,
                  run: () => liftSuspension(u.id),
                })}
                className="flex-1 h-10 rounded-full text-xs font-semibold bg-[#F5F5F7] text-[#1A1A2E] active:scale-[0.98] transition-transform"
              >
                Lever la suspension
              </button>
              {u.suspension_type !== 'definitive' && (
                <button
                  onClick={() => setConfirm({
                    title: 'Suspension définitive ?',
                    message: `@${u.pseudo || 'cet utilisateur'} sera banni définitivement de l'application. Action lourde, à confirmer.`,
                    confirmLabel: 'Rendre définitive',
                    destructive: true,
                    run: () => makeDefinitive(u.id),
                  })}
                  className="flex-1 h-10 rounded-full text-xs font-semibold bg-[#FEF2F2] text-[#EF4444] active:scale-[0.98] transition-transform"
                >
                  Rendre définitive
                </button>
              )}
            </div>
          </div>
        ))
      )}

      <ConfirmSheet
        open={!!confirm}
        onClose={() => { if (!confirmBusy) setConfirm(null) }}
        title={confirm?.title}
        message={confirm?.message}
        confirmLabel={confirm?.confirmLabel}
        destructive={confirm?.destructive}
        loading={confirmBusy}
        onConfirm={async () => {
          setConfirmBusy(true)
          try { await confirm?.run?.() } finally { setConfirmBusy(false); setConfirm(null) }
        }}
      />
    </div>
  )
}

// Avatar (anneau gradient + photo ou initiales) — style page Avis
function ReportAvatar({ user, size = 44 }) {
  const grad = 'linear-gradient(135deg,#5B6BF5,#9B59F5)'
  return (
    <div className="rounded-full flex-shrink-0 p-[2px]" style={{ width: size, height: size, background: grad }}>
      <div className="w-full h-full rounded-full overflow-hidden bg-white">
        {user?.avatar_url ? (
          <img src={user.avatar_url} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center font-bold text-white text-xs" style={{ background: grad }}>
            {(user?.prenom?.[0] || '') + (user?.nom?.[0] || '') || '?'}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Onglet 3 : Signalements (file de modération) ──
function SignalementsTab() {
  const navigate = useNavigate()
  const authTick = useAuthStore((s) => s.authTick)
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [acting, setActing] = useState(null) // id du signalement en cours d'action
  const [openConv, setOpenConv] = useState(null) // id du report dont on affiche l'échange
  const [convMsgs, setConvMsgs] = useState([])
  const [convLoading, setConvLoading] = useState(false)
  const [sanctionFor, setSanctionFor] = useState(null) // signalement dont on choisit la sanction (étape 2)

  // Retourne true si chargé, false sinon (l'effet planifie alors un retry).
  async function loadReports() {
    setError(false)
    try {
      // Session OBLIGATOIRE : en anonyme la RLS renvoyait vide au réveil PWA.
      const session = await ensureFreshSession()
      if (!session) throw new Error('NO_SESSION')
      const { data, error: e } = await withTimeout(supabase
        .from('reports')
        .select(`id, type, raison, created_at, reported_wish_id, reported_user_id, reported_conversation_id,
          reporter:users!reports_reporter_id_fkey(pseudo, prenom),
          reported_user:users!reports_reported_user_id_fkey(id, pseudo, prenom, nom, avatar_url, is_suspended),
          reported_wish:wishes!reports_reported_wish_id_fkey(id, titre)`)
        .eq('statut', 'en_attente')
        .order('created_at', { ascending: false }))
      if (e) throw e
      setReports(data || [])
      setLoading(false)
      return true
    } catch (err) {
      console.warn('[admin reports] load error:', err?.message)
      // NO_SESSION → spinner conservé (retry planifié) ; vraie erreur → écran d'erreur.
      if (err?.message !== 'NO_SESSION') {
        setError(true)
        setLoading(false)
      }
      return false
    }
  }

  useEffect(() => {
    let cancelled = false
    let timer = null
    let attempt = 0
    function tryLoad() {
      loadReports().then((ok) => {
        if (cancelled || ok) return
        // Retry borné (2s/5s/15s, app visible uniquement) — réveil PWA.
        if (attempt < 3) {
          const delay = [2000, 5000, 15000][attempt]
          attempt += 1
          timer = setTimeout(() => {
            timer = null
            if (!cancelled && document.visibilityState === 'visible') tryLoad()
          }, delay)
        } else {
          setError(true)
          setLoading(false)
        }
      })
    }
    tryLoad()
    return () => { cancelled = true; if (timer) clearTimeout(timer) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authTick])

  // Marque un signalement traité / rejeté (la policy reports_update_admin autorise l'admin)
  async function setStatut(reportId, statut, msg) {
    setActing(reportId)
    const { error: e } = await supabase.from('reports').update({ statut }).eq('id', reportId)
    setActing(null)
    if (e) { toast.error(e.message); return }
    toast.success(msg)
    setReports((prev) => prev.filter((r) => r.id !== reportId))
  }

  // Étape 2 : applique la sanction choisie puis classe le signalement « traité ».
  // En cas d'échec on throw → la feuille reste ouverte pour réessayer.
  const SANCTION_TOAST = {
    none: 'Signalement validé',
    warn: 'Avertissement envoyé',
    suspend7: 'Auteur suspendu 7 jours',
    suspendDef: 'Auteur suspendu définitivement',
    deleteWish: 'Vœu supprimé',
  }
  async function applySanction(r, kind) {
    if (!r) return
    try {
      if (kind === 'warn') {
        const { error } = await supabase.functions.invoke('send-push-notification', {
          body: {
            user_id: r.reported_user_id,
            title: 'Avertissement — Wish Maker',
            body: 'Votre contenu a été signalé. Merci de respecter les règles de la communauté.',
            url: '/',
          },
        })
        if (error) throw error
      } else if (kind === 'suspend7') {
        const { error } = await supabase.rpc('admin_suspend_user', { p_user_id: r.reported_user_id, p_type: 'temporaire', p_days: 7 })
        if (error) throw error
      } else if (kind === 'suspendDef') {
        const { error } = await supabase.rpc('admin_suspend_user', { p_user_id: r.reported_user_id, p_type: 'definitive' })
        if (error) throw error
      } else if (kind === 'deleteWish') {
        const { error } = await supabase.rpc('admin_delete_wish', { p_wish_id: r.reported_wish_id })
        if (error) throw error
      }
      const { error: e2 } = await supabase.from('reports').update({ statut: 'traite' }).eq('id', r.id)
      if (e2) throw e2
      toast.success(SANCTION_TOAST[kind] || 'Signalement traité')
      setReports((prev) => prev.filter((x) => x.id !== r.id))
      setSanctionFor(null)
    } catch (e) {
      toast.error(e?.message || 'Action impossible')
      throw e
    }
  }

  // Affiche l'échange d'un signalement de conversation (policy admins_read_all_messages)
  async function viewConversation(r) {
    if (openConv === r.id) { setOpenConv(null); return }
    setOpenConv(r.id)
    setConvMsgs([])
    if (!r.reported_conversation_id) return
    setConvLoading(true)
    try {
      const { data } = await withTimeout(supabase
        .from('messages')
        .select('id, contenu, sender_id, created_at')
        .eq('conversation_id', r.reported_conversation_id)
        .order('created_at', { ascending: true })
        .limit(60))
      setConvMsgs(data || [])
    } catch {
      toast.error('Impossible de charger la conversation')
    } finally {
      setConvLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="w-8 h-8 rounded-full border-4 border-[#5B6BF5] border-t-transparent animate-spin" />
      </div>
    )
  }
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
        <p className="text-sm font-bold text-[#1A1A2E]">Erreur de chargement</p>
        <button
          onClick={() => {
            setLoading(true)
            loadReports().then((ok) => { if (!ok) { setError(true); setLoading(false) } })
          }}
          className="mt-1 h-10 px-5 rounded-full text-white font-bold text-xs"
          style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
        >Réessayer</button>
      </div>
    )
  }

  if (reports.length === 0) {
    return <p className="text-sm text-[#8A8A9A] text-center py-10">Aucun signalement en attente</p>
  }

  return (
    <div className="flex flex-col">
      {reports.map((r) => {
        const busy = acting === r.id
        return (
          <div key={r.id} className="py-4 border-b last:border-b-0 border-[#F0F0F2] flex flex-col gap-3">
            {/* Auteur signalé : avatar + pseudo + type + date */}
            <div className="flex items-center gap-3">
              <ReportAvatar user={r.reported_user} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-[15px] font-semibold text-[#1A1A2E] truncate tracking-[-0.01em]">
                    @{r.reported_user?.pseudo || r.reported_user?.prenom || '?'}
                  </p>
                  {r.reported_user?.is_suspended && (
                    <span className="text-[9px] font-bold text-[#EF4444] bg-[#FEF2F2] px-2 py-0.5 rounded-full flex-shrink-0">suspendu</span>
                  )}
                </div>
                <p className="text-[11.5px] text-[#8A8A9A] mt-0.5">
                  {r.type === 'voeu' ? 'Vœu signalé' : r.type === 'conversation' ? 'Conversation signalée' : 'Profil signalé'}
                  {' · '}{new Date(r.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                </p>
              </div>
            </div>

            {/* Motif + qui a signalé (texte simple, façon page Avis) */}
            <div>
              <p className="text-[13.5px] text-[#1A1A2E] leading-snug">
                <span className="text-[#8A8A9A]">Motif : </span>{r.raison}
              </p>
              {r.reported_wish?.titre && (
                <p className="text-[11.5px] text-[#8A8A9A] mt-1 truncate">Vœu : « {r.reported_wish.titre} »</p>
              )}
              <p className="text-[11px] text-[#B0B0B0] mt-1.5">
                Signalé par @{r.reporter?.pseudo || r.reporter?.prenom || '?'}
              </p>
            </div>

            {/* Décision : valider (signalement fondé) ou rejeter */}
            <div className="flex gap-2 pt-1">
              <button
                disabled={busy}
                onClick={() => setSanctionFor(r)}
                className="flex-1 h-10 rounded-full text-xs font-bold text-white disabled:opacity-40 active:scale-[0.98] transition-transform"
                style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
              >
                Valider le signalement
              </button>
              <button
                disabled={busy}
                onClick={() => setStatut(r.id, 'rejete', 'Signalement rejeté')}
                className="flex-1 h-10 rounded-full text-xs font-semibold bg-[#F5F5F7] text-[#8A8A9A] disabled:opacity-40 active:scale-[0.98] transition-transform"
              >
                Rejeter
              </button>
            </div>

            {/* Action secondaire : inspecter le contenu signalé. Les sanctions
                se choisissent après « Valider le signalement » (SanctionSheet). */}
            <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5 px-1">
              <button
                disabled={busy}
                onClick={() => {
                  if (r.type === 'voeu' && r.reported_wish_id) navigate(`/maker/wish/${r.reported_wish_id}`)
                  else if (r.type === 'conversation') viewConversation(r)
                  else if (r.reported_user_id) navigate(`/maker/user/${r.reported_user_id}`)
                }}
                className="text-xs font-semibold text-[#5B6BF5] disabled:opacity-40"
              >
                {r.type === 'conversation'
                  ? (openConv === r.id ? "Masquer l'échange" : "Voir l'échange")
                  : r.type === 'voeu' ? 'Voir le vœu' : 'Voir le profil'}
              </button>
            </div>

            {/* Échange (signalement de conversation) — messages de l'auteur signalé à gauche */}
            {openConv === r.id && (
              <div className="rounded-2xl bg-[#F7F8FC] border border-[#EEEEF2] p-3 max-h-64 overflow-y-auto flex flex-col gap-1.5">
                {convLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="w-5 h-5 rounded-full border-2 border-[#5B6BF5] border-t-transparent animate-spin" />
                  </div>
                ) : convMsgs.length === 0 ? (
                  <p className="text-xs text-[#8A8A9A] text-center py-2">Aucun message dans cette conversation.</p>
                ) : convMsgs.map((m) => (
                  <div key={m.id}
                    className={`max-w-[82%] px-3 py-2 rounded-2xl text-[13px] leading-snug ${m.sender_id === r.reported_user_id ? 'self-start bg-white border border-[#EEEEF2] text-[#1A1A2E]' : 'self-end bg-[#EEF0FF] text-[#1A1A2E]'}`}>
                    {m.contenu}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}

      <SanctionSheet
        open={!!sanctionFor}
        onClose={() => setSanctionFor(null)}
        report={sanctionFor}
        onApply={(kind) => applySanction(sanctionFor, kind)}
      />
    </div>
  )
}

// ── Page Admin ──
export default function Admin() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const profile = useAuthStore((s) => s.profile)
  const [tab, setTab] = useState('reports')

  // Protection admin (1re ligne côté client — la vraie sécurité est la RLS BDD)
  if (!user || !profile?.is_admin) {
    return (
      <div className="h-screen bg-white flex flex-col items-center justify-center gap-4 px-6">
        <p className="text-lg font-bold text-[#EF4444]">Accès refusé</p>
        <p className="text-sm text-[#8A8A9A] text-center">Cette page est réservée aux administrateurs.</p>
        <button onClick={() => navigate('/wisher')} className="h-12 px-8 rounded-full text-white font-bold text-sm" style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}>
          Retour
        </button>
      </div>
    )
  }

  return (
    <div className="h-screen bg-white flex flex-col">
      {/* Header partagé (titre centré + même espacement que la page Avis) */}
      <Header
        title="Administration"
        onBack={() => {
          if (window.history.length > 1) navigate(-1)
          else navigate('/profile')
        }}
      />

      {/* Onglets soulignés (épuré, comme la page Avis). Signalements en 1er. */}
      <div className="border-b border-[#F0F0F2] flex-shrink-0">
        <div className="flex">
          {[['reports', 'Signalements'], ['users', 'Utilisateurs'], ['tags', 'Mots clefs']].map(([val, label]) => {
            const active = tab === val
            return (
              <button key={val} onClick={() => setTab(val)} className="relative flex-1 pb-3 pt-2">
                <span className="text-[15px] font-bold tracking-[-0.005em]" style={{ color: active ? '#1A1A2E' : '#8A8A9A' }}>
                  {label}
                </span>
                {active && (
                  <motion.span
                    layoutId="admin-tab-underline"
                    className="absolute -bottom-px left-0 right-0 h-[2.5px] rounded-full"
                    style={{ background: 'linear-gradient(135deg,#5B6BF5,#9B59F5)' }}
                    transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                  />
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Contenu */}
      <div className="flex-1 overflow-y-auto px-5 py-4 pb-10">
        {tab === 'reports' ? <SignalementsTab /> : tab === 'users' ? <UtilisateursTab /> : <TagsAdminTab />}
      </div>
    </div>
  )
}
